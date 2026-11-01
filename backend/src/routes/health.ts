import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { env } from '../env'

export const health = new Hono()
  .get('/', (c) => c.json({ status: 'ok', env: env.NODE_ENV, uptime: process.uptime() }))
  // Round trip to Postgres, to prove the database connection.
  .get('/db', async (c) => {
    const { rows } = await db.execute<{ now: string; version: string }>(
      sql`select now()::text as now, version() as version`,
    )
    return c.json({ status: 'ok', ...rows[0] })
  })
