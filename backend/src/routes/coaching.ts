import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { coachRider } from '../coaching/run'
import { db } from '../db/client'
import { coaching_messages } from '../db/schema'
import { assertCanViewRider, requireRole, withAccess, type AccessEnv } from '../lib/access'
import { audit } from '../lib/audit'
import { requireUser } from '../lib/auth'
import { validate } from '../lib/validate'
import { HOUR, rateLimit } from '../lib/rate-limit'

const riderParam = validate('param', z.object({ riderId: z.uuid() }))

// What riders see: the message text and focus. The fact pack stays server-side.
const publicFields = {
  id: coaching_messages.id,
  week_start: coaching_messages.week_start,
  message_sw: coaching_messages.message_sw,
  message_en: coaching_messages.message_en,
  focus: coaching_messages.focus,
  source: coaching_messages.source,
  status: coaching_messages.status,
  created_at: coaching_messages.created_at,
}

const history = (riderId: string, limit: number) =>
  db
    .select(publicFields)
    .from(coaching_messages)
    .where(eq(coaching_messages.rider_id, riderId))
    .orderBy(desc(coaching_messages.created_at))
    .limit(limit)

// Weekly Kiswahili coaching (written by the jobs function every Sunday evening).
export const coaching = new Hono<AccessEnv>()
  .use(requireUser, withAccess)
  // The signed-in rider's latest message and recent history.
  .get('/me', requireRole('rider'), async (c) => {
    const riderId = c.get('access').riderId
    if (!riderId) throw new HTTPException(409, { message: 'Finish rider registration first' })
    const messages = await history(riderId, 10)
    return c.json({ latest: messages[0] ?? null, history: messages })
  })
  .post('/me/:id/read', requireRole('rider'), validate('param', z.object({ id: z.uuid() })), async (c) => {
    const riderId = c.get('access').riderId
    if (!riderId) throw new HTTPException(409, { message: 'Finish rider registration first' })
    const [row] = await db
      .update(coaching_messages)
      .set({ status: 'read' })
      .where(and(eq(coaching_messages.id, c.req.valid('param').id), eq(coaching_messages.rider_id, riderId)))
      .returning({ id: coaching_messages.id })
    if (!row) throw new HTTPException(404, { message: 'Message not found' })
    return c.json({ ok: true })
  })
  // SACCO admins (their riders) and admins: a rider's coaching history.
  .get('/riders/:riderId', requireRole('sacco_admin', 'admin'), riderParam, async (c) => {
    const { riderId } = c.req.valid('param')
    await assertCanViewRider(c.get('access'), riderId)
    await audit(c.get('user').userId, 'coaching.view', 'rider', riderId)
    return c.json(await history(riderId, 20))
  })
  // Regenerate this week's message now (e.g. after new uploads).
  .post('/riders/:riderId/generate', requireRole('sacco_admin', 'admin'), rateLimit({ name: 'coach-generate', max: 30, windowMs: HOUR, by: 'user' }), riderParam, async (c) => {
    const { riderId } = c.req.valid('param')
    await assertCanViewRider(c.get('access'), riderId)
    const result = await coachRider(riderId, Date.now(), { force: true })
    if (result.status === 'skipped') throw new HTTPException(409, { message: `Can't coach yet: ${result.reason}` })
    await audit(c.get('user').userId, 'coaching.generate', 'rider', riderId, { source: result.source })
    const [latest] = await history(riderId, 1)
    return c.json({ ...result, message: latest }, 201)
  })
