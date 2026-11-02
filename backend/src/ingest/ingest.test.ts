import { describe, expect, test } from 'bun:test'
import { gzipSync } from 'node:zlib'
import { simulateRide } from '../dev/simulate'
import { parseBatch } from './batch'
import { detectEvents } from './events'
import { isNight, simplify } from './geo'
import { cleanGps, segmentTrips } from './trips'

const thikaRoad = { lat: -1.2195, lng: 36.888 }
const noon = Date.UTC(2026, 10, 2, 9, 0, 0) // 12:00 EAT

const detect = (ride: ReturnType<typeof simulateRide>) => {
  const [trip] = segmentTrips(cleanGps(ride.gps))
  expect(trip).toBeDefined()
  return detectEvents(trip!.points, ride.motion)
}

describe('event detection', () => {
  test('smooth riding produces no events', () => {
    const ride = simulateRide({
      start: thikaRoad,
      startMs: noon,
      startKmh: 0,
      phases: [
        { kind: 'speed', toKmh: 35, accelG: 0.1 },
        { kind: 'cruise', seconds: 60 },
        { kind: 'turn', degrees: 90, radiusM: 60 },
        { kind: 'cruise', seconds: 30 },
        { kind: 'speed', toKmh: 0, accelG: -0.12 },
      ],
    })
    expect(detect(ride)).toEqual([])
  })

  test.each([
    ['upright in a chest pocket', { yaw: 0.2, pitch: 0.1, roll: 0.05 }],
    ['sideways in a trouser pocket', { yaw: 1.9, pitch: 1.4, roll: -1.1 }],
    ['upside down', { yaw: -2.5, pitch: 3.0, roll: 0.6 }],
  ])('harsh braking is detected with the phone %s', (_, orientation) => {
    const ride = simulateRide({
      start: thikaRoad,
      startMs: noon,
      startKmh: 0,
      orientation,
      phases: [
        { kind: 'speed', toKmh: 50, accelG: 0.1 },
        { kind: 'cruise', seconds: 30 },
        { kind: 'speed', toKmh: 10, accelG: -0.55 },
        { kind: 'cruise', seconds: 45 },
      ],
    })
    const events = detect(ride)
    expect(events.map((e) => e.type)).toEqual(['harsh_braking'])
    expect(events[0]!.severity).toBe('high')
    expect(events[0]!.speedKmh).toBeGreaterThan(30)
  })

  test('rapid acceleration is detected', () => {
    const ride = simulateRide({
      start: thikaRoad,
      startMs: noon,
      startKmh: 10,
      phases: [
        { kind: 'cruise', seconds: 45 },
        { kind: 'speed', toKmh: 60, accelG: 0.4 },
        { kind: 'cruise', seconds: 45 },
      ],
    })
    const events = detect(ride)
    expect(events.map((e) => e.type)).toEqual(['rapid_acceleration'])
    expect(events[0]!.severity).toBe('medium')
  })

  test('sharp cornering is detected from the gyroscope', () => {
    // 35 km/h through a 20 m radius: v²/r ≈ 4.7 m/s² ≈ 0.48 g
    const ride = simulateRide({
      start: thikaRoad,
      startMs: noon,
      startKmh: 0,
      orientation: { yaw: 1.1, pitch: 0.9, roll: 2.2 },
      phases: [
        { kind: 'speed', toKmh: 35, accelG: 0.1 },
        { kind: 'cruise', seconds: 45 },
        { kind: 'turn', degrees: 90, radiusM: 20 },
        { kind: 'cruise', seconds: 45 },
      ],
    })
    const events = detect(ride)
    expect(events.map((e) => e.type)).toEqual(['sharp_cornering'])
    expect(events[0]!.magnitudeG).toBeGreaterThan(0.4)
  })

  test('sharp cornering falls back to GPS heading without motion data', () => {
    const ride = simulateRide({
      start: thikaRoad,
      startMs: noon,
      startKmh: 0,
      withMotion: false,
      phases: [
        { kind: 'speed', toKmh: 35, accelG: 0.1 },
        { kind: 'cruise', seconds: 45 },
        { kind: 'turn', degrees: 120, radiusM: 20 },
        { kind: 'cruise', seconds: 45 },
      ],
    })
    expect(detect(ride).map((e) => e.type)).toContain('sharp_cornering')
  })

  test('a GPS speed jump with no matching jolt is ignored as noise', () => {
    const ride = simulateRide({
      start: thikaRoad,
      startMs: noon,
      startKmh: 0,
      phases: [
        { kind: 'speed', toKmh: 40, accelG: 0.1 },
        { kind: 'cruise', seconds: 60 },
      ],
    })
    // Corrupt one GPS speed reading to fake a sudden 0.6 g drop; the IMU saw nothing.
    const i = ride.gps.length - 20
    ride.gps[i] = [...ride.gps[i]!.slice(0, 4), 40 / 3.6 - 6, ride.gps[i]![5]] as (typeof ride.gps)[number]
    expect(detect(ride).filter((e) => e.type === 'harsh_braking')).toEqual([])
  })
})

describe('trip segmentation', () => {
  test('a long stop splits a shift into two trips and short hops are dropped', () => {
    const a = simulateRide({
      start: thikaRoad,
      startMs: noon,
      startKmh: 0,
      phases: [
        { kind: 'speed', toKmh: 40, accelG: 0.1 },
        { kind: 'cruise', seconds: 120 },
        { kind: 'speed', toKmh: 0, accelG: -0.1 },
        { kind: 'stop', seconds: 240 }, // 4 min at the stage
        { kind: 'speed', toKmh: 40, accelG: 0.1 },
        { kind: 'cruise', seconds: 120 },
        { kind: 'speed', toKmh: 0, accelG: -0.1 },
        { kind: 'stop', seconds: 240 },
        { kind: 'speed', toKmh: 10, accelG: 0.1 }, // 15 s shuffle: too short to be a trip
        { kind: 'cruise', seconds: 15 },
      ],
    })
    const trips = segmentTrips(cleanGps(a.gps))
    expect(trips).toHaveLength(2)
    for (const t of trips) expect(t.distanceM).toBeGreaterThan(1300)
  })

  test('inaccurate fixes and GPS teleports are discarded', () => {
    const ride = simulateRide({ start: thikaRoad, startMs: noon, startKmh: 30, phases: [{ kind: 'cruise', seconds: 30 }] })
    const fixes = [...ride.gps]
    fixes[10] = [fixes[10]![0], fixes[10]![1], fixes[10]![2], 400, null, null] // 400 m accuracy
    fixes[15] = [fixes[15]![0], fixes[15]![1] + 0.05, fixes[15]![2], 5, null, null] // 5 km jump in 1 s
    const cleaned = cleanGps(fixes)
    expect(cleaned).toHaveLength(fixes.length - 2)
  })
})

describe('helpers', () => {
  test('night is 19:00–06:00 in Kenya time', () => {
    expect(isNight(Date.UTC(2026, 10, 2, 16, 30))).toBe(true) // 19:30 EAT
    expect(isNight(Date.UTC(2026, 10, 2, 2, 59))).toBe(true) // 05:59 EAT
    expect(isNight(Date.UTC(2026, 10, 2, 3, 0))).toBe(false) // 06:00 EAT
    expect(isNight(noon)).toBe(false)
  })

  test('simplify keeps the shape with far fewer points', () => {
    const ride = simulateRide({
      start: thikaRoad,
      startMs: noon,
      startKmh: 30,
      phases: [{ kind: 'cruise', seconds: 60 }, { kind: 'turn', degrees: 90, radiusM: 40 }, { kind: 'cruise', seconds: 60 }],
    })
    const points = cleanGps(ride.gps)
    const simple = simplify(points, 15)
    expect(simple.length).toBeLessThan(points.length / 4)
    expect(simple[0]).toEqual(points[0])
    expect(simple.at(-1)).toEqual(points.at(-1))
  })

  test('parseBatch reads the PWA upload format and rejects garbage', async () => {
    const ride = simulateRide({ start: thikaRoad, startMs: noon, startKmh: 30, phases: [{ kind: 'cruise', seconds: 12 }] })
    const lines = [
      JSON.stringify({ type: 'session', id: 's1', startedAt: noon, endedAt: ride.endMs, gaps: [{ from: noon + 1, to: noon + 2 }] }),
      JSON.stringify({ type: 'chunk', seq: 1, motion: ride.motion.slice(60), gps: ride.gps.slice(6) }),
      JSON.stringify({ type: 'chunk', seq: 0, motion: ride.motion.slice(0, 60), gps: ride.gps.slice(0, 6) }),
    ]
    const batch = await parseBatch(gzipSync(lines.join('\n')))
    expect(batch.session.gaps).toHaveLength(1)
    expect(batch.gps).toHaveLength(ride.gps.length)
    expect(batch.motion[0]![0]).toBe(ride.motion[0]![0]) // chunks re-ordered by seq/time

    await expect(parseBatch(new TextEncoder().encode('not gzip'))).rejects.toThrow('not valid gzip')
    await expect(parseBatch(gzipSync('{"type":"chunk"}'))).rejects.toThrow()
  })
})
