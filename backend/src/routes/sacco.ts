import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client'
import { invites, rider_scores_current, riders, saccos, shifts, stages, weekly_scores } from '../db/schema'
import { assertSacco, requireRole, withAccess, type AccessEnv } from '../lib/access'
import { audit } from '../lib/audit'
import { requireUser } from '../lib/auth'
import { kenyanPhone, normaliseKenyanPhone } from '../lib/phone'
import { realtime } from '../lib/realtime'
import { validate } from '../lib/validate'
import { HOUR, rateLimit } from '../lib/rate-limit'
import { SCORING, tierOf } from '../scoring/model'

const saccoParam = validate('param', z.object({ saccoId: z.uuid() }))
const MAX_SHIFT_MS = 24 * 3600_000
const MAX_SHIFTS_PER_UPLOAD = 2000

type ShiftInput = { rider_id?: string; phone?: string; starts_at: string; ends_at: string }
type ShiftRejection = { index: number; reason: string }

// Validates shift rows against this SACCO's riders and upserts them (rider + start is unique).
async function saveShifts(saccoId: string, rows: ShiftInput[]) {
  const roster = await db.select({ id: riders.id, phone: riders.phone }).from(riders).where(eq(riders.sacco_id, saccoId))
  const byId = new Set(roster.map((r) => r.id))
  const byPhone = new Map(roster.map((r) => [r.phone, r.id]))
  const rejected: ShiftRejection[] = []
  const valid: (typeof shifts.$inferInsert)[] = []
  rows.forEach((row, index) => {
    const riderId = row.rider_id ?? (row.phone ? byPhone.get(normaliseKenyanPhone(row.phone) ?? '') : undefined)
    if (!riderId || !byId.has(riderId)) return rejected.push({ index, reason: 'rider not in this SACCO' })
    const start = Date.parse(row.starts_at)
    const end = Date.parse(row.ends_at)
    if (Number.isNaN(start) || Number.isNaN(end)) return rejected.push({ index, reason: 'invalid date' })
    if (end <= start) return rejected.push({ index, reason: 'ends before it starts' })
    if (end - start > MAX_SHIFT_MS) return rejected.push({ index, reason: 'longer than 24 hours' })
    valid.push({ rider_id: riderId, sacco_id: saccoId, starts_at: new Date(start), ends_at: new Date(end), source: 'sacco_upload' })
  })
  if (valid.length > 0) {
    await db
      .insert(shifts)
      .values(valid)
      .onConflictDoUpdate({ target: [shifts.rider_id, shifts.starts_at], set: { ends_at: sql`excluded.ends_at` } })
  }
  return { saved: valid.length, rejected }
}

// "phone,starts_at,ends_at" with a header row, ISO 8601 times (e.g. 2026-11-02T06:00:00+03:00).
export function parseShiftCsv(text: string): ShiftInput[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const header = lines.shift()?.toLowerCase().split(',').map((h) => h.trim()) ?? []
  const col = (name: string) => header.indexOf(name)
  if (col('starts_at') < 0 || col('ends_at') < 0 || (col('phone') < 0 && col('rider_id') < 0)) {
    throw new HTTPException(400, { message: 'CSV needs a header: phone,starts_at,ends_at' })
  }
  return lines.map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    return {
      phone: col('phone') >= 0 ? cells[col('phone')] : undefined,
      rider_id: col('rider_id') >= 0 ? cells[col('rider_id')] || undefined : undefined,
      starts_at: cells[col('starts_at')] ?? '',
      ends_at: cells[col('ends_at')] ?? '',
    }
  })
}

const fleetLive = (saccoId: string) =>
  db
    .select({
      id: riders.id,
      name: riders.name,
      bike_reg: riders.bike_reg,
      score: rider_scores_current.score,
      coverage: rider_scores_current.coverage,
      confidence: rider_scores_current.confidence,
      delta: rider_scores_current.delta,
      week_start: rider_scores_current.week_start,
    })
    .from(riders)
    .leftJoin(rider_scores_current, eq(rider_scores_current.rider_id, riders.id))
    .where(eq(riders.sacco_id, saccoId))
    .orderBy(asc(riders.name))

// SACCO fleet safety: everything here is limited to SACCOs the caller administers.
export const sacco = new Hono<AccessEnv>()
  .use(requireUser, withAccess, requireRole('sacco_admin', 'admin'))
  .use('/:saccoId/*', saccoParam, async (c, next) => {
    assertSacco(c.get('access'), c.req.param('saccoId')!)
    await next()
  })

  .get('/:saccoId', saccoParam, async (c) => {
    const { saccoId } = c.req.valid('param')
    assertSacco(c.get('access'), saccoId)
    const [row] = await db.select().from(saccos).where(eq(saccos.id, saccoId))
    if (!row) throw new HTTPException(404, { message: 'SACCO not found' })
    const stageRows = await db.select().from(stages).where(eq(stages.sacco_id, saccoId)).orderBy(asc(stages.name))
    return c.json({ ...row, stages: stageRows })
  })

  .post(
    '/:saccoId/stages',
    validate('json', z.object({ name: z.string().trim().min(2), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() })),
    async (c) => {
      const saccoId = c.req.param('saccoId')
      const { name, lat, lng } = c.req.valid('json')
      const [row] = await db
        .insert(stages)
        .values({ sacco_id: saccoId, name, location: lat !== undefined && lng !== undefined ? { x: lng, y: lat } : null })
        .returning()
      return c.json(row, 201)
    },
  )

  // Fleet overview: every rider with their current score, coverage, flags and 8-week trend.
  .get('/:saccoId/fleet', async (c) => {
    const saccoId = c.req.param('saccoId')
    const roster = await db
      .select({
        id: riders.id,
        name: riders.name,
        phone: riders.phone,
        bike_reg: riders.bike_reg,
        stage_name: stages.name,
        linked: sql<boolean>`${riders.user_id} is not null`,
        score: rider_scores_current.score,
        delta: rider_scores_current.delta,
        coverage: rider_scores_current.coverage,
        confidence: rider_scores_current.confidence,
        week_start: rider_scores_current.week_start,
      })
      .from(riders)
      .leftJoin(stages, eq(stages.id, riders.stage_id))
      .leftJoin(rider_scores_current, eq(rider_scores_current.rider_id, riders.id))
      .where(eq(riders.sacco_id, saccoId))
      .orderBy(asc(riders.name))

    const ids = roster.map((r) => r.id)
    const since = new Date(Date.now() - 8 * 7 * 86_400_000).toISOString().slice(0, 10)
    const weeks = ids.length
      ? await db
          .select({ rider_id: weekly_scores.rider_id, week_start: weekly_scores.week_start, score: weekly_scores.score, flags: weekly_scores.flags })
          .from(weekly_scores)
          .where(and(inArray(weekly_scores.rider_id, ids), gte(weekly_scores.week_start, since)))
          .orderBy(asc(weekly_scores.week_start))
      : []

    const ridersOut = roster.map((r) => {
      const own = weeks.filter((w) => w.rider_id === r.id)
      const latestFlags = own.at(-1)?.flags ?? []
      return {
        ...r,
        tier: r.score === null ? null : tierOf(r.score),
        trend: own.map((w) => ({ week_start: w.week_start, score: w.score })),
        flags: latestFlags,
      }
    })
    const scored = ridersOut.filter((r) => r.score !== null)
    const withCoverage = scored.filter((r) => r.coverage !== null)
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)
    await audit(c.get('user').userId, 'sacco.fleet.view', 'sacco', saccoId)
    return c.json({
      stats: {
        riders: ridersOut.length,
        scored: scored.length,
        avg_score: avg(scored.map((r) => r.score!)),
        avg_coverage: avg(withCoverage.map((r) => r.coverage! * 100)),
        flagged: ridersOut.filter((r) => r.flags.length > 0 || (r.score !== null && r.score < 55)).length,
      },
      riders: ridersOut,
    })
  })

  // Riders who need attention: gaming or coverage flags, or a high-risk score.
  .get('/:saccoId/flags', async (c) => {
    const saccoId = c.req.param('saccoId')
    const rows = await db
      .select({
        rider_id: riders.id,
        name: riders.name,
        week_start: weekly_scores.week_start,
        score: weekly_scores.score,
        coverage: weekly_scores.coverage,
        confidence: weekly_scores.confidence,
        flags: weekly_scores.flags,
      })
      .from(rider_scores_current)
      .innerJoin(riders, eq(riders.id, rider_scores_current.rider_id))
      .innerJoin(
        weekly_scores,
        and(eq(weekly_scores.rider_id, rider_scores_current.rider_id), eq(weekly_scores.week_start, rider_scores_current.week_start)),
      )
      .where(eq(riders.sacco_id, saccoId))
    const flagged = rows
      .map((r) => ({
        ...r,
        reasons: [
          ...r.flags,
          ...(r.score < 55 ? ['high_risk_score'] : []),
          ...(r.confidence < SCORING.insurerMinConfidence ? ['below_insurer_confidence'] : []),
        ],
      }))
      .filter((r) => r.reasons.length > 0)
      .sort((a, b) => a.score - b.score)
    return c.json(flagged)
  })

  // Register a rider in this SACCO. With an email, they're linked when they sign in with Google.
  .post(
    '/:saccoId/riders',
    rateLimit({ name: 'sacco-riders', max: 200, windowMs: HOUR, by: 'user' }),
    validate(
      'json',
      z.object({
        name: z.string().trim().min(2).max(100),
        phone: kenyanPhone,
        bike_reg: z.string().trim().toUpperCase().max(20).optional(),
        stage_id: z.uuid().optional(),
        email: z.email().transform((e) => e.toLowerCase()).optional(),
      }),
    ),
    async (c) => {
      const saccoId = c.req.param('saccoId')
      const body = c.req.valid('json')
      const [taken] = await db.select({ id: riders.id }).from(riders).where(eq(riders.phone, body.phone))
      if (taken) {
        throw new HTTPException(409, {
          message: 'This phone is already registered. If the rider signed up on their own, invite their Google email instead.',
        })
      }
      if (body.stage_id) {
        const [stage] = await db.select({ id: stages.id }).from(stages).where(and(eq(stages.id, body.stage_id), eq(stages.sacco_id, saccoId)))
        if (!stage) throw new HTTPException(400, { message: 'Stage is not in this SACCO' })
      }
      const userId = c.get('user').userId
      const rider = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(riders)
          .values({ name: body.name, phone: body.phone, bike_reg: body.bike_reg, stage_id: body.stage_id, sacco_id: saccoId })
          .returning()
        if (body.email) {
          await tx.insert(invites).values({ email: body.email, role: 'rider', sacco_id: saccoId, rider_id: row!.id, invited_by: userId })
        }
        return row!
      })
      await audit(userId, 'rider.create', 'rider', rider.id, { sacco_id: saccoId, invited: !!body.email })
      return c.json(rider, 201)
    },
  )

  // Invite a rider who registered on their own to join this SACCO (applied when they sign in).
  .post('/:saccoId/riders/invite', rateLimit({ name: 'sacco-invites', max: 100, windowMs: HOUR, by: 'user' }), validate('json', z.object({ email: z.email().transform((e) => e.toLowerCase()) })), async (c) => {
    const saccoId = c.req.param('saccoId')
    const [row] = await db
      .insert(invites)
      .values({ email: c.req.valid('json').email, role: 'rider', sacco_id: saccoId, invited_by: c.get('user').userId })
      .returning()
    return c.json(row, 201)
  })

  .get(
    '/:saccoId/shifts',
    validate('query', z.object({ from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }) })),
    async (c) => {
      const { from, to } = c.req.valid('query')
      return c.json(
        await db
          .select({ id: shifts.id, rider_id: shifts.rider_id, name: riders.name, starts_at: shifts.starts_at, ends_at: shifts.ends_at, source: shifts.source })
          .from(shifts)
          .innerJoin(riders, eq(riders.id, shifts.rider_id))
          .where(and(eq(shifts.sacco_id, c.req.param('saccoId')), gte(shifts.starts_at, new Date(from)), lt(shifts.starts_at, new Date(to))))
          .orderBy(desc(shifts.starts_at))
          .limit(2000),
      )
    },
  )

  // Shift records: the reference that coverage confidence is checked against.
  .post(
    '/:saccoId/shifts',
    rateLimit({ name: 'shifts', max: 60, windowMs: HOUR, by: 'user' }),
    bodyLimit({ maxSize: 1024 * 1024 }),
    validate(
      'json',
      z.object({
        shifts: z
          .array(
            z
              .object({ rider_id: z.uuid().optional(), phone: z.string().optional(), starts_at: z.string(), ends_at: z.string() })
              .refine((s) => s.rider_id || s.phone, { message: 'Each shift needs rider_id or phone' }),
          )
          .min(1)
          .max(MAX_SHIFTS_PER_UPLOAD),
      }),
    ),
    async (c) => {
      const saccoId = c.req.param('saccoId')
      const result = await saveShifts(saccoId, c.req.valid('json').shifts)
      await audit(c.get('user').userId, 'shifts.upload', 'sacco', saccoId, { saved: result.saved, rejected: result.rejected.length })
      return c.json(result, result.saved > 0 ? 201 : 400)
    },
  )
  .post('/:saccoId/shifts/csv', rateLimit({ name: 'shifts', max: 60, windowMs: HOUR, by: 'user' }), bodyLimit({ maxSize: 1024 * 1024 }), async (c) => {
    const saccoId = c.req.param('saccoId')
    const rows = parseShiftCsv(await c.req.text())
    if (rows.length === 0) throw new HTTPException(400, { message: 'CSV has no rows' })
    if (rows.length > MAX_SHIFTS_PER_UPLOAD) throw new HTTPException(400, { message: `At most ${MAX_SHIFTS_PER_UPLOAD} rows per upload` })
    const result = await saveShifts(saccoId, rows)
    await audit(c.get('user').userId, 'shifts.upload', 'sacco', saccoId, { saved: result.saved, rejected: result.rejected.length, format: 'csv' })
    return c.json(result, result.saved > 0 ? 201 : 400)
  })

  // Sealed live query for the fleet dashboard (scores update as nightly jobs run).
  .post('/:saccoId/live', async (c) => {
    if (!realtime) throw new HTTPException(503, { message: 'Realtime is not configured' })
    return c.json(await realtime.seal({ query: fleetLive(c.req.param('saccoId')) }))
  })
