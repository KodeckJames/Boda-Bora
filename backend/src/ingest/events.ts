import type { MotionSample } from './batch'
import { G, headingDelta } from './geo'
import type { Point } from './trips'

export type EventType = 'harsh_braking' | 'sharp_cornering' | 'rapid_acceleration'
export type Severity = 'low' | 'medium' | 'high'

export type DetectedEvent = {
  type: EventType
  severity: Severity
  t: number
  lat: number
  lng: number
  speedKmh: number
  magnitudeG: number
}

// Thresholds in g. Start values from motorcycle telematics practice; calibrate on field traces.
export const THRESHOLDS: Record<EventType, { low: number; medium: number; high: number; minSpeedKmh: number }> = {
  harsh_braking: { low: 0.3, medium: 0.4, high: 0.5, minSpeedKmh: 15 },
  rapid_acceleration: { low: 0.25, medium: 0.35, high: 0.45, minSpeedKmh: 0 },
  sharp_cornering: { low: 0.3, medium: 0.4, high: 0.5, minSpeedKmh: 20 },
}

// 1 Hz GPS averages a short stop over its sample interval and underestimates the peak, so GPS
// only proposes braking/acceleration candidates (at a lower bar) and fixes the direction. When
// motion data exists, the smoothed IMU jolt measures the strength and must clear the threshold;
// without it, the GPS estimate is used as is.
const GPS_CANDIDATE_FACTOR = 0.6
const IMU_WINDOW_MS = 1500
const IMU_SMOOTH_SAMPLES = 5 // 0.5 s at 10 Hz: suppresses road-vibration spikes
const MERGE_MS = 4000 // events of one type closer than this are one event
const GRAVITY_WINDOW_MS = 20_000
const GRAVITY_STEP_MS = 1000

function severityOf(type: EventType, g: number): Severity | null {
  const t = THRESHOLDS[type]
  if (g >= t.high) return 'high'
  if (g >= t.medium) return 'medium'
  if (g >= t.low) return 'low'
  return null
}

// First index whose time is >= t (binary search; inputs are sorted by time).
function lowerBound<T extends { t: number }>(items: T[], t: number) {
  let lo = 0
  let hi = items.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (items[mid]!.t < t) lo = mid + 1
    else hi = mid
  }
  return lo
}

// Linear interpolation of a GPS point at time t.
function at(points: Point[], t: number): Point {
  const i = lowerBound(points, t)
  if (i >= points.length) return points.at(-1)!
  if (i === 0) return points[0]!
  const a = points[i - 1]!
  const b = points[i]!
  const f = (t - a.t) / (b.t - a.t || 1)
  return { t, lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, speed: a.speed + (b.speed - a.speed) * f, heading: b.heading }
}

type ImuSample = { t: number; horizontalG: number; yawRateDegS: number }

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

// Gravity in device axes, sampled every second: per-axis median over a centred window. A
// braking or cornering transient of a few seconds barely moves a 20 s median, whereas a
// running average would drift into the very acceleration we're trying to measure. Processing
// is offline, so a centred (non-causal) window is fine.
function gravityTrack(motion: MotionSample[]) {
  const grid: { t: number; g: Vec3 }[] = []
  if (motion.length === 0) return grid
  let lo = 0
  let hi = 0
  for (let t = motion[0]![0]; t <= motion.at(-1)![0]; t += GRAVITY_STEP_MS) {
    while (lo < motion.length && motion[lo]![0] < t - GRAVITY_WINDOW_MS / 2) lo++
    while (hi < motion.length && motion[hi]![0] <= t + GRAVITY_WINDOW_MS / 2) hi++
    const w = motion.slice(lo, hi)
    if (w.length > 0) grid.push({ t, g: [median(w.map((m) => m[1])), median(w.map((m) => m[2])), median(w.map((m) => m[3]))] })
  }
  return grid
}

type Vec3 = [number, number, number]

// Orientation-independent motion features: the horizontal part of the linear acceleration
// (measured minus gravity) and the rotation rate about the gravity axis don't depend on how
// the phone sits in the pocket. Sign conventions differ between iOS and Android, so only
// magnitudes are used.
export function imuFeatures(motion: MotionSample[]): ImuSample[] {
  const out: ImuSample[] = []
  const track = gravityTrack(motion)
  let k = 0
  for (const [t, ax, ay, az, alpha, beta, gamma] of motion) {
    while (k < track.length - 1 && track[k + 1]!.t <= t) k++
    const [gx, gy, gz] = track[k]!.g
    const gn = Math.hypot(gx, gy, gz) || 1
    const [ux, uy, uz] = [gx / gn, gy / gn, gz / gn]
    const [lx, ly, lz] = [ax - gx, ay - gy, az - gz]
    const vertical = lx * ux + ly * uy + lz * uz
    const horizontal = Math.hypot(lx - vertical * ux, ly - vertical * uy, lz - vertical * uz)
    // rotationRate: alpha about z, beta about x, gamma about y (device axes).
    const yaw = beta * ux + gamma * uy + alpha * uz
    out.push({ t, horizontalG: horizontal / G, yawRateDegS: Math.abs(yaw) })
  }
  // Moving average of the horizontal jolt.
  const smoothed = out.map((s, i) => {
    const from = Math.max(0, i - IMU_SMOOTH_SAMPLES + 1)
    let sum = 0
    for (let j = from; j <= i; j++) sum += out[j]!.horizontalG
    return { ...s, horizontalG: sum / (i - from + 1) }
  })
  return smoothed
}

function imuPeak(imu: ImuSample[], t: number) {
  let peak = 0
  let seen = false
  for (let i = lowerBound(imu, t - IMU_WINDOW_MS); i < imu.length && imu[i]!.t <= t + IMU_WINDOW_MS; i++) {
    seen = true
    peak = Math.max(peak, imu[i]!.horizontalG)
  }
  return seen ? peak : null
}

function merge(events: DetectedEvent[]): DetectedEvent[] {
  const out: DetectedEvent[] = []
  for (const e of events.sort((a, b) => a.t - b.t)) {
    const last = out.findLast((o) => o.type === e.type)
    if (last && e.t - last.t < MERGE_MS) {
      if (e.magnitudeG > last.magnitudeG) Object.assign(last, e)
    } else out.push({ ...e })
  }
  return out
}

export function detectEvents(points: Point[], motion: MotionSample[]): DetectedEvent[] {
  const imu = imuFeatures(motion.filter((m) => m[0] >= points[0]!.t - 5000 && m[0] <= points.at(-1)!.t + 5000))
  const events: DetectedEvent[] = []

  // Braking and acceleration from GPS speed change (orientation-free), confirmed by the IMU.
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const dt = (b.t - a.t) / 1000
    if (dt < 0.5 || dt > 3) continue
    const longG = (b.speed - a.speed) / dt / G
    const type: EventType = longG < 0 ? 'harsh_braking' : 'rapid_acceleration'
    const gpsG = Math.abs(longG)
    if (gpsG < THRESHOLDS[type].low * GPS_CANDIDATE_FACTOR) continue
    if (a.speed * 3.6 < THRESHOLDS[type].minSpeedKmh) continue
    const t = (a.t + b.t) / 2
    // With motion data the IMU decides; a GPS speed jump with no matching jolt is noise.
    const g = imuPeak(imu, t) ?? gpsG
    const sev = severityOf(type, g)
    if (!sev) continue
    const p = at(points, t)
    events.push({ type, severity: sev, t, lat: p.lat, lng: p.lng, speedKmh: a.speed * 3.6, magnitudeG: g })
  }

  // Cornering: lateral acceleration = speed × yaw rate. Gyro when present, GPS heading otherwise.
  if (imu.length > 0) {
    for (const s of imu) {
      const p = at(points, s.t)
      if (p.speed * 3.6 < THRESHOLDS.sharp_cornering.minSpeedKmh) continue
      const g = (p.speed * ((s.yawRateDegS * Math.PI) / 180)) / G
      const sev = severityOf('sharp_cornering', g)
      if (sev) events.push({ type: 'sharp_cornering', severity: sev, t: s.t, lat: p.lat, lng: p.lng, speedKmh: p.speed * 3.6, magnitudeG: g })
    }
  } else {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!
      const b = points[i]!
      const dt = (b.t - a.t) / 1000
      if (dt < 0.5 || dt > 3 || a.heading === null || b.heading === null) continue
      const yawRad = (Math.abs(headingDelta(a.heading, b.heading)) * Math.PI) / 180 / dt
      const v = (a.speed + b.speed) / 2
      if (v * 3.6 < THRESHOLDS.sharp_cornering.minSpeedKmh) continue
      const g = (v * yawRad) / G
      const sev = severityOf('sharp_cornering', g)
      if (sev) events.push({ type: 'sharp_cornering', severity: sev, t: b.t, lat: b.lat, lng: b.lng, speedKmh: v * 3.6, magnitudeG: g })
    }
  }

  return merge(events)
}
