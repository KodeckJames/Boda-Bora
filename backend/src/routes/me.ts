import { validate } from '../lib/validate'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client'
import { profiles, riders } from '../db/schema'
import { withAccess, type AccessEnv } from '../lib/access'
import { audit } from '../lib/audit'
import { requireUser } from '../lib/auth'
import { kenyanPhone } from '../lib/phone'

const riderSignup = z.object({
  name: z.string().trim().min(2).max(100),
  phone: kenyanPhone,
  bike_reg: z.string().trim().toUpperCase().max(20).optional(),
})

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
  // Self-registration for riders who aren't with a SACCO yet. SACCO-registered riders are
  // linked by invite instead, so nobody can claim another rider's record by typing their phone.
  .post('/rider', validate('json', riderSignup), async (c) => {
    const access = c.get('access')
    if (access.riderId) throw new HTTPException(409, { message: 'You are already registered as a rider' })
    if (access.profile.role && access.profile.role !== 'rider') {
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
      await tx.update(profiles).set({ role: 'rider' }).where(eq(profiles.user_id, userId))
      const [row] = await tx
        .insert(riders)
        .values({ user_id: userId, name: body.name, phone: body.phone, bike_reg: body.bike_reg })
        .returning()
      return row!
    })
    await audit(userId, 'rider.self_register', 'rider', rider.id)
    return c.json(rider, 201)
  })
