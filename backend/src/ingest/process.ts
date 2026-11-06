import { eq, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { blackspots, risk_events, trips, upload_batches } from '../db/schema'
import { traces } from '../lib/storage'
import { parseBatch } from './batch'
import { detectEvents, type DetectedEvent } from './events'
import { distanceM, simplify, type LatLng } from './geo'
import { cleanGps, segmentTrips, type TripSegment } from './trips'

type Blackspot = { id: string; lat: number; lng: number; radius_m: number }

export type IngestResult =
  | { status: 'processed'; batchId: string; trips: number; events: number }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; batchId: string; error: string }

async function blackspotsNear(points: LatLng[]): Promise<Blackspot[]> {
  if (points.length === 0) return []
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const pad = 0.02 // ~2 km, larger than any blackspot radius
  const { rows } = await db.execute<Blackspot>(sql`
    select id, ST_Y(location) as lat, ST_X(location) as lng, radius_m
    from ${blackspots}
    where location && ST_MakeEnvelope(${Math.min(...lngs) - pad}, ${Math.min(...lats) - pad},
                                      ${Math.max(...lngs) + pad}, ${Math.max(...lats) + pad}, 4326)`)
  return rows
}

function nearestBlackspot(p: LatLng, spots: Blackspot[]) {
  let best: { id: string; d: number } | null = null
  for (const s of spots) {
    const d = distanceM(p, s)
    if (d <= s.radius_m && (!best || d < best.d)) best = { id: s.id, d }
  }
  return best?.id ?? null
}

// Distance ridden inside any blackspot radius (route risk input).
function blackspotDistance(trip: TripSegment, spots: Blackspot[]) {
  if (spots.length === 0) return 0
  let m = 0
  for (let i = 1; i < trip.points.length; i++) {
    const p = trip.points[i]!
    if (nearestBlackspot(p, spots)) m += distanceM(trip.points[i - 1]!, p)
  }
  return m
}

const toWkt = (points: LatLng[]) =>
  `LINESTRING(${points.map((p) => `${p.lng.toFixed(6)} ${p.lat.toFixed(6)}`).join(',')})`

// Processes one uploaded ride-mode batch end to end. Safe to call more than once per key.
export async function processUpload(objectKey: string): Promise<IngestResult> {
  const [batch] = await db.select().from(upload_batches).where(eq(upload_batches.object_key, objectKey))
  // Only keys the API handed out are processed; anything else in the bucket is ignored.
  if (!batch) return { status: 'skipped', reason: 'unknown object key' }
  if (batch.status === 'processed') return { status: 'skipped', reason: 'already processed' }

  await db.update(upload_batches).set({ status: 'processing', error: null }).where(eq(upload_batches.id, batch.id))
  try {
    const file = await traces.download(objectKey)
    const ride = await parseBatch(new Uint8Array(await file.arrayBuffer()))
    const segments = segmentTrips(cleanGps(ride.gps))
    const spots = await blackspotsNear(segments.flatMap((s) => s.points))

    let eventCount = 0
    await db.transaction(async (tx) => {
      await tx.delete(trips).where(eq(trips.batch_id, batch.id)) // reprocessing replaces earlier output
      // Trip ids are generated here so trips and their events go in as one insert each,
      // rather than one round trip per trip.
      const tripRows = segments.map((seg) => {
        const path = simplify(seg.points, 15)
        return {
          id: crypto.randomUUID(),
          rider_id: batch.rider_id,
          batch_id: batch.id,
          started_at: new Date(seg.startedAt),
          ended_at: new Date(seg.endedAt),
          distance_m: seg.distanceM,
          night_m: seg.nightM,
          blackspot_m: blackspotDistance(seg, spots),
          max_speed_kmh: seg.maxSpeedKmh,
          path: path.length >= 2 ? sql`ST_GeomFromText(${toWkt(path)}::text, 4326)` : null,
        }
      })
      const eventRows = segments.flatMap((seg, i) =>
        detectEvents(seg.points, ride.motion).map((e: DetectedEvent) => ({
          trip_id: tripRows[i]!.id,
          rider_id: batch.rider_id,
          type: e.type,
          severity: e.severity,
          occurred_at: new Date(e.t),
          location: { x: e.lng, y: e.lat },
          speed_kmh: e.speedKmh,
          magnitude_g: e.magnitudeG,
          blackspot_id: nearestBlackspot(e, spots),
        })),
      )
      if (tripRows.length > 0) await tx.insert(trips).values(tripRows)
      if (eventRows.length > 0) await tx.insert(risk_events).values(eventRows)
      eventCount = eventRows.length
      await tx
        .update(upload_batches)
        .set({
          status: 'processed',
          session_started_at: new Date(ride.session.startedAt),
          session_ended_at: ride.session.endedAt ? new Date(ride.session.endedAt) : null,
          gaps: ride.session.gaps,
          processed_at: new Date(),
        })
        .where(eq(upload_batches.id, batch.id))
    })
    return { status: 'processed', batchId: batch.id, trips: segments.length, events: eventCount }
  } catch (err) {
    // Drizzle wraps database errors; the Postgres message is on `cause`.
    const e = err as Error & { cause?: { message?: string } }
    const error = (e.cause?.message ?? e.message).slice(0, 500)
    await db.update(upload_batches).set({ status: 'failed', error }).where(eq(upload_batches.id, batch.id))
    return { status: 'failed', batchId: batch.id, error }
  }
}
