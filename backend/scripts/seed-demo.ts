// Sample fleet for presentations and frontend work. SYNTHETIC DATA with realistic names, so the
// app looks lived-in; it is recognised (and removed by --reset) by its reserved phone numbers and
// the fixed organisation names below. Real validation uses the Thika Road field traces, never this.
//
//   bun --env-file=.env.dev scripts/seed-demo.ts            seed the dev branch
//   bun --env-file=.env.dev scripts/seed-demo.ts --reset    remove the demo data first
//   --weeks 8                       weeks of history (default 8)
//   --link-email you@example.com    also give this Google account its own demo rider with
//   --link-name "First Last"        months of history (linked the next time it signs in)
//   add --production to run against the production branch (refused otherwise)
//
// Pass emails and names on the command line only: this file is public.
import { gzipSync } from 'node:zlib'
import { eq, inArray, like, or } from 'drizzle-orm'
import { coachRider } from '../src/coaching/run'
import { db } from '../src/db/client'
import {
  blackspots,
  consents,
  insurers,
  invites,
  quote_requests,
  rider_scores_current,
  riders,
  saccos,
  shifts,
  stages,
  upload_batches,
} from '../src/db/schema'
import { simulateRide, type Phase } from '../src/dev/simulate'
import { processUpload } from '../src/ingest/process'
import { traces } from '../src/lib/storage'
import { tierOf, weekOf } from '../src/scoring/model'
import { scoreRiderWeek } from '../src/scoring/run'

const argv = process.argv.slice(2)
const args = new Set(argv)
const option = (name: string) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
if (process.env.NEON_BRANCH === 'production' && !args.has('--production')) {
  console.error('Refusing to seed the production branch. Pass --production if you really mean it.')
  process.exit(1)
}
const WEEKS = Math.max(2, Math.min(16, Number(option('--weeks') ?? 8)))
const linkEmail = option('--link-email')?.trim().toLowerCase()
const linkName = option('--link-name')?.trim()
if (linkEmail && (!linkName || linkName.split(/\s+/).length < 2)) {
  console.error('--link-email needs --link-name "First Last"')
  process.exit(1)
}

const H = 3600_000
const D = 24 * H
const LEGACY_PREFIX = 'DEMO' // earlier seeds labelled everything "DEMO …"; --reset still removes them
const PHONE_PREFIX = '+2547000000' // every seeded rider's phone starts with this (used by --reset)
const SEED_INVITER = 'seed-demo'
const SACCO_NAME = 'Thika Road Boda SACCO'
const INSURER_NAME = 'Bima Bora Insurance'
const BLACKSPOT_SOURCE = 'approximate location'
const LEGACY_BLACKSPOT_SOURCE = 'demo (approximate location)'

// Approximate Thika Road corridor locations, for demo maps only.
const PLACES = {
  roysambu: { lat: -1.218, lng: 36.889 },
  githurai: { lat: -1.1947, lng: 36.9133 },
  kasarani: { lat: -1.2232, lng: 36.897 },
  kahawa: { lat: -1.186, lng: 36.9 },
}

async function reset() {
  const demoRiders = await db
    .select({ id: riders.id })
    .from(riders)
    .where(or(like(riders.name, `${LEGACY_PREFIX} %`), like(riders.phone, `${PHONE_PREFIX}%`)))
  const ids = demoRiders.map((r) => r.id)
  if (ids.length) {
    const keys = await db.select({ k: upload_batches.object_key }).from(upload_batches).where(inArray(upload_batches.rider_id, ids))
    for (const { k } of keys) await traces.delete(k).catch(() => {})
    await db.delete(invites).where(or(inArray(invites.rider_id, ids), eq(invites.invited_by, SEED_INVITER)))
    await db.delete(riders).where(inArray(riders.id, ids)) // cascades to trips, events, scores, coaching, consents...
  }
  await db.delete(saccos).where(or(eq(saccos.name, SACCO_NAME), like(saccos.name, `${LEGACY_PREFIX} %`)))
  await db.delete(insurers).where(or(eq(insurers.name, INSURER_NAME), like(insurers.name, `${LEGACY_PREFIX} %`)))
  await db.delete(blackspots).where(inArray(blackspots.source, [BLACKSPOT_SOURCE, LEGACY_BLACKSPOT_SOURCE]))
  console.log(`reset: removed ${ids.length} demo riders`)
}

if (args.has('--reset')) await reset()
const [existing] = await db
  .select({ id: saccos.id })
  .from(saccos)
  .where(or(eq(saccos.name, SACCO_NAME), like(saccos.name, `${LEGACY_PREFIX} %`)))
if (existing) {
  console.log('Demo data already exists. Run with --reset to recreate it.')
  process.exit(0)
}

// ---------- Organisations and places ----------
const [sacco] = await db.insert(saccos).values({ name: SACCO_NAME, county: 'Nairobi' }).returning()
const stageRows = await db
  .insert(stages)
  .values([
    { sacco_id: sacco!.id, name: 'Roysambu stage', location: { x: PLACES.roysambu.lng, y: PLACES.roysambu.lat } },
    { sacco_id: sacco!.id, name: 'Kahawa West stage', location: { x: PLACES.kahawa.lng, y: PLACES.kahawa.lat } },
  ])
  .returning()
await db.insert(blackspots).values([
  { name: 'Githurai 45 roundabout', location: { x: PLACES.githurai.lng, y: PLACES.githurai.lat }, radius_m: 250, weight: 1.5, source: BLACKSPOT_SOURCE },
  { name: 'Kasarani exit ramp', location: { x: PLACES.kasarani.lng, y: PLACES.kasarani.lat }, radius_m: 200, source: BLACKSPOT_SOURCE },
])
const [insurer] = await db.insert(insurers).values({ name: INSURER_NAME }).returning()

// ---------- Riding patterns ----------
type Week = { brakes: number; corners: number; recordedShare: number; at: keyof typeof PLACES }
type Profile = {
  name: string
  sacco: boolean
  shift: { startHourEat: number; hours: number; rideOffsetHours?: number }
  // w = 0 for the oldest week, last = the most recent completed week
  week: (w: number, last: number) => Week
  quote?: 'pending' | 'quoted'
  shares?: boolean
}
const profiles: Profile[] = [
  // Careful all round.
  {
    name: 'Wanjiru Kamau', sacco: true, shift: { startHourEat: 7, hours: 9 }, quote: 'quoted', shares: true,
    week: (w) => ({ brakes: 0, corners: w % 4 === 1 ? 1 : 0, recordedShare: 1, at: 'roysambu' }),
  },
  {
    // Took the coaching: harsh braking at Githurai 45 falls week by week.
    name: 'Kevin Omondi', sacco: true, shift: { startHourEat: 18, hours: 6 }, quote: 'pending', shares: true,
    week: (w, last) => ({ brakes: Math.max(1, 4 - Math.floor((w * 4) / (last + 1))), corners: 0, recordedShare: 0.95, at: 'githurai' }),
  },
  // Night shifts near the Kasarani exit ramp.
  {
    name: 'Brian Otieno', sacco: true, shift: { startHourEat: 18, hours: 8, rideOffsetHours: 3 }, shares: true,
    week: (w) => ({ brakes: w % 4 === 2 ? 1 : 0, corners: 1, recordedShare: 0.9, at: 'kasarani' }),
  },
  {
    // Rides normally, then the last week records only the calm part of his shifts.
    name: 'Samuel Mutua', sacco: true, shift: { startHourEat: 7, hours: 10 }, quote: 'pending', shares: true,
    week: (w, last) => (w < last ? { brakes: 2, corners: 1, recordedShare: 1, at: 'githurai' } : { brakes: 0, corners: 0, recordedShare: 0.3, at: 'roysambu' }),
  },
  // Harsh braking and sharp cornering every week.
  {
    name: 'Peter Wekesa', sacco: true, shift: { startHourEat: 9, hours: 9 },
    week: (w) => ({ brakes: 4 + (w % 2), corners: 3, recordedShare: 1, at: w % 2 ? 'kasarani' : 'githurai' }),
  },
  // Not in a SACCO: no shift records, so confidence is capped.
  {
    name: 'Grace Achieng', sacco: false, shift: { startHourEat: 8, hours: 8 }, quote: 'pending', shares: true,
    week: (w) => ({ brakes: w % 2, corners: (w + 1) % 2, recordedShare: 1, at: 'kahawa' }),
  },
]
if (linkEmail && linkName) {
  // The presenter's own rider: steady improvement, shares with the insurer, holds a quote.
  profiles.push({
    name: linkName, sacco: true, shift: { startHourEat: 7, hours: 9 }, quote: 'quoted', shares: true,
    week: (w) => ({ brakes: Math.max(1, 3 - Math.floor(w / 3)), corners: w % 3 === 0 ? 1 : 0, recordedShare: w < 2 ? 0.9 : 1, at: w % 2 ? 'githurai' : 'roysambu' }),
  })
}

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

// Completed weeks only, oldest first. The last two get six working days; older weeks four,
// to keep the seed quick while still giving each week a score.
const thisWeek = weekOf(Date.now())
const weekStarts = Array.from({ length: WEEKS }, (_, i) => thisWeek.from - (WEEKS - i) * 7 * D)
const daysIn = (w: number) => (w >= WEEKS - 2 ? 6 : 4)

// Valid-looking Kenyan motorcycle plates: KMD? 1??X.
const plateFor = (i: number) => `KMD${String.fromCharCode(65 + i)} ${String(101 + i * 37).slice(0, 3)}${String.fromCharCode(88 - i)}`

// Retries steps that hit a dropped connection (long seeds over the internet see a few).
const TRANSIENT = /Connection terminated|ECONNRESET|ETIMEDOUT|timeout|terminating connection|socket hang up/i
async function retry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let n = 1; ; n++) {
    try {
      return await fn()
    } catch (err) {
      if (n >= attempts || !TRANSIENT.test(String((err as Error)?.message ?? err))) throw err
      console.warn(`  retry ${n} ${label}: ${(err as Error).message}`)
      await new Promise((r) => setTimeout(r, 2000 * n))
    }
  }
}

let uploads = 0
async function seedRider(p: Profile, i: number) {
  const [rider] = await db
    .insert(riders)
    .values({
      name: p.name,
      phone: `${PHONE_PREFIX}${String(i === profiles.length - 1 && linkEmail ? 99 : i + 10)}`,
      bike_reg: plateFor(i),
      sacco_id: p.sacco ? sacco!.id : null,
      stage_id: p.sacco ? stageRows[i % stageRows.length]!.id : null,
    })
    .returning()

  for (const [w, weekStart] of weekStarts.entries()) {
    const pattern = p.week(w, WEEKS - 1)
    for (let day = 0; day < daysIn(w); day++) {
      const shiftStart = weekStart + day * D + p.shift.startHourEat * H
      const shiftEnd = shiftStart + p.shift.hours * H
      if (p.sacco) {
        await retry('shift', () =>
          db
            .insert(shifts)
            .values({ rider_id: rider!.id, sacco_id: sacco!.id, starts_at: new Date(shiftStart), ends_at: new Date(shiftEnd), source: 'sacco_upload' })
            .onConflictDoNothing(),
        )
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
      await retry('batch', () => db.insert(upload_batches).values({ rider_id: rider!.id, object_key: key }).onConflictDoNothing())
      await retry('storage', () => traces.upload(key, body, { contentType: 'application/gzip' }))
      const result = await retry('ingest', () => processUpload(key))
      if (result.status !== 'processed') console.warn('ingest', key, result)
      uploads++
    }
    await retry('score', () => scoreRiderWeek(rider!.id, weekStart + 3 * D))
    // A coaching message every week, so the history reads like months of use.
    await retry('coach', () => coachRider(rider!.id, weekStart + 3 * D, { force: true }))
  }

  if (p.shares) await db.insert(consents).values({ rider_id: rider!.id, insurer_id: insurer!.id })
  if (p.quote) {
    const [s] = await db.select().from(rider_scores_current).where(eq(rider_scores_current.rider_id, rider!.id))
    if (s) {
      const quoted = p.quote === 'quoted'
      const tier = tierOf(s.score)
      await db.insert(quote_requests).values({
        rider_id: rider!.id,
        insurer_id: insurer!.id,
        score_snapshot: { week_start: s.week_start, score: s.score, tier, coverage: s.coverage, confidence: s.confidence },
        status: quoted ? 'quoted' : 'pending',
        premium_ksh: quoted ? { A: 6200, B: 9100, C: 12800, D: 17400 }[tier] : null,
        decided_by: quoted ? SEED_INVITER : null,
        decided_at: quoted ? new Date(Date.now() - 2 * D) : null,
        created_at: new Date(Date.now() - (quoted ? 5 : 1) * D),
      })
    }
  }
  console.log(`  ${p.name}: ${WEEKS} weeks done`)
  return rider!
}

console.log(`Seeding ${profiles.length} riders × ${WEEKS} weeks…`)
// Riders in parallel; each rider's weeks in order (gaming flags compare with the previous week).
const seeded = await Promise.all(profiles.map((p, i) => seedRider(p, i)))

if (linkEmail) {
  // Linked to that Google account the next time it signs in (verified email only; see lib/access.ts).
  const mine = seeded.at(-1)!
  await db.insert(invites).values({ email: linkEmail, role: 'rider', sacco_id: sacco!.id, rider_id: mine.id, invited_by: SEED_INVITER })
  console.log(`linked rider "${mine.name}" waits for the invited Google account`)
}

console.log(`seeded ${profiles.length} riders, ${uploads} ride-mode uploads, SACCO "${sacco!.name}", insurer "${insurer!.name}"`)
for (const r of seeded) {
  const [s] = await db.select().from(rider_scores_current).where(eq(rider_scores_current.rider_id, r.id))
  console.log(`  ${r.name.padEnd(28)} score ${s?.score ?? '-'} tier ${s ? tierOf(s.score) : '-'} coverage ${s?.coverage ?? 'n/a'} confidence ${s?.confidence ?? '-'}`)
}
process.exit(0)
