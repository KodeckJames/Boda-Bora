import { desc } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/client'
import { riders as ridersTable } from '../db/schema'
import { requireUser, type AuthEnv } from '../lib/auth'
import { notImplemented } from '../lib/errors'
import { realtime } from '../lib/realtime'

// Schema keys match column names, so the same query works for REST and Realtime.
const ridersList = () =>
  db.select().from(ridersTable).orderBy(desc(ridersTable.created_at)).limit(100)

// Rider profiles, scores and weekly traces.
export const riders = new Hono<AuthEnv>()
  // Riders' names and phones are personal data: never expose them without auth.
  .get('/', requireUser, async (c) => c.json(await ridersList())) // list riders
  // Sealed live query: the frontend subscribes to it with @neon/realtime for live updates.
  // TODO: scope to the caller's SACCO once memberships exist.
  .post('/live', requireUser, async (c) => {
    if (!realtime) throw new HTTPException(503, { message: 'Realtime is not configured' })
    return c.json(await realtime.seal({ query: ridersList() }))
  })
  .get('/:id', notImplemented) // rider profile
  .get('/:id/score', notImplemented) // current Rider Safety Score + sub-scores + coverage confidence
  .get('/:id/week', notImplemented) // weekly trace: events, hourly risk, route
  .get('/:id/trips', notImplemented) // recent trips
