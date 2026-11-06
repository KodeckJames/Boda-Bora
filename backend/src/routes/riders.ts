import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client'
import {
  blackspots,
  rider_scores_current,
  riders as ridersTable,
  risk_events,
  saccos,
  shifts,
  stages,
  trips,
  upload_batches,
  weekly_scores,
} from '../db/schema'
import { assertCanViewRider, requireRole, withAccess, type AccessEnv } from '../lib/access'
import { audit } from '../lib/audit'
import { requireUser } from '../lib/auth'
import { realtime } from '../lib/realtime'
import { validate } from '../lib/validate'
import { intersect, recordedIntervals, tierOf, total, union, weekOf } from '../scoring/model'

const EAT_MS = 3 * 3600_000
const DAY_MS = 86_400_000
const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 4 } as const

const riderParam = validate('param', z.object({ id: z.uuid() }))
const weekQuery = validate('query', z.object({ week: z.iso.date().optional() })) // any day in the week

// Everyone allowed to see this rider (themself, their SACCO's admins, platform admins).
const canView = async (c: { get: (k: 'access') => AccessEnv['Variables']['access'] }, id: string) =>
  assertCanViewRider(c.get('access'), id)

const ridersList = () =>
  db.select().from(ridersTable).orderBy(desc(ridersTable.created_at)).limit(100)

export const riders = new Hono<AccessEnv>()
  .use(requireUser, withAccess)
  // Platform-wide list: admins only (names and phones are personal data).
  .get('/', requireRole('admin'), async (c) => c.json(await ridersList()))
  .post('/live', requireRole('admin'), async (c) => {
    if (!realtime) throw new HTTPException(503, { message: 'Realtime is not configured' })
    return c.json(await realtime.seal({ query: ridersList() }))
  })

  .get('/:id', riderParam, async (c) => {
    const { id } = c.req.valid('param')
    await canView(c, id)
    const [row] = await db
      .select({
        id: ridersTable.id,
        name: ridersTable.name,
        phone: ridersTable.phone,
        bike_reg: ridersTable.bike_reg,
        sacco_id: ridersTable.sacco_id,
        sacco_name: saccos.name,
        stage_id: ridersTable.stage_id,
        stage_name: stages.name,
        linked: sql<boolean>`${ridersTable.user_id} is not null`,
        created_at: ridersTable.created_at,
      })
      .from(ridersTable)
      .leftJoin(saccos, eq(saccos.id, ridersTable.sacco_id))
      .leftJoin(stages, eq(stages.id, ridersTable.stage_id))
      .where(eq(ridersTable.id, id))
    if (!row) throw new HTTPException(404, { message: 'Rider not found' })
    if (c.get('access').riderId !== id) await audit(c.get('user').userId, 'rider.view', 'rider', id)
    return c.json(row)
  })

  // Current score, its tier and the last 8 weeks.
  .get('/:id/score', riderParam, async (c) => {
    const { id } = c.req.valid('param')
    await canView(c, id)
    const [current] = await db.select().from(rider_scores_current).where(eq(rider_scores_current.rider_id, id))
    const history = await db
      .select({
        week_start: weekly_scores.week_start,
        score: weekly_scores.score,
        coverage: weekly_scores.coverage,
        confidence: weekly_scores.confidence,
        distance_km: weekly_scores.distance_km,
        flags: weekly_scores.flags,
      })
      .from(weekly_scores)
      .where(eq(weekly_scores.rider_id, id))
      .orderBy(desc(weekly_scores.week_start))
      .limit(8)
    return c.json({ current: current ? { ...current, tier: tierOf(current.score) } : null, history: history.reverse() })
  })

  // One week in detail: score, events, hourly risk, routes and shift coverage per day.
  .get('/:id/week', riderParam, weekQuery, async (c) => {
    const { id } = c.req.valid('param')
    await canView(c, id)
    const { week: day } = c.req.valid('query')
    const week = weekOf(day ? Date.parse(`${day}T12:00:00+03:00`) : Date.now())
    const from = new Date(week.from)
    const to = new Date(week.to)

    const [score] = await db
      .select()
      .from(weekly_scores)
      .where(and(eq(weekly_scores.rider_id, id), eq(weekly_scores.week_start, week.weekStart)))

    const events = await db
      .select({
        id: risk_events.id,
        type: risk_events.type,
        severity: risk_events.severity,
        occurred_at: risk_events.occurred_at,
        location: risk_events.location,
        speed_kmh: risk_events.speed_kmh,
        magnitude_g: risk_events.magnitude_g,
        blackspot: blackspots.name,
      })
      .from(risk_events)
      .leftJoin(blackspots, eq(blackspots.id, risk_events.blackspot_id))
      .where(and(eq(risk_events.rider_id, id), gte(risk_events.occurred_at, from), lt(risk_events.occurred_at, to)))
      .orderBy(risk_events.occurred_at)

    // 7 days (Mon–Sun) × 24 hours of severity-weighted events, in Kenya time.
    const hourly = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
    for (const e of events) {
      const local = new Date(e.occurred_at.getTime() + EAT_MS)
      hourly[(local.getUTCDay() + 6) % 7]![local.getUTCHours()]! += SEVERITY_WEIGHT[e.severity]
    }

    const tripRows = await db
      .select({
        id: trips.id,
        started_at: trips.started_at,
        ended_at: trips.ended_at,
        distance_m: trips.distance_m,
        night_m: trips.night_m,
        score: trips.score,
        path: sql<string | null>`ST_AsGeoJSON(${trips.path})`,
      })
      .from(trips)
      .where(and(eq(trips.rider_id, id), gte(trips.started_at, from), lt(trips.started_at, to)))
      .orderBy(trips.started_at)

    // Shift hours vs recorded hours per day, the same comparison coverage is built on.
    const shiftRows = await db
      .select({ from: shifts.starts_at, to: shifts.ends_at })
      .from(shifts)
      .where(and(eq(shifts.rider_id, id), lt(shifts.starts_at, to), sql`${shifts.ends_at} > ${from}`))
    const batchRows = await db
      .select({ from: upload_batches.session_started_at, to: upload_batches.session_ended_at, gaps: upload_batches.gaps })
      .from(upload_batches)
      .where(and(eq(upload_batches.rider_id, id), eq(upload_batches.status, 'processed'), lt(upload_batches.session_started_at, to)))
    const recorded = recordedIntervals(
      batchRows.filter((b) => b.from && b.to).map((b) => ({ from: b.from!.getTime(), to: b.to!.getTime(), gaps: b.gaps ?? [] })),
    )
    const shiftTime = union(shiftRows.map((s) => ({ from: s.from.getTime(), to: s.to.getTime() })))
    const coverageByDay = Array.from({ length: 7 }, (_, d) => {
      const dayRange = [{ from: week.from + d * DAY_MS, to: week.from + (d + 1) * DAY_MS }]
      const shiftDay = intersect(shiftTime, dayRange)
      const hours = (ms: number) => Math.round((ms / 3600_000) * 10) / 10
      return { shift_hours: hours(total(shiftDay)), recorded_hours: hours(total(intersect(recorded, shiftDay))) }
    })

    if (c.get('access').riderId !== id) await audit(c.get('user').userId, 'rider.week.view', 'rider', id, { week: week.weekStart })
    return c.json({
      week_start: week.weekStart,
      score: score ? { ...score, tier: tierOf(score.score) } : null,
      events: events.map(({ location, ...e }) => ({ ...e, lat: location?.y ?? null, lng: location?.x ?? null })),
      hourly_risk: hourly,
      trips: tripRows.map((t) => ({ ...t, path: t.path ? JSON.parse(t.path) : null })),
      coverage_by_day: coverageByDay,
    })
  })

  .get('/:id/trips', riderParam, validate('query', z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) })), async (c) => {
    const { id } = c.req.valid('param')
    await canView(c, id)
    const rows = await db
      .select({
        id: trips.id,
        started_at: trips.started_at,
        ended_at: trips.ended_at,
        distance_m: trips.distance_m,
        max_speed_kmh: trips.max_speed_kmh,
        score: trips.score,
        events: sql<number>`(select count(*)::int from ${risk_events} where ${risk_events.trip_id} = ${trips.id})`,
      })
      .from(trips)
      .where(eq(trips.rider_id, id))
      .orderBy(desc(trips.started_at))
      .limit(c.req.valid('query').limit)
    return c.json(rows)
  })
