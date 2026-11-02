import { desc } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/client'
import { riders as ridersTable } from '../db/schema'
import { requireRole, withAccess, type AccessEnv } from '../lib/access'
import { requireUser } from '../lib/auth'
import { notImplemented } from '../lib/errors'
import { realtime } from '../lib/realtime'

// Schema keys match column names, so the same query works for REST and Realtime.
const ridersList = () =>
  db.select().from(ridersTable).orderBy(desc(ridersTable.created_at)).limit(100)

// Rider profiles, scores and weekly traces. SACCO- and rider-scoped views come with the
// SACCO API; until then the full list is admin-only (names and phones are personal data).
export const riders = new Hono<AccessEnv>()
  .use(requireUser, withAccess)
  .get('/', requireRole('admin'), async (c) => c.json(await ridersList()))
  .post('/live', requireRole('admin'), async (c) => {
    if (!realtime) throw new HTTPException(503, { message: 'Realtime is not configured' })
    return c.json(await realtime.seal({ query: ridersList() }))
  })
  .get('/:id', notImplemented) // rider profile
  .get('/:id/score', notImplemented) // current Rider Safety Score + sub-scores + coverage confidence
  .get('/:id/week', notImplemented) // weekly trace: events, hourly risk, route
  .get('/:id/trips', notImplemented) // recent trips
