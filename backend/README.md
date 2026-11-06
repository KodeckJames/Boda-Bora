# Boda Bora API

Backend for Boda Bora: phone-only telematics that turns real riding into a Rider Safety Score
SACCOs can act on and insurers can price on. Hono 4 + TypeScript on **Neon Functions**
(Node 24, Frankfurt), with Lakebase Postgres + PostGIS, Neon Auth (Google sign-in), Object
Storage, Realtime and the AI Gateway. Bun is used for local development and tests.

```
Rider PWA ──presigned PUT──▶ bucket `traces` ──trigger──▶ ingest ──▶ trips, risk events
    │                                                                  │
    └──── api (Hono) ◀── dashboards                jobs (cron) ◀───────┘
              ▲                                      ├─ 00:30 EAT nightly scores, coverage, confidence
              └── Realtime sealed live queries       ├─ Sun 19:00 EAT weekly Kiswahili coaching
                                                     └─ 03:00 EAT cleanup and 90-day raw retention
```

## Setup

```bash
bun install
neon link                       # once; writes .neon (gitignored)
bun run deploy                  # neon deploy --env .env: services, functions, triggers; pulls env into .env
bun run db:migrate              # apply Drizzle migrations (uses DATABASE_URL_UNPOOLED)
bun dev                         # local API on http://localhost:4000 against the linked branch
bun test                        # unit tests
bun run typecheck
```

Non-Neon settings live in `.env` (see [.env.example](.env.example)): `CORS_ORIGINS` and
`ADMIN_EMAILS` (verified Google emails that become admins on sign-in). Everything else in
`.env` is written by `neon deploy` / `neon env pull`. All `.env*` files except the example are
gitignored. **This repo is public: never commit them.**

### Working on a dev branch

Keep test data out of production with a Neon branch and its own env file:

```bash
neon branch create --name dev --parent production
neon deploy --branch dev --env .env --no-env-pull      # --no-env-pull keeps .env pointing at production
neon env pull --branch dev --file .env.dev             # then append PORT, CORS_ORIGINS, ADMIN_EMAILS
bun --env-file=.env.dev ./node_modules/.bin/drizzle-kit migrate
bun --env-file=.env.dev src/index.ts                   # local API against dev
bun --env-file=.env.dev scripts/seed-demo.ts           # synthetic DEMO fleet (refuses production)
```

## Functions

| Function | Trigger | Entry |
|---|---|---|
| `api` | HTTP | [src/app.ts](src/app.ts) |
| `ingest` | New object in `traces` under `batches/` | [src/functions/ingest.ts](src/functions/ingest.ts) |
| `jobs` | Cron: `nightly-scores`, `weekly-coaching`, `daily-cleanup` | [src/functions/jobs.ts](src/functions/jobs.ts) |

Function URLs are public. `ingest` and `jobs` only accept genuine trigger deliveries
(`parseTriggerDelivery`; Neon's proxy strips client-supplied `x-neon-*` headers), and
`ingest` only processes object keys the API registered.

## Auth and access

Sign-in is Google via Neon Auth. The frontend sends the Neon Auth JWT as
`Authorization: Bearer <token>`; the API checks signature, issuer and audience.

| Role | Gets it by | Sees |
|---|---|---|
| `rider` | Self-registration, or a SACCO invite to their Google email | Their own data |
| `sacco_admin` | Admin invite | Their SACCO's riders |
| `insurer_analyst` | Admin invite | Consented riders above the confidence bar, aggregated; never phones or traces |
| `admin` | `ADMIN_EMAILS` | Everything |

Invites apply only when the signed-in email is **verified** (Google emails always are).
Unknown or out-of-scope riders return 404. Views of rider data, consent changes and quote
decisions are written to `audit_log`.

## Scoring

Weekly (Monday 00:00 EAT) per rider, from [src/scoring/model.ts](src/scoring/model.ts):

- **Sub-scores 0–100**: braking, cornering, acceleration (severity-weighted events per
  100 km), night exposure (share of km 19:00–06:00), route risk (share of km near
  blackspots), each `100 / (1 + (rate / r50)^p)`. Weighted 30/25/15/15/15. Under 20 km: no score.
- **Coverage**: recorded ride-mode time inside SACCO shift records, minus app-closed gaps.
  `null` when there are no shift records.
- **Confidence**: coverage × √(km / 100), reduced for night hours the shifts include but the
  recordings skip, and for a score jump while coverage falls. No shift records: capped at 0.5.
  **Insurers only see confidence ≥ 0.6.**
- **Tiers**: A ≥ 85, B ≥ 70, C ≥ 55, D below.

Event detection ([src/ingest/events.ts](src/ingest/events.ts)) is orientation-independent:
braking and acceleration from GPS speed change with the IMU jolt as the measure, cornering from
gyro yaw about a median-tracked gravity vector. All thresholds are starting values to be
calibrated on the Thika Road field traces.

## Coaching

Weekly, from a fact pack (score, change, weakest sub-score, the riskiest event type × place ×
2-hour band, a target speed). Gemini via the AI Gateway writes Kiswahili + English JSON; output
is rejected if it fails the schema, exceeds 480 characters, or uses any number not in the
facts, and a deterministic template is used instead. No name or phone reaches the model.
The AI Gateway needs a paid Neon plan; until then `aiGateway` is commented out in
[neon.ts](neon.ts) and every message uses the template.

## API

All `/api/*` routes need a bearer token except `/api/health*`. Errors are `{ "error": "..." }`;
validation errors add `issues: [{ path, message }]`. Rate-limited routes return 429 with
`Retry-After` (limits are per Function isolate, so approximate).

### Me (any signed-in user)

| Method | Path | |
|---|---|---|
| GET | `/api/me` | Profile, role, rider record, SACCO and insurer ids |
| POST | `/api/me/rider` | Self-register as a rider `{ name, phone, bike_reg? }` |
| GET / POST | `/api/me/consents` | List / grant `{ insurer_id? }` (omit = any partner insurer) |
| DELETE | `/api/me/consents/:id` | Revoke |
| GET / POST | `/api/me/quotes` | List / request `{ insurer_id }` (needs consent and a scored week) |

### Riders (the rider, their SACCO admins, admins)

| Method | Path | |
|---|---|---|
| GET | `/api/riders/:id` | Profile with SACCO and stage |
| GET | `/api/riders/:id/score` | Current score, tier, last 8 weeks |
| GET | `/api/riders/:id/week?week=YYYY-MM-DD` | Score, events, 7×24 hourly risk, GeoJSON trips, coverage by day |
| GET | `/api/riders/:id/trips?limit=` | Recent trips with event counts |
| GET / POST | `/api/riders`, `/api/riders/live` | All riders / sealed live query (admins) |

### Trips and coaching

| Method | Path | |
|---|---|---|
| POST | `/api/trips/uploads` | Rider: register a batch and get a presigned PUT URL |
| GET | `/api/coaching/me` | Rider: latest message and history |
| POST | `/api/coaching/me/:id/read` | Rider: mark read |
| GET | `/api/coaching/riders/:riderId` | SACCO admin / admin: history |
| POST | `/api/coaching/riders/:riderId/generate` | SACCO admin / admin: regenerate this week |

### SACCO (`sacco_admin` of that SACCO, or admin)

| Method | Path | |
|---|---|---|
| GET | `/api/sacco/:saccoId` | SACCO and stages |
| POST | `/api/sacco/:saccoId/stages` | `{ name, lat?, lng? }` |
| GET | `/api/sacco/:saccoId/fleet` | Stats and every rider's score, tier, coverage, flags, trend |
| GET | `/api/sacco/:saccoId/flags` | Riders needing attention, with reasons |
| POST | `/api/sacco/:saccoId/riders` | Register `{ name, phone, bike_reg?, stage_id?, email? }` (email = Google invite) |
| POST | `/api/sacco/:saccoId/riders/invite` | Invite a self-registered rider `{ email }` |
| GET | `/api/sacco/:saccoId/shifts?from=&to=` | Shift records |
| POST | `/api/sacco/:saccoId/shifts` | `{ shifts: [{ rider_id or phone, starts_at, ends_at }] }`, ≤ 2000 |
| POST | `/api/sacco/:saccoId/shifts/csv` | `text/csv` with header `phone,starts_at,ends_at` |
| POST | `/api/sacco/:saccoId/live` | Sealed live fleet query |

Shift uploads save valid rows and return `{ saved, rejected: [{ index, reason }] }`.

### Insurer (`insurer_analyst` of that insurer, or admin)

| Method | Path | |
|---|---|---|
| GET | `/api/insurer` | Partner insurers (any signed-in user, for consent screens) |
| GET | `/api/insurer/:insurerId/tiers` | Eligible riders per tier, count below the confidence bar |
| GET | `/api/insurer/:insurerId/distribution` | Score histogram (10-point buckets) |
| GET | `/api/insurer/:insurerId/quotes?status=` | Quote queue: name, SACCO, snapshot and current score, no phone |
| POST | `/api/insurer/:insurerId/quotes/:quoteId/decision` | `{ decision: quoted \| referred \| declined, premium_ksh?, notes? }` |
| POST | `/api/insurer/:insurerId/live` | Sealed live query of pending quotes |

Quoting re-checks consent and confidence at decision time.

### Admin

| Method | Path | |
|---|---|---|
| GET / POST | `/api/admin/saccos`, `/api/admin/insurers` | Organisations |
| POST | `/api/admin/saccos/:saccoId/stages` | Stages |
| GET / POST | `/api/admin/invites` | Staff invites `{ email, role, sacco_id \| insurer_id }` |
| GET / POST | `/api/admin/blackspots` | `{ name, lat, lng, radius_m?, weight?, source? }` |
| POST | `/api/admin/scores/recompute` | `{ rider_id, at? }` |

### Health

`GET /api/health`, `GET /api/health/db`.

`POST /ussd` is a placeholder: USSD will run on Tiara Connect (JSON callback with `msisdn`,
`sessionId`, `input`, `serviceCode`; reply `{ text, responseType: CON | END }`), not built yet.

## Typed client

Routes are chained, so the frontend can use Hono's RPC client:

```ts
import { hc } from 'hono/client'
import type { AppType } from '../backend/src/app'

const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!, { headers: async () => ({ authorization: `Bearer ${await getToken()}` }) })
```

## Layout

```
neon.ts              Neon services, functions and triggers
drizzle/             SQL migrations
scripts/             bucket CORS, demo seed
src/
  app.ts             api function: middleware and routes
  functions/         ingest and jobs entry points
  routes/            one router per area
  ingest/            upload parsing, trip segmentation, event detection
  scoring/           score model and weekly runs
  coaching/          fact pack, AI generation with guardrails, template
  maintenance/       retention and upload recovery
  lib/               auth, access, consent, rate limits, storage, AI, realtime, validation
  db/                Drizzle schema, PostGIS column types, pool
  dev/               ride simulator (tests and demo data only)
```
