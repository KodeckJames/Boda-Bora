import { attachDatabasePool } from '@neon/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from '../env'
import * as schema from './schema'

// One pool per isolate, reused across requests. Keep max small: every isolate has its own.
const pool = new Pool({ connectionString: env.DATABASE_URL, max: 5 })
attachDatabasePool(pool)

export const db = drizzle(pool, { schema })
