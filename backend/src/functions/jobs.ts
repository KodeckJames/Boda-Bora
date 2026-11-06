import { parseTriggerDelivery } from '@neon/functions/triggers'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
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

app.get('/', (c) => c.json({ name: 'Boda Bora jobs' }))

export default app
