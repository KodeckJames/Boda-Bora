import { and, desc, eq, gte, isNotNull, lt } from 'drizzle-orm'
import { db } from '../db/client'
import { blackspots, coaching_messages, riders, risk_events, stages, weekly_scores } from '../db/schema'
import { weekOf } from '../scoring/model'
import { buildFactPack, type CoachEvent, type NamedPlace } from './facts'
import { generateCoaching } from './generate'

export type CoachResult =
  | { status: 'created'; riderId: string; weekStart: string; source: 'ai' | 'template'; fallbackReason?: string }
  | { status: 'skipped'; riderId: string; reason: string }

// Writes this week's coaching for one rider from their scored week.
export async function coachRider(riderId: string, at = Date.now(), opts: { force?: boolean } = {}): Promise<CoachResult> {
  const week = weekOf(at)
  const [score] = await db
    .select()
    .from(weekly_scores)
    .where(and(eq(weekly_scores.rider_id, riderId), eq(weekly_scores.week_start, week.weekStart)))
  if (!score) return { status: 'skipped', riderId, reason: 'no scored week' }

  if (!opts.force) {
    const [existing] = await db
      .select({ id: coaching_messages.id })
      .from(coaching_messages)
      .where(and(eq(coaching_messages.rider_id, riderId), eq(coaching_messages.week_start, week.weekStart)))
    if (existing) return { status: 'skipped', riderId, reason: 'already coached this week' }
  }

  const [previous] = await db
    .select({ score: weekly_scores.score })
    .from(weekly_scores)
    .where(and(eq(weekly_scores.rider_id, riderId), lt(weekly_scores.week_start, week.weekStart)))
    .orderBy(desc(weekly_scores.week_start))
    .limit(1)

  const eventRows = await db
    .select({
      type: risk_events.type,
      severity: risk_events.severity,
      occurred_at: risk_events.occurred_at,
      location: risk_events.location,
      speed_kmh: risk_events.speed_kmh,
      blackspot: blackspots.name,
    })
    .from(risk_events)
    .leftJoin(blackspots, eq(blackspots.id, risk_events.blackspot_id))
    .where(
      and(
        eq(risk_events.rider_id, riderId),
        gte(risk_events.occurred_at, new Date(week.from)),
        lt(risk_events.occurred_at, new Date(week.to)),
      ),
    )
  const events: CoachEvent[] = eventRows.map((e) => ({
    type: e.type,
    severity: e.severity,
    t: e.occurred_at.getTime(),
    lat: e.location?.y ?? null,
    lng: e.location?.x ?? null,
    speedKmh: e.speed_kmh,
    blackspotName: e.blackspot,
  }))

  // Stage names give clusters a place riders recognise when no blackspot is involved.
  const [rider] = await db.select({ sacco_id: riders.sacco_id }).from(riders).where(eq(riders.id, riderId))
  const places: NamedPlace[] = rider?.sacco_id
    ? (
        await db
          .select({ name: stages.name, location: stages.location })
          .from(stages)
          .where(and(eq(stages.sacco_id, rider.sacco_id), isNotNull(stages.location)))
      ).map((s) => ({ name: s.name, lat: s.location!.y, lng: s.location!.x }))
    : []

  const facts = buildFactPack({
    weekStart: week.weekStart,
    score: score.score,
    previousScore: previous?.score ?? null,
    subScores: {
      braking: score.braking,
      cornering: score.cornering,
      acceleration: score.acceleration,
      night_exposure: score.night_exposure,
      route_risk: score.route_risk,
    },
    coverage: score.coverage,
    events,
    places,
  })
  const coaching = await generateCoaching(facts)
  await db.insert(coaching_messages).values({
    rider_id: riderId,
    week_start: week.weekStart,
    message_sw: coaching.message_sw,
    message_en: coaching.message_en,
    focus: coaching.focus,
    facts,
    source: coaching.source,
    model: coaching.model,
  })
  return { status: 'created', riderId, weekStart: week.weekStart, source: coaching.source, fallbackReason: coaching.fallbackReason }
}

// Weekly run: everyone with a scored week gets this week's message.
export async function coachWeek(now = Date.now()) {
  const week = weekOf(now)
  const scored = await db
    .select({ rider_id: weekly_scores.rider_id })
    .from(weekly_scores)
    .where(eq(weekly_scores.week_start, week.weekStart))
  const results: CoachResult[] = []
  for (const { rider_id } of scored) {
    try {
      results.push(await coachRider(rider_id, now))
    } catch (err) {
      console.error('coaching failed', rider_id, err)
    }
  }
  return {
    weekStart: week.weekStart,
    riders: scored.length,
    created: results.filter((r) => r.status === 'created').length,
    ai: results.filter((r) => r.status === 'created' && r.source === 'ai').length,
  }
}
