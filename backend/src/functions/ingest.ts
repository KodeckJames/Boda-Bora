import { parseTriggerDelivery } from '@neon/functions/triggers'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { processUpload } from '../ingest/process'

// `ingest` Neon Function: called by the storage_object_created trigger on the `traces` bucket.
// Its URL is public, so it only trusts trigger deliveries (Neon's proxy strips client-supplied
// x-neon-* headers) and only processes object keys the API registered in upload_batches.
const app = new Hono()

app.use(logger())

app.post('/', async (c) => {
  const parsed = await parseTriggerDelivery(c.req.raw)
  if (!parsed.ok) return c.json({ error: parsed.error }, parsed.error === 'invalid_body' ? 400 : 401)
  const invocation = parsed.invocation
  if (invocation.type !== 'storage_object_created') return c.json({ error: 'Unexpected trigger type' }, 400)

  const { bucketName, objectKey } = invocation.data
  if (bucketName !== 'traces' || !objectKey.startsWith('batches/')) {
    return c.json({ status: 'skipped', reason: 'not a trace batch' })
  }
  const result = await processUpload(objectKey)
  console.log('ingest', objectKey, JSON.stringify(result))
  return c.json(result)
})

app.get('/', (c) => c.json({ name: 'Boda Bora ingest' }))

export default app
