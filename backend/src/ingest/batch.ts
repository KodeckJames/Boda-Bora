import { gunzipSync } from 'node:zlib'
import { z } from 'zod'

// The ride-mode upload written by the PWA (bodabora/lib/ride/upload.ts): gzipped NDJSON with
// one `session` line, then one `chunk` line per 5 s flush.

// [t, ax, ay, az, rotAlpha, rotBeta, rotGamma]: m/s² with gravity included, rotation in °/s.
const motionSample = z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()])
// [t, lat, lng, accuracyM, speedMs | null, heading | null]
const gpsFix = z.tuple([
  z.number(),
  z.number().min(-90).max(90),
  z.number().min(-180).max(180),
  z.number().min(0),
  z.number().nullable(),
  z.number().nullable(),
])

const sessionLine = z.object({
  type: z.literal('session'),
  id: z.string(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  gaps: z.array(z.object({ from: z.number(), to: z.number().optional() })).default([]),
})

const chunkLine = z.object({
  type: z.literal('chunk'),
  seq: z.number().int(),
  motion: z.array(motionSample),
  gps: z.array(gpsFix),
})

export type MotionSample = z.infer<typeof motionSample>
export type GpsFix = z.infer<typeof gpsFix>
export type RideBatch = {
  session: z.infer<typeof sessionLine>
  motion: MotionSample[]
  gps: GpsFix[]
}

const MAX_DECOMPRESSED_BYTES = 150 * 1024 * 1024 // ~10 h of ride mode is ~25 MB

// maxOutputLength guards against gzip bombs.
function gunzip(bytes: Uint8Array): string {
  try {
    return gunzipSync(bytes, { maxOutputLength: MAX_DECOMPRESSED_BYTES }).toString('utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') throw new Error('Upload is too large')
    throw new Error('Upload is not valid gzip')
  }
}

export async function parseBatch(gzipped: Uint8Array): Promise<RideBatch> {
  const lines = gunzip(gzipped).split('\n').filter((l) => l.trim())
  if (lines.length === 0) throw new Error('Upload is empty')
  const session = sessionLine.parse(JSON.parse(lines[0]!))
  const chunks = lines.slice(1).map((l) => chunkLine.parse(JSON.parse(l)))
  chunks.sort((a, b) => a.seq - b.seq)
  return {
    session,
    motion: chunks.flatMap((c) => c.motion).sort((a, b) => a[0] - b[0]),
    gps: chunks.flatMap((c) => c.gps).sort((a, b) => a[0] - b[0]),
  }
}
