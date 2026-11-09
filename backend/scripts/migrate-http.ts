// Applies Drizzle migrations over Neon's SQL-over-HTTPS endpoint (port 443), for networks that
// block Postgres' port 5432. Same migrations table as `bun run db:migrate`, so they stay in step.
//   bun run db:migrate:http                       (branch in .env)
//   bun --env-file=.env.dev scripts/migrate-http.ts   (dev branch)
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set')
console.log(`migrating branch "${process.env.NEON_BRANCH ?? 'unknown'}" over HTTPS...`)
await migrate(drizzle(neon(url)), { migrationsFolder: './drizzle' })
const sql = neon(url)
const [row] = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`
console.log(`done: ${row!.n} migrations recorded`)
