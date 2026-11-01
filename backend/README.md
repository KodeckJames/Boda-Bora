# Boda Bora API

Hono 4 + TypeScript, run with Bun locally. Deployment target is Neon Functions (Node 24).

```bash
bun install
cp .env.example .env   # then fill in values
bun dev                # http://localhost:4000, hot reload
bun run typecheck
bun run routes         # list routes with Hono CLI
```

## Neon

Deployed as the `api` Neon Function (Frankfurt), declared in [neon.ts](neon.ts). Get its URL with `neon functions get api` (`invocation_url`).

```bash
bun run deploy         # neon deploy --env .env: applies neon.ts, deploys the function, pulls env
bun run db:generate    # create a migration from src/db/schema.ts
bun run db:migrate     # apply migrations (uses DATABASE_URL_UNPOOLED)
```

| Service | Wired in | Notes |
|---|---|---|
| Postgres | `src/db/` (Drizzle + `pg` pool) | `GET /api/health/db`, `GET /api/riders` |
| Auth (Managed Better Auth) | `src/lib/auth.ts` | `requireUser` verifies the JWT against `NEON_AUTH_JWKS_URL` |
| Object Storage | `src/lib/storage.ts` (Files SDK, bucket `traces`) | `POST /api/trips/uploads` returns a presigned PUT URL |
| Realtime | `src/lib/realtime.ts` | `POST /api/riders/live` returns a sealed live query |
| AI Gateway | `src/lib/ai.ts` | Commented out in `neon.ts` until the org is on a paid plan |

Test requests without starting a server:

```bash
npx hono request /api/health src/app.ts
```

On Git Bash, prefix with `MSYS_NO_PATHCONV=1` so `/api/...` isn't rewritten into a Windows path.

## Routes

Feature routes return `501 Not implemented` until the logic is written; health and the USSD welcome menu respond.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/riders`, `/api/riders/:id` | Rider list / profile |
| GET | `/api/riders/:id/score` | Rider Safety Score, sub-scores, coverage confidence |
| GET | `/api/riders/:id/week` | Weekly trace: events, hourly risk, route |
| GET | `/api/riders/:id/trips` | Recent trips |
| POST | `/api/trips/uploads` | Presigned URL for uploading a trace batch to object storage |
| GET | `/api/trips/:id` | Trip detail |
| GET | `/api/coaching/:riderId` | Latest Kiswahili coaching message |
| POST | `/api/coaching/:riderId/generate` | Regenerate with Gemini |
| POST | `/api/coaching/:riderId/send` | Send via SMS |
| GET | `/api/sacco/:saccoId/fleet` | Fleet stats and riders |
| GET | `/api/sacco/:saccoId/flags` | Riders needing attention |
| POST | `/api/sacco/:saccoId/shifts` | Upload shift records (coverage cross-check) |
| GET | `/api/insurer/tiers`, `/distribution`, `/quotes` | Underwriting data |
| POST | `/api/insurer/quotes/:quoteId/decision` | Accept / refer a quote |
| POST | `/ussd` | Africa's Talking USSD callback (form-encoded, replies `CON`/`END` text) |

## Layout

```
src/
  index.ts      Bun entry (port from env)
  app.ts        middleware (logger, secure headers, CORS), route mounting, AppType export
  env.ts        environment variables, validated with zod
  lib/errors.ts 404, error handler, notImplemented stub
  routes/       one router per feature area, chained for typed RPC
```

The frontend can call the API with a typed client:

```ts
import { hc } from 'hono/client'
import type { AppType } from '../backend/src/app'

const api = hc<AppType>('http://localhost:4000')
```
