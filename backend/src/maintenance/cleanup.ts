import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm'
import { db } from '../db/client'
import { upload_batches } from '../db/schema'
import { processUpload } from '../ingest/process'
import { traces } from '../lib/storage'

export const RETENTION = {
  rawTraceDays: 90, // raw sensor traces; trips, events and scores are kept
  retryAfterMs: 3600_000, // a batch still unprocessed after an hour is retried (missed trigger)
  abandonAfterMs: 24 * 3600_000, // an upload URL never used within a day is expired
  perRun: 500,
}

// Recovers uploads whose trigger never fired or whose processing died, and expires
// registrations the phone never uploaded to.
export async function recoverStuckUploads(now = Date.now()) {
  const stuck = await db
    .select({ id: upload_batches.id, object_key: upload_batches.object_key, status: upload_batches.status, created_at: upload_batches.created_at })
    .from(upload_batches)
    .where(and(inArray(upload_batches.status, ['received', 'processing']), lt(upload_batches.created_at, new Date(now - RETENTION.retryAfterMs))))
    .limit(RETENTION.perRun)

  let retried = 0
  let expired = 0
  for (const b of stuck) {
    if (await traces.exists(b.object_key)) {
      await processUpload(b.object_key)
      retried++
    } else if (now - b.created_at.getTime() > RETENTION.abandonAfterMs) {
      await db
        .update(upload_batches)
        .set({ status: 'failed', error: 'Upload never completed' })
        .where(eq(upload_batches.id, b.id))
      expired++
    }
  }
  return { checked: stuck.length, retried, expired }
}

// Deletes raw trace files past retention. The batch row stays, marked raw_deleted_at.
export async function deleteExpiredTraces(now = Date.now()) {
  const cutoff = new Date(now - RETENTION.rawTraceDays * 86_400_000)
  const old = await db
    .select({ id: upload_batches.id, object_key: upload_batches.object_key })
    .from(upload_batches)
    .where(
      and(
        isNull(upload_batches.raw_deleted_at),
        lt(upload_batches.created_at, cutoff),
        or(eq(upload_batches.status, 'processed'), eq(upload_batches.status, 'failed')),
      ),
    )
    .limit(RETENTION.perRun)

  let deleted = 0
  for (const b of old) {
    try {
      if (await traces.exists(b.object_key)) await traces.delete(b.object_key)
      await db.update(upload_batches).set({ raw_deleted_at: new Date() }).where(eq(upload_batches.id, b.id))
      deleted++
    } catch (err) {
      console.error('trace delete failed', b.object_key, (err as Error).message)
    }
  }
  return { due: old.length, deleted }
}
