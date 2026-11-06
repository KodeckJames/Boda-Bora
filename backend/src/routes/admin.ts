import { validate } from '../lib/validate'
import { HOUR, rateLimit } from '../lib/rate-limit'
import { asc, desc, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db/client'
import { blackspots, insurers, invites, saccos, stages } from '../db/schema'
import { requireRole, withAccess, type AccessEnv } from '../lib/access'
import { audit } from '../lib/audit'
import { requireUser } from '../lib/auth'
import { scoreRiderWeek } from '../scoring/run'

const lat = z.number().min(-90).max(90)
const lng = z.number().min(-180).max(180)

const staffInvite = z
  .object({
    email: z.email().transform((e) => e.toLowerCase()),
    role: z.enum(['sacco_admin', 'insurer_analyst', 'admin']),
    sacco_id: z.uuid().optional(),
    insurer_id: z.uuid().optional(),
  })
  .refine((v) => v.role !== 'sacco_admin' || v.sacco_id, { message: 'sacco_admin invites need sacco_id' })
  .refine((v) => v.role !== 'insurer_analyst' || v.insurer_id, {
    message: 'insurer_analyst invites need insurer_id',
  })

// Platform administration: organisations, staff invites and the blackspot list.
export const admin = new Hono<AccessEnv>()
  .use(requireUser, withAccess, requireRole('admin'))
  .get('/saccos', async (c) => c.json(await db.select().from(saccos).orderBy(asc(saccos.name))))
  .post(
    '/saccos',
    validate('json', z.object({ name: z.string().trim().min(2), county: z.string().trim().optional() })),
    async (c) => {
      const [row] = await db.insert(saccos).values(c.req.valid('json')).returning()
      await audit(c.get('user').userId, 'sacco.create', 'sacco', row!.id)
      return c.json(row, 201)
    },
  )
  .post(
    '/saccos/:saccoId/stages',
    validate('param', z.object({ saccoId: z.uuid() })),
    validate('json', z.object({ name: z.string().trim().min(2), lat: lat.optional(), lng: lng.optional() })),
    async (c) => {
      const { saccoId } = c.req.valid('param')
      const { name, lat: la, lng: lo } = c.req.valid('json')
      const [row] = await db
        .insert(stages)
        .values({ sacco_id: saccoId, name, location: la !== undefined && lo !== undefined ? { x: lo, y: la } : null })
        .returning()
      return c.json(row, 201)
    },
  )
  .get('/insurers', async (c) => c.json(await db.select().from(insurers).orderBy(asc(insurers.name))))
  .post('/insurers', validate('json', z.object({ name: z.string().trim().min(2) })), async (c) => {
    const [row] = await db.insert(insurers).values(c.req.valid('json')).returning()
    await audit(c.get('user').userId, 'insurer.create', 'insurer', row!.id)
    return c.json(row, 201)
  })
  .get('/invites', async (c) => c.json(await db.select().from(invites).orderBy(desc(invites.created_at))))
  // Staff invites: applied when someone signs in with Google using this (verified) email.
  .post('/invites', rateLimit({ name: 'admin-invites', max: 100, windowMs: HOUR, by: 'user' }), validate('json', staffInvite), async (c) => {
    const body = c.req.valid('json')
    const [row] = await db
      .insert(invites)
      .values({ ...body, invited_by: c.get('user').userId })
      .returning()
    await audit(c.get('user').userId, 'invite.create', 'invite', row!.id, { role: body.role })
    return c.json(row, 201)
  })
  .get('/blackspots', async (c) => c.json(await db.select().from(blackspots).orderBy(asc(blackspots.name))))
  .post(
    '/blackspots',
    validate(
      'json',
      z.object({
        name: z.string().trim().min(2),
        lat,
        lng,
        radius_m: z.number().int().min(25).max(2000).default(150),
        weight: z.number().min(0.1).max(5).default(1),
        source: z.string().trim().optional(),
      }),
    ),
    async (c) => {
      const { lat: la, lng: lo, ...rest } = c.req.valid('json')
      const [row] = await db
        .insert(blackspots)
        .values({ ...rest, location: { x: lo, y: la } })
        .returning()
      return c.json(row, 201)
    },
  )
  // Recompute a rider's weekly score now (the nightly job does this for everyone).
  .post(
    '/scores/recompute',
    validate('json', z.object({ rider_id: z.uuid(), at: z.iso.datetime().optional() })),
    async (c) => {
      const { rider_id, at } = c.req.valid('json')
      return c.json(await scoreRiderWeek(rider_id, at ? Date.parse(at) : Date.now()))
    },
  )
  // Quick integrity check that PostGIS answers, used by deploy smoke tests.
  .get('/postgis', async (c) => {
    const { rows } = await db.execute<{ v: string }>(sql`select postgis_version() as v`)
    if (!rows[0]) throw new HTTPException(500, { message: 'PostGIS unavailable' })
    return c.json({ postgis: rows[0].v })
  })
