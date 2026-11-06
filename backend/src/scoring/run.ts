import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { rider_scores_current, risk_events, shifts, trips, upload_batches, weekly_scores } from '../db/schema'
import { coverageAndConfidence, SCORING, subScores, weekOf, type Session } from './model'

export type WeekResult =
  | { status: 'scored'; riderId: string; weekStart: string; score: number; confidence: number; flags: string[] }
  | { status: 'insufficient'; riderId: string; weekStart: string; distanceKm: number }

// Scores one rider-week and saves it. Re-running replaces the previous result.
export async function scoreRiderWeek(riderId: string, at: number): Promise<WeekResult> {
  const week = weekOf(at)
  const from = new Date(week.from)
  const to = new Date(week.to)

  const tripRows = await db
    .select({ id: trips.id, distance_m: trips.distance_m, night_m: trips.night_m, blackspot_m: trips.blackspot_m })
    .from(trips)
    .where(and(eq(trips.rider_id, riderId), gte(trips.started_at, from), lt(trips.started_at, to)))
  const eventRows = await db
    .select({ trip_id: risk_events.trip_id, type: risk_events.type, severity: risk_events.severity })
    .from(risk_events)
    .where(and(eq(risk_events.rider_id, riderId), gte(risk_events.occurred_at, from), lt(risk_events.occurred_at, to)))

  const rides = tripRows.map((t) => ({ distanceM: t.distance_m, nightM: t.night_m, blackspotM: t.blackspot_m }))
  const week_ = subScores(rides, eventRows)

  // Each trip's own score, for trip lists and maps (noisier than the weekly score).
  // One UPDATE for all of the week's trips.
  if (tripRows.length > 0) {
    const values = tripRows.map((t) => {
      const s = subScores(
        [{ distanceM: t.distance_m, nightM: t.night_m, blackspotM: t.blackspot_m }],
        eventRows.filter((e) => e.trip_id === t.id),
      )
      return sql`(${t.id}::uuid, ${s.score}::real)`
    })
    await db.execute(
      sql`update ${trips} set score = v.score from (values ${sql.join(values, sql`, `)}) as v(id, score) where ${trips.id} = v.id`,
    )
  }

  if (week_.distanceKm < SCORING.minWeeklyKm) {
    await db.delete(weekly_scores).where(and(eq(weekly_scores.rider_id, riderId), eq(weekly_scores.week_start, week.weekStart)))
    await refreshCurrent(riderId)
    return { status: 'insufficient', riderId, weekStart: week.weekStart, distanceKm: week_.distanceKm }
  }

  const shiftRows = await db
    .select({ from: shifts.starts_at, to: shifts.ends_at })
    .from(shifts)
    .where(and(eq(shifts.rider_id, riderId), lt(shifts.starts_at, to), sql`${shifts.ends_at} > ${from}`))
  const batchRows = await db
    .select({ from: upload_batches.session_started_at, to: upload_batches.session_ended_at, gaps: upload_batches.gaps })
    .from(upload_batches)
    .where(
      and(
        eq(upload_batches.rider_id, riderId),
        eq(upload_batches.status, 'processed'),
        lt(upload_batches.session_started_at, to),
        sql`coalesce(${upload_batches.session_ended_at}, ${upload_batches.processed_at}) > ${from}`,
      ),
    )
  const clip = (a: Date, b: Date) => ({ from: Math.max(a.getTime(), week.from), to: Math.min(b.getTime(), week.to) })
  const sessions: Session[] = batchRows
    .filter((b) => b.from && b.to)
    .map((b) => ({ ...clip(b.from!, b.to!), gaps: b.gaps ?? [] }))

  const [previous] = await db
    .select({ score: weekly_scores.score, coverage: weekly_scores.coverage })
    .from(weekly_scores)
    .where(and(eq(weekly_scores.rider_id, riderId), lt(weekly_scores.week_start, week.weekStart)))
    .orderBy(desc(weekly_scores.week_start))
    .limit(1)

  const conf = coverageAndConfidence({
    shifts: shiftRows.map((s) => clip(s.from, s.to)),
    sessions,
    distanceKm: week_.distanceKm,
    score: week_.score,
    previous: previous ?? null,
  })

  const row = {
    rider_id: riderId,
    week_start: week.weekStart,
    score: week_.score,
    braking: week_.braking,
    cornering: week_.cornering,
    acceleration: week_.acceleration,
    night_exposure: week_.night_exposure,
    route_risk: week_.route_risk,
    coverage: conf.coverage,
    confidence: conf.confidence,
    distance_km: Math.round(week_.distanceKm * 10) / 10,
    trip_count: tripRows.length,
    event_count: eventRows.length,
    flags: conf.flags,
    computed_at: new Date(),
  }
  await db
    .insert(weekly_scores)
    .values(row)
    .onConflictDoUpdate({ target: [weekly_scores.rider_id, weekly_scores.week_start], set: row })
  await refreshCurrent(riderId)
  return { status: 'scored', riderId, weekStart: week.weekStart, score: row.score, confidence: row.confidence, flags: row.flags }
}

// rider_scores_current = the rider's latest scored week, with the change since the week before.
async function refreshCurrent(riderId: string) {
  const [latest, prior] = await db
    .select()
    .from(weekly_scores)
    .where(eq(weekly_scores.rider_id, riderId))
    .orderBy(desc(weekly_scores.week_start))
    .limit(2)
  if (!latest) {
    await db.delete(rider_scores_current).where(eq(rider_scores_current.rider_id, riderId))
    return
  }
  const current = {
    rider_id: riderId,
    week_start: latest.week_start,
    score: latest.score,
    braking: latest.braking,
    cornering: latest.cornering,
    acceleration: latest.acceleration,
    night_exposure: latest.night_exposure,
    route_risk: latest.route_risk,
    coverage: latest.coverage,
    confidence: latest.confidence,
    delta: prior ? Math.round((latest.score - prior.score) * 10) / 10 : null,
    updated_at: new Date(),
  }
  await db.insert(rider_scores_current).values(current).onConflictDoUpdate({ target: rider_scores_current.rider_id, set: current })
}

// Nightly run: this week and last week for every rider who rode in the past 15 days, so late
// uploads and new SACCO shift records still change the score.
export async function scoreRecent(now = Date.now()) {
  const since = new Date(now - 15 * 86_400_000)
  const active = await db
    .selectDistinct({ rider_id: trips.rider_id })
    .from(trips)
    .where(gte(trips.started_at, since))
  const results: WeekResult[] = []
  for (const { rider_id } of active) {
    for (const at of [now - 7 * 86_400_000, now]) {
      try {
        results.push(await scoreRiderWeek(rider_id, at))
      } catch (err) {
        console.error('scoring failed', rider_id, err)
      }
    }
  }
  return { riders: active.length, scored: results.filter((r) => r.status === 'scored').length, results }
}
