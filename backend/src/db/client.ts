import { attachDatabasePool } from '@neon/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '../env'
import * as schema from './schema'

// One pool per isolate, reused across requests. Keep max small: every isolate has its own.
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 5 })
// An idle connection dropped by the server emits 'error' on the pool; unhandled, it kills the process.
// The pool discards that client and opens a new one on the next query.
pool.on('error', (err) => console.error('pg pool: idle client error', err.message))
attachDatabasePool(pool)

export const db = drizzle(pool, { schema })
