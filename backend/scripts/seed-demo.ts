// Demo fleet for presentations and frontend work. SYNTHETIC DATA, clearly labelled DEMO.
// Real validation uses the Thika Road field traces, never this.
//
//   bun --env-file=.env.dev scripts/seed-demo.ts            seed the dev branch
//   bun --env-file=.env.dev scripts/seed-demo.ts --reset    remove the demo data first
//   add --production to run against the production branch (refused otherwise)
import { gzipSync } from 'node:zlib'
import { eq, inArray, like } from 'drizzle-orm'
import { coachRider } from '../src/coaching/run'
import { db } from '../src/db/client'
import { blackspots, consents, insurers, quote_requests, riders, saccos, shifts, stages, upload_batches } from '../src/db/schema'
import { simulateRide, type Phase } from '../src/dev/simulate'
import { processUpload } from '../src/ingest/process'
import { traces } from '../src/lib/storage'
import { tierOf, weekOf } from '../src/scoring/model'
import { scoreRiderWeek } from '../src/scoring/run'

const args = new Set(process.argv.slice(2))
if (process.env.NEON_BRANCH === 'production' && !args.has('--production')) {
  console.error('Refusing to seed the production branch. Pass --production if you really mean it.')
  process.exit(1)
}

const H = 3600_000
const D = 24 * H
const PREFIX = 'DEMO'

// Approximate Thika Road corridor locations, for demo maps only.
const PLACES = {
  roysambu: { lat: -1.218, lng: 36.889 },
  githurai: { lat: -1.1947, lng: 36.9133 },
  kasarani: { lat: -1.2232, lng: 36.897 },
  kahawa: { lat: -1.186, lng: 36.9 },
}

async function reset() {
  const demoRiders = await db.select({ id: riders.id }).from(riders).where(like(riders.name, `${PREFIX} %`))
  const ids = demoRiders.map((r) => r.id)
  if (ids.length) {
    const keys = await db.select({ k: upload_batches.object_key }).from(upload_batches).where(inArray(upload_batches.rider_id, ids))
    for (const { k } of keys) await traces.delete(k).catch(() => {})
    await db.delete(riders).where(inArray(riders.id, ids)) // cascades to trips, events, scores, coaching, consents...
  }
  await db.delete(saccos).where(like(saccos.name, `${PREFIX} %`))
  await db.delete(insurers).where(like(insurers.name, `${PREFIX} %`))
  await db.delete(blackspots).where(eq(blackspots.source, 'demo (approximate location)'))
  console.log(`reset: removed ${ids.length} demo riders`)
}

if (args.has('--reset')) await reset()
const [existing] = await db.select({ id: saccos.id }).from(saccos).where(like(saccos.name, `${PREFIX} %`))
if (existing) {
  console.log('Demo data already exists. Run with --reset to recreate it.')
  process.exit(0)
}

// ---------- Organisations and places ----------
const [sacco] = await db.insert(saccos).values({ name: `${PREFIX} Roysambu Boda SACCO`, county: 'Nairobi' }).returning()
const stageRows = await db
  .insert(stages)
  .values([
    { sacco_id: sacco!.id, name: `${PREFIX} Roysambu stage`, location: { x: PLACES.roysambu.lng, y: PLACES.roysambu.lat } },
    { sacco_id: sacco!.id, name: `${PREFIX} Kahawa West stage`, location: { x: PLACES.kahawa.lng, y: PLACES.kahawa.lat } },
  ])
  .returning()
await db.insert(blackspots).values([
  { name: 'Githurai 45 roundabout', location: { x: PLACES.githurai.lng, y: PLACES.githurai.lat }, radius_m: 250, weight: 1.5, source: 'demo (approximate location)' },
  { name: 'Kasarani exit ramp', location: { x: PLACES.kasarani.lng, y: PLACES.kasarani.lat }, radius_m: 200, source: 'demo (approximate location)' },
])
const [insurer] = await db.insert(insurers).values({ name: `${PREFIX} Bima Bora Insurance` }).returning()

// ---------- Riding patterns ----------
type Profile = {
  name: string
  sacco: boolean
  shift: { startHourEat: number; hours: number; rideOffsetHours?: number }
  // per week (index 0 = earlier week): harsh events per day, and the share of the shift recorded
  weeks: { brakes: number; corners: number; recordedShare: number; at: keyof typeof PLACES }[]
}
const profiles: Profile[] = [
  { name: 'Careful Wanjiru', sacco: true, shift: { startHourEat: 7, hours: 9 }, weeks: [{ brakes: 0, corners: 0, recordedShare: 1, at: 'roysambu' }, { brakes: 0, corners: 0, recordedShare: 1, at: 'roysambu' }] },
  { name: 'Evening Kevin', sacco: true, shift: { startHourEat: 18, hours: 6 }, weeks: [{ brakes: 1, corners: 0, recordedShare: 0.95, at: 'githurai' }, { brakes: 2, corners: 0, recordedShare: 0.95, at: 'githurai' }] },
  { name: 'Night Otieno', sacco: true, shift: { startHourEat: 18, hours: 8, rideOffsetHours: 3 }, weeks: [{ brakes: 0, corners: 1, recordedShare: 0.9, at: 'kasarani' }, { brakes: 0, corners: 1, recordedShare: 0.9, at: 'kasarani' }] },
  { name: 'Gaming Mutua', sacco: true, shift: { startHourEat: 7, hours: 10 }, weeks: [{ brakes: 2, corners: 1, recordedShare: 1, at: 'githurai' }, { brakes: 0, corners: 0, recordedShare: 0.3, at: 'roysambu' }] },
  { name: 'Risky Peter', sacco: true, shift: { startHourEat: 9, hours: 9 }, weeks: [{ brakes: 4, corners: 3, recordedShare: 1, at: 'githurai' }, { brakes: 5, corners: 3, recordedShare: 1, at: 'kasarani' }] },
  { name: 'Independent Achieng', sacco: false, shift: { startHourEat: 8, hours: 8 }, weeks: [{ brakes: 0, corners: 1, recordedShare: 1, at: 'kahawa' }, { brakes: 1, corners: 0, recordedShare: 1, at: 'kahawa' }] },
]

const calm = (): Phase[] => [
  { kind: 'speed', toKmh: 38, accelG: 0.12 },
  { kind: 'cruise', seconds: 360 },
  { kind: 'turn', degrees: 70, radiusM: 70 },
  { kind: 'cruise', seconds: 240 },
  { kind: 'speed', toKmh: 0, accelG: -0.15 },
  { kind: 'stop', seconds: 240 },
]
const hardBrake = (): Phase[] => [
  { kind: 'speed', toKmh: 48, accelG: 0.15 },
  { kind: 'cruise', seconds: 40 },
  { kind: 'speed', toKmh: 8, accelG: -0.55 },
  { kind: 'cruise', seconds: 60 },
  { kind: 'speed', toKmh: 0, accelG: -0.15 },
  { kind: 'stop', seconds: 240 },
]
const sharpCorner = (): Phase[] => [
  { kind: 'speed', toKmh: 36, accelG: 0.12 },
  { kind: 'cruise', seconds: 40 },
  { kind: 'turn', degrees: 90, radiusM: 18 },
  { kind: 'cruise', seconds: 60 },
  { kind: 'speed', toKmh: 0, accelG: -0.15 },
  { kind: 'stop', seconds: 240 },
]

// Starts ~520 m short of a place, heading at it, so the first manoeuvre lands near it.
const approach = (p: { lat: number; lng: number }) => ({ lat: p.lat - 0.0047 * Math.cos(Math.PI / 4), lng: p.lng - 0.0047 * Math.sin(Math.PI / 4) })

// The two most recently completed weeks.
const thisWeek = weekOf(Date.now())
const weekStarts = [thisWeek.from - 14 * D, thisWeek.from - 7 * D]

let uploads = 0
for (const [i, p] of profiles.entries()) {
  const [rider] = await db
    .insert(riders)
    .values({
      name: `${PREFIX} ${p.name}`,
      phone: `+2547000000${String(i + 10)}`,
      bike_reg: `KMDEMO ${100 + i}`,
      sacco_id: p.sacco ? sacco!.id : null,
      stage_id: p.sacco ? stageRows[i % stageRows.length]!.id : null,
    })
    .returning()

  for (const [w, weekStart] of weekStarts.entries()) {
    const pattern = p.weeks[w]!
    for (let day = 0; day < 6; day++) {
      const shiftStart = weekStart + day * D + p.shift.startHourEat * H
      const shiftEnd = shiftStart + p.shift.hours * H
      if (p.sacco) {
        await db.insert(shifts).values({ rider_id: rider!.id, sacco_id: sacco!.id, starts_at: new Date(shiftStart), ends_at: new Date(shiftEnd), source: 'sacco_upload' })
      }
      // Manoeuvres first (near the pattern's place), then calm riding.
      const phases: Phase[] = [
        ...Array.from({ length: pattern.brakes }, hardBrake).flat(),
        ...Array.from({ length: pattern.corners }, sharpCorner).flat(),
        ...Array.from({ length: 4 }, calm).flat(),
      ]
      const recordedEnd = shiftStart + pattern.recordedShare * (shiftEnd - shiftStart)
      const ride = simulateRide({ start: approach(PLACES[pattern.at]), startMs: shiftStart + (p.shift.rideOffsetHours ?? 0) * H, startKmh: 0, headingDeg: 45, phases, orientation: { yaw: 0.4 * i, pitch: 1.1, roll: -0.3 } })
      const keep = <T extends [number, ...unknown[]]>(xs: T[]) => xs.filter((x) => x[0] <= recordedEnd)
      const key = `seed/${rider!.id}/${new Date(shiftStart).toISOString().slice(0, 10)}.ndjson.gz`
      const body = gzipSync(
        [
          JSON.stringify({ type: 'session', id: `demo-${i}-${w}-${day}`, startedAt: shiftStart, endedAt: recordedEnd, gaps: [] }),
          JSON.stringify({ type: 'chunk', seq: 0, motion: keep(ride.motion), gps: keep(ride.gps) }),
        ].join('\n'),
      )
      // seed/ keys don't fire the storage trigger; processed directly below.
      await db.insert(upload_batches).values({ rider_id: rider!.id, object_key: key })
      await traces.upload(key, body, { contentType: 'application/gzip' })
      const result = await processUpload(key)
      if (result.status !== 'processed') console.warn('ingest', key, result)
      uploads++
    }
    await scoreRiderWeek(rider!.id, weekStart + 3 * D)
  }
  await coachRider(rider!.id, weekStarts[1]! + 3 * D, { force: true })

  // Most riders share their score with the demo insurer; some ask for a quote.
  if (p.name !== 'Risky Peter') await db.insert(consents).values({ rider_id: rider!.id, insurer_id: insurer!.id })
}

// Quote requests from the consented riders, with their current score snapshot.
const demo = await db
  .select({ id: riders.id, name: riders.name })
  .from(riders)
  .where(like(riders.name, `${PREFIX} %`))
const { rider_scores_current } = await import('../src/db/schema')
for (const r of demo) {
  if (!/Careful|Evening|Gaming|Independent/.test(r.name)) continue
  const [s] = await db.select().from(rider_scores_current).where(eq(rider_scores_current.rider_id, r.id))
  if (!s) continue
  await db.insert(quote_requests).values({
    rider_id: r.id,
    insurer_id: insurer!.id,
    score_snapshot: { week_start: s.week_start, score: s.score, tier: tierOf(s.score), coverage: s.coverage, confidence: s.confidence },
  })
}

console.log(`seeded ${profiles.length} demo riders, ${uploads} ride-mode uploads, SACCO "${sacco!.name}", insurer "${insurer!.name}"`)
for (const r of demo) {
  const [s] = await db.select().from(rider_scores_current).where(eq(rider_scores_current.rider_id, r.id))
  console.log(`  ${r.name.padEnd(28)} score ${s?.score ?? '-'} tier ${s ? tierOf(s.score) : '-'} coverage ${s?.coverage ?? 'n/a'} confidence ${s?.confidence ?? '-'}`)
}
process.exit(0)
