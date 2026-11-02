import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/client'
import { upload_batches } from '../db/schema'
import { requireRole, withAccess, type AccessEnv } from '../lib/access'
import { requireUser } from '../lib/auth'
import { notImplemented } from '../lib/errors'
import { traces } from '../lib/storage'

// Trace ingestion from the rider PWA. The phone uploads a batch straight to object storage
// with a presigned URL; the `ingest` function processes it when the object lands.
export const trips = new Hono<AccessEnv>()
  .use(requireUser, withAccess)
  .post('/uploads', requireRole('rider'), async (c) => {
    const riderId = c.get('access').riderId
    if (!riderId) throw new HTTPException(409, { message: 'Finish rider registration first' })
    const key = `batches/${riderId}/${crypto.randomUUID()}.ndjson.gz`
    // Registered before the upload, so ingest only processes objects the API handed out.
    await db.insert(upload_batches).values({ rider_id: riderId, object_key: key })
    const upload = await traces.signedUploadUrl(key, { expiresIn: 600 })
    return c.json({ key, upload }, 201)
  })
  .get('/:id', notImplemented) // single trip detail
