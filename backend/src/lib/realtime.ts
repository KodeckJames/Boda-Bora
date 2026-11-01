import { createRealtime } from '@neon/realtime/server'
import { drizzleAdapter } from '@neon/realtime-drizzle'
import { env } from '../env'

// Seals live queries so the frontend can subscribe to them (e.g. a SACCO's live fleet view).
// The database name comes from the connection string's path.
const dbName = env.DATABASE_URL ? new URL(env.DATABASE_URL).pathname.slice(1) : 'neondb'

const secret = env.NEON_REALTIME_SECRET ?? env.REALTIME_SECRET

export const realtime = secret
  ? createRealtime({ secret, db: dbName, adapter: drizzleAdapter() })
  : undefined
