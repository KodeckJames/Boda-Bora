import type { GpsFix } from './batch'
import { bearingDeg, distanceM, isNight } from './geo'

export type Point = {
  t: number
  lat: number
  lng: number
  speed: number // m/s, smoothed
  heading: number | null // degrees, from movement between points
}

export type TripSegment = {
  points: Point[]
  startedAt: number
  endedAt: number
  distanceM: number
  nightM: number
  maxSpeedKmh: number
}

// Tunables. Start values; calibrate on the Thika Road field traces.
export const TRIP = {
  maxAccuracyM: 50, // discard fixes worse than this
  movingSpeed: 5 / 3.6, // m/s; slower counts as stopped
  stopSplitMs: 3 * 60_000, // a stop this long ends the trip
  gapSplitMs: 2 * 60_000, // missing GPS this long ends the trip (app hidden, tunnel...)
  minTripM: 300,
  minTripMs: 60_000,
  maxPlausibleSpeed: 140 / 3.6, // m/s; faster jumps are GPS glitches
}

// Clean fixes: drop inaccurate ones and teleports, derive speed and heading from movement.
export function cleanGps(fixes: GpsFix[]): Point[] {
  const out: Point[] = []
  for (const [t, lat, lng, acc, reported] of fixes) {
    if (acc > TRIP.maxAccuracyM) continue
    const prev = out.at(-1)
    if (!prev) {
      out.push({ t, lat, lng, speed: reported ?? 0, heading: null })
      continue
    }
    const dt = (t - prev.t) / 1000
    if (dt <= 0) continue
    const d = distanceM(prev, { lat, lng })
    const derived = d / dt
    if (derived > TRIP.maxPlausibleSpeed) continue
    // Prefer the device's Doppler speed; fall back to distance over time.
    const raw = reported !== null && reported >= 0 ? reported : derived
    const speed = 0.6 * raw + 0.4 * prev.speed // light smoothing
    const heading = d > 3 ? bearingDeg(prev, { lat, lng }) : prev.heading
    out.push({ t, lat, lng, speed, heading })
  }
  return out
}

export function segmentTrips(points: Point[]): TripSegment[] {
  const trips: TripSegment[] = []
  let current: Point[] = []
  let stoppedSince: number | null = null

  const close = () => {
    // Trim the stationary tail so trip end = when the rider stopped.
    while (current.length > 1 && current.at(-1)!.speed < TRIP.movingSpeed) current.pop()
    if (current.length >= 2) {
      let dist = 0
      let night = 0
      let max = 0
      for (let i = 1; i < current.length; i++) {
        const d = distanceM(current[i - 1]!, current[i]!)
        dist += d
        if (isNight(current[i]!.t)) night += d
        max = Math.max(max, current[i]!.speed)
      }
      const startedAt = current[0]!.t
      const endedAt = current.at(-1)!.t
      if (dist >= TRIP.minTripM && endedAt - startedAt >= TRIP.minTripMs) {
        trips.push({ points: current, startedAt, endedAt, distanceM: dist, nightM: night, maxSpeedKmh: max * 3.6 })
      }
    }
    current = []
    stoppedSince = null
  }

  for (const p of points) {
    const prev = current.at(-1)
    if (prev && p.t - prev.t > TRIP.gapSplitMs) close()
    const moving = p.speed >= TRIP.movingSpeed
    if (current.length === 0) {
      if (moving) current.push(p)
      continue
    }
    current.push(p)
    if (moving) {
      stoppedSince = null
    } else {
      stoppedSince ??= p.t
      if (p.t - stoppedSince >= TRIP.stopSplitMs) close()
    }
  }
  close()
  return trips
}
