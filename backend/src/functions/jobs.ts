import { parseTriggerDelivery } from '@neon/functions/triggers'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { coachWeek } from '../coaching/run'
import { deleteExpiredTraces, recoverStuckUploads } from '../maintenance/cleanup'
import { scoreRecent } from '../scoring/run'

// `jobs` Neon Function: scheduled work, called by cron triggers declared in neon.ts.
// Its URL is public, so every route only accepts genuine trigger deliveries.
const app = new Hono()

app.use(logger())

const fromTrigger = async (req: Request) => {
  const parsed = await parseTriggerDelivery(req)
  return parsed.ok && parsed.invocation.type === 'schedule' ? parsed.invocation : null
}

// Nightly: weekly scores, coverage and confidence for recently active riders.
app.post('/nightly-scores', async (c) => {
  const invocation = await fromTrigger(c.req.raw)
  if (!invocation) return c.json({ error: 'Trigger deliveries only' }, 401)
  const result = await scoreRecent()
  console.log('nightly-scores', JSON.stringify({ riders: result.riders, scored: result.scored }))
  return c.json({ riders: result.riders, scored: result.scored })
})

// Sunday evening: this week's coaching for every rider with a scored week. Scores first, so the
// message reflects today's uploads too.
app.post('/weekly-coaching', async (c) => {
  const invocation = await fromTrigger(c.req.raw)
  if (!invocation) return c.json({ error: 'Trigger deliveries only' }, 401)
  await scoreRecent()
  const result = await coachWeek()
  console.log('weekly-coaching', JSON.stringify(result))
  return c.json(result)
})

// Daily: retry uploads a trigger missed, expire unused upload URLs, apply raw-trace retention.
app.post('/daily-cleanup', async (c) => {
  const invocation = await fromTrigger(c.req.raw)
  if (!invocation) return c.json({ error: 'Trigger deliveries only' }, 401)
  const result = { uploads: await recoverStuckUploads(), retention: await deleteExpiredTraces() }
  console.log('daily-cleanup', JSON.stringify(result))
  return c.json(result)
})

app.get('/', (c) => c.json({ name: 'Boda Bora jobs' }))

export default app
