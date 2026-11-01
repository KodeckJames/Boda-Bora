import { Hono } from 'hono'
import { notImplemented } from '../lib/errors'

// Trace ingestion from the phone app. Phones upload batches straight to object storage
// with a presigned URL; processing runs in the separate `ingest` function.
export const trips = new Hono()
  .post('/uploads', notImplemented) // presigned upload URL for a trace batch
  .get('/:id', notImplemented) // single trip detail
