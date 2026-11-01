import { Hono } from 'hono'
import { requireUser, type AuthEnv } from '../lib/auth'
import { notImplemented } from '../lib/errors'
import { traces } from '../lib/storage'

// Trace ingestion from the phone app. Phones upload batches straight to object storage
// with a presigned URL; processing runs in the separate `ingest` function.
export const trips = new Hono<AuthEnv>()
  .post('/uploads', requireUser, async (c) => {
    const key = `batches/${c.get('userId')}/${crypto.randomUUID()}.ndjson.gz`
    const upload = await traces.signedUploadUrl(key, { expiresIn: 600 })
    return c.json({ key, upload }, 201)
  })
  .get('/:id', notImplemented) // single trip detail
