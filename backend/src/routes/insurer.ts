import { and, asc, desc, eq, gte, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client'
import { consents, insurers, quote_requests, rider_scores_current, riders, saccos } from '../db/schema'
import { assertInsurer, requireRole, withAccess, type AccessEnv } from '../lib/access'
import { audit } from '../lib/audit'
import { requireUser } from '../lib/auth'
import { activeConsentFor, hasConsent } from '../lib/consent'
import { realtime } from '../lib/realtime'
import { validate } from '../lib/validate'
import { SCORING, TIERS, tierOf } from '../scoring/model'

const MIN_CONF = SCORING.insurerMinConfidence

// Scores an insurer may use: the rider consented to this insurer (or any partner insurer)
// and the score clears the confidence bar.
const eligible = (insurerId: string) =>
  and(hasConsent(rider_scores_current.rider_id, insurerId), gte(rider_scores_current.confidence, MIN_CONF))

const pendingQuotesLive = (insurerId: string) =>
  db
    .select({
      id: quote_requests.id,
      status: quote_requests.status,
      score_snapshot: quote_requests.score_snapshot,
      created_at: quote_requests.created_at,
    })
    .from(quote_requests)
    .where(and(eq(quote_requests.insurer_id, insurerId), eq(quote_requests.status, 'pending')))
    .orderBy(desc(quote_requests.created_at))

// Underwriting. Insurers never see phone numbers, traces or unconsented riders.
export const insurer = new Hono<AccessEnv>()
  .use(requireUser, withAccess)
  // Partner insurers a rider can share with (any signed-in user).
  .get('/', async (c) => c.json(await db.select({ id: insurers.id, name: insurers.name }).from(insurers).orderBy(asc(insurers.name))))

  .use('/:insurerId/*', requireRole('insurer_analyst', 'admin'), validate('param', z.object({ insurerId: z.uuid() })), async (c, next) => {
    assertInsurer(c.get('access'), c.req.param('insurerId')!)
    await next()
  })

  // Riders per tier among eligible scores, plus how many consented riders are below the bar.
  .get('/:insurerId/tiers', async (c) => {
    const insurerId = c.req.param('insurerId')
    const rows = await db.select({ score: rider_scores_current.score }).from(rider_scores_current).where(eligible(insurerId))
    const [{ pending }] = (await db
      .select({ pending: sql<number>`count(*)::int` })
      .from(rider_scores_current)
      .where(and(hasConsent(rider_scores_current.rider_id, insurerId), sql`${rider_scores_current.confidence} < ${MIN_CONF}`))) as [
      { pending: number },
    ]
    const tiers = TIERS.map((t) => {
      const inTier = rows.filter((r) => tierOf(r.score) === t.tier)
      return {
        tier: t.tier,
        min_score: t.min,
        riders: inTier.length,
        avg_score: inTier.length ? Math.round((inTier.reduce((s, r) => s + r.score, 0) / inTier.length) * 10) / 10 : null,
      }
    })
    return c.json({ eligible_riders: rows.length, below_confidence: pending, min_confidence: MIN_CONF, tiers })
  })

  // Histogram of eligible scores in 10-point buckets (aggregate only).
  .get('/:insurerId/distribution', async (c) => {
    const rows = await db.select({ score: rider_scores_current.score }).from(rider_scores_current).where(eligible(c.req.param('insurerId')))
    const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 10, riders: 0 }))
    for (const r of rows) buckets[Math.min(9, Math.floor(r.score / 10))]!.riders++
    return c.json({ riders: rows.length, buckets })
  })

  .get('/:insurerId/quotes', validate('query', z.object({ status: z.enum(['pending', 'quoted', 'referred', 'declined']).optional() })), async (c) => {
    const insurerId = c.req.param('insurerId')
    const { status } = c.req.valid('query')
    const rows = await db
      .select({
        id: quote_requests.id,
        status: quote_requests.status,
        rider_id: quote_requests.rider_id,
        rider_name: riders.name,
        sacco_name: saccos.name,
        score_snapshot: quote_requests.score_snapshot,
        current_score: rider_scores_current.score,
        current_confidence: rider_scores_current.confidence,
        premium_ksh: quote_requests.premium_ksh,
        notes: quote_requests.notes,
        created_at: quote_requests.created_at,
        decided_at: quote_requests.decided_at,
      })
      .from(quote_requests)
      .innerJoin(riders, eq(riders.id, quote_requests.rider_id))
      .leftJoin(saccos, eq(saccos.id, riders.sacco_id))
      .leftJoin(rider_scores_current, eq(rider_scores_current.rider_id, quote_requests.rider_id))
      .where(and(eq(quote_requests.insurer_id, insurerId), status ? eq(quote_requests.status, status) : undefined))
      .orderBy(desc(quote_requests.created_at))
      .limit(200)
    await audit(c.get('user').userId, 'quotes.view', 'insurer', insurerId)
    return c.json(rows.map((r) => ({ ...r, eligible: r.current_confidence !== null && r.current_confidence >= MIN_CONF })))
  })

  .post(
    '/:insurerId/quotes/:quoteId/decision',
    validate('param', z.object({ insurerId: z.uuid(), quoteId: z.uuid() })),
    validate(
      'json',
      z
        .object({
          decision: z.enum(['quoted', 'referred', 'declined']),
          premium_ksh: z.number().int().min(100).max(1_000_000).optional(),
          notes: z.string().trim().max(1000).optional(),
        })
        .refine((d) => d.decision !== 'quoted' || d.premium_ksh, { message: 'A quote needs premium_ksh' }),
    ),
    async (c) => {
      const { insurerId, quoteId } = c.req.valid('param')
      const body = c.req.valid('json')
      const [quote] = await db
        .select()
        .from(quote_requests)
        .where(and(eq(quote_requests.id, quoteId), eq(quote_requests.insurer_id, insurerId)))
      if (!quote) throw new HTTPException(404, { message: 'Quote request not found' })
      if (quote.status !== 'pending') throw new HTTPException(409, { message: `Already ${quote.status}` })

      if (body.decision === 'quoted') {
        // Price only on a score the rider still shares and that still clears the bar.
        const [consent] = await db.select({ id: consents.id }).from(consents).where(activeConsentFor(quote.rider_id, insurerId))
        if (!consent) throw new HTTPException(409, { message: 'The rider has withdrawn consent' })
        const [current] = await db.select().from(rider_scores_current).where(eq(rider_scores_current.rider_id, quote.rider_id))
        if (!current || current.confidence < MIN_CONF) {
          throw new HTTPException(409, { message: 'Score confidence is below the pricing threshold; refer instead' })
        }
      }
      const [row] = await db
        .update(quote_requests)
        .set({ status: body.decision, premium_ksh: body.premium_ksh ?? null, notes: body.notes ?? null, decided_by: c.get('user').userId, decided_at: new Date() })
        .where(and(eq(quote_requests.id, quoteId), eq(quote_requests.status, 'pending')))
        .returning()
      if (!row) throw new HTTPException(409, { message: 'Quote was decided by someone else' })
      await audit(c.get('user').userId, `quote.${body.decision}`, 'quote', quoteId, { insurer_id: insurerId, premium_ksh: body.premium_ksh })
      return c.json(row)
    },
  )

  // Sealed live query: new quote requests appear on the dashboard without polling.
  .post('/:insurerId/live', async (c) => {
    if (!realtime) throw new HTTPException(503, { message: 'Realtime is not configured' })
    return c.json(await realtime.seal({ query: pendingQuotesLive(c.req.param('insurerId')) }))
  })
