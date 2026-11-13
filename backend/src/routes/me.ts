import { validate } from '../lib/validate'
import { DAY, rateLimit } from '../lib/rate-limit'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client'
import { consents, insurers, profiles, quote_requests, rider_scores_current, riders } from '../db/schema'
import { requireRider, withAccess, type Access, type AccessEnv } from '../lib/access'
import { audit } from '../lib/audit'
import { requireUser } from '../lib/auth'
import { activeConsentFor } from '../lib/consent'
import { kenyanPhone } from '../lib/phone'
import { bikePlate, fullName } from '../lib/plate'
import { tierOf } from '../scoring/model'

const ownRider = (access: Access) => {
  if (!access.riderId) throw new HTTPException(409, { message: 'Finish rider registration first' })
  return access.riderId
}

// Full name and number plate are the rider's identity on SACCO rosters and insurer quotes.
const riderSignup = z.object({
  name: fullName,
  phone: kenyanPhone,
  bike_reg: bikePlate,
})
// Riders can fix their name and plate later. The phone is fixed: SACCO shift records and USSD use it.
const riderUpdate = z
  .object({ name: fullName.optional(), bike_reg: bikePlate.optional() })
  .refine((b) => b.name !== undefined || b.bike_reg !== undefined, { message: 'Nothing to update' })

// The signed-in user: who they are, their role and what they can access.
export const me = new Hono<AccessEnv>()
  .use(requireUser, withAccess)
  .get('/', async (c) => {
    const { profile, riderId, saccoIds, insurerIds } = c.get('access')
    const rider = riderId
      ? (await db.select().from(riders).where(eq(riders.id, riderId)))[0] ?? null
      : null
    return c.json({ profile, rider, sacco_ids: saccoIds, insurer_ids: insurerIds })
 })
  // Preferences: the language the app, coaching (and later USSD and SMS) use for this user.
  .patch('/', validate('json', z.object({ language: z.enum(['en', 'sw']) })), async (c) => {
    const { language } = c.req.valid('json')
    const [profile] = await db
      .update(profiles)
      .set({ language })
      .where(eq(profiles.user_id, c.get('access').profile.user_id))
      .returning()
    return c.json({ profile })
 })
  // Self-registration for riders who aren't with a SACCO yet. SACCO-registered riders are
  // linked by invite instead, so nobody can claim another rider's record by typing their phone.
  .post('/rider', rateLimit({ name: 'rider-signup', max: 5, windowMs: DAY, by: 'user' }), validate('json', riderSignup), async (c) => {
    const access = c.get('access')
    if (access.riderId) throw new HTTPException(409, { message: 'You are already registered as a rider' })
    if (access.profile.role === 'sacco_admin' || access.profile.role === 'insurer_analyst') {
      throw new HTTPException(409, { message: `Your account is a ${access.profile.role} account` })
   }
    const body = c.req.valid('json')
    const [taken] = await db.select({ id: riders.id }).from(riders).where(eq(riders.phone, body.phone))
    if (taken) {
      throw new HTTPException(409, {
        message: 'This phone number is already registered. Ask your SACCO to invite your Google account.',
     })
   }
    const userId = access.profile.user_id
    const rider = await db.transaction(async (tx) => {
      if (!access.profile.role) await tx.update(profiles).set({ role: 'rider' }).where(eq(profiles.user_id, userId))
      const [row] = await tx
        .insert(riders)
        .values({ user_id: userId, name: body.name, phone: body.phone, bike_reg: body.bike_reg })
        .returning()
      return row!
   })
    await audit(userId, 'rider.self_register', 'rider', rider.id)
    return c.json(rider, 201)
 })
  .patch('/rider', requireRider, rateLimit({ name: 'rider-update', max: 20, windowMs: DAY, by: 'user' }), validate('json', riderUpdate), async (c) => {
    const riderId = ownRider(c.get('access'))
    const [rider] = await db.update(riders).set(c.req.valid('json')).where(eq(riders.id, riderId)).returning()
    await audit(c.get('user').userId, 'rider.update', 'rider', riderId, { fields: Object.keys(c.req.valid('json')) })
    return c.json(rider)
 })

  // ---------- Sharing the score with insurers (rider-controlled) ----------

  .get('/consents', requireRider, async (c) => {
    const riderId = ownRider(c.get('access'))
    return c.json(
      await db
        .select({ id: consents.id, insurer_id: consents.insurer_id, insurer_name: insurers.name, granted_at: consents.granted_at, revoked_at: consents.revoked_at })
        .from(consents)
        .leftJoin(insurers, eq(insurers.id, consents.insurer_id))
        .where(eq(consents.rider_id, riderId))
        .orderBy(desc(consents.granted_at)),
    )
 })
  // insurer_id omitted = share with any partner insurer.
  .post('/consents', requireRider, rateLimit({ name: 'consents', max: 20, windowMs: DAY, by: 'user' }), validate('json', z.object({ insurer_id: z.uuid().optional() })), async (c) => {
    const riderId = ownRider(c.get('access'))
    const { insurer_id } = c.req.valid('json')
    if (insurer_id) {
      const [ins] = await db.select({ id: insurers.id }).from(insurers).where(eq(insurers.id, insurer_id))
      if (!ins) throw new HTTPException(404, { message: 'Insurer not found' })
   }
    const [row] = await db.insert(consents).values({ rider_id: riderId, insurer_id: insurer_id ?? null }).returning()
    await audit(c.get('user').userId, 'consent.grant', 'rider', riderId, { insurer_id: insurer_id ?? 'any' })
    return c.json(row, 201)
 })
  .delete('/consents/:id', requireRider, validate('param', z.object({ id: z.uuid() })), async (c) => {
    const riderId = ownRider(c.get('access'))
    const [row] = await db
      .update(consents)
      .set({ revoked_at: new Date() })
      .where(and(eq(consents.id, c.req.valid('param').id), eq(consents.rider_id, riderId), isNull(consents.revoked_at)))
      .returning({ id: consents.id })
    if (!row) throw new HTTPException(404, { message: 'Active consent not found' })
    await audit(c.get('user').userId, 'consent.revoke', 'rider', riderId, { consent_id: row.id })
    return c.json({ ok: true })
 })

  .get('/quotes', requireRider, async (c) => {
    const riderId = ownRider(c.get('access'))
    return c.json(
      await db
        .select({
          id: quote_requests.id,
          insurer_id: quote_requests.insurer_id,
          insurer_name: insurers.name,
          status: quote_requests.status,
          premium_ksh: quote_requests.premium_ksh,
          created_at: quote_requests.created_at,
          decided_at: quote_requests.decided_at,
       })
        .from(quote_requests)
        .innerJoin(insurers, eq(insurers.id, quote_requests.insurer_id))
        .where(eq(quote_requests.rider_id, riderId))
        .orderBy(desc(quote_requests.created_at)),
    )
 })
  // Ask an insurer for a quote. Needs consent for that insurer and a current score, which is
  // snapshotted so the decision is made on the score the rider saw.
  .post('/quotes', requireRider, rateLimit({ name: 'quotes', max: 10, windowMs: DAY, by: 'user' }), validate('json', z.object({ insurer_id: z.uuid() })), async (c) => {
    const riderId = ownRider(c.get('access'))
    const { insurer_id } = c.req.valid('json')
    const [consent] = await db.select({ id: consents.id }).from(consents).where(activeConsentFor(riderId, insurer_id))
    if (!consent) throw new HTTPException(409, { message: 'Share your score with this insurer first' })
    const [score] = await db.select().from(rider_scores_current).where(eq(rider_scores_current.rider_id, riderId))
    if (!score) throw new HTTPException(409, { message: 'You need at least one scored week first' })
    const [pending] = await db
      .select({ id: quote_requests.id })
      .from(quote_requests)
      .where(and(eq(quote_requests.rider_id, riderId), eq(quote_requests.insurer_id, insurer_id), eq(quote_requests.status, 'pending')))
    if (pending) throw new HTTPException(409, { message: 'You already have a pending request with this insurer' })
    const snapshot = {
      week_start: score.week_start,
      score: score.score,
      tier: tierOf(score.score),
      coverage: score.coverage,
      confidence: score.confidence,
      braking: score.braking,
      cornering: score.cornering,
      acceleration: score.acceleration,
      night_exposure: score.night_exposure,
      route_risk: score.route_risk,
   }
    const [row] = await db.insert(quote_requests).values({ rider_id: riderId, insurer_id, score_snapshot: snapshot }).returning()
    await audit(c.get('user').userId, 'quote.request', 'rider', riderId, { insurer_id })
    return c.json(row, 201)
 })
