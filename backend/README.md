# Boda Bora API

Express 5 + TypeScript, run with Bun.

```bash
bun install
cp .env.example .env   # then fill in values
bun dev                # http://localhost:4000, restarts on change
bun run typecheck
```

## Routes

All feature routes currently return `501 Not implemented`; only health and the USSD welcome menu respond.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/riders`, `/api/riders/:id` | Rider list / profile |
| GET | `/api/riders/:id/score` | Rider Safety Score, sub-scores, coverage confidence |
| GET | `/api/riders/:id/week` | Weekly trace: events, hourly risk, route |
| GET | `/api/riders/:id/trips` | Recent trips |
| POST | `/api/trips/batch` | Upload batched sensor traces from the phone |
| GET | `/api/trips/:id` | Trip detail |
| GET | `/api/coaching/:riderId` | Latest Kiswahili coaching message |
| POST | `/api/coaching/:riderId/generate` | Regenerate with Gemini |
| POST | `/api/coaching/:riderId/send` | Send via SMS |
| GET | `/api/sacco/:saccoId/fleet` | Fleet stats and riders |
| GET | `/api/sacco/:saccoId/flags` | Riders needing attention |
| POST | `/api/sacco/:saccoId/shifts` | Upload shift records (coverage cross-check) |
| GET | `/api/insurer/tiers`, `/distribution`, `/quotes` | Underwriting data |
| POST | `/api/insurer/quotes/:quoteId/decision` | Accept / refer a quote |
| POST | `/ussd` | USSD gateway callback (form-encoded, replies `CON`/`END` text) |

## Layout

```
src/
  index.ts          starts the server
  app.ts            middleware (helmet, cors, morgan, body parsers) and route mounting
  config.ts         environment variables
  middleware/       404, error handler, notImplemented stub
  routes/           one router per feature area
```
