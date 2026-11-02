import type { GpsFix, MotionSample } from '../ingest/batch'
import { G } from '../ingest/geo'

// Synthetic ride generator for tests and dev seed data. NOT real rider data.
// Produces physically consistent GPS (1 Hz) and phone motion (10 Hz) for a scripted ride,
// with the phone at an arbitrary fixed orientation in the pocket.

export type Phase =
  | { kind: 'cruise'; seconds: number } // constant speed, straight
  | { kind: 'speed'; toKmh: number; accelG: number } // linear speed change (negative accelG = braking)
  | { kind: 'turn'; degrees: number; radiusM: number } // constant-speed arc
  | { kind: 'stop'; seconds: number } // stationary

type Vec = [number, number, number]

// Rotation matrix from yaw/pitch/roll (radians): world → device frame.
function rotation(yaw: number, pitch: number, roll: number) {
  const [cy, sy, cp, sp, cr, sr] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch), Math.cos(roll), Math.sin(roll)]
  const m = [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ]
  return (v: Vec): Vec => [
    m[0]![0]! * v[0] + m[1]![0]! * v[1] + m[2]![0]! * v[2],
    m[0]![1]! * v[0] + m[1]![1]! * v[1] + m[2]![1]! * v[2],
    m[0]![2]! * v[0] + m[1]![2]! * v[1] + m[2]![2]! * v[2],
  ]
}

export function simulateRide(opts: {
  start: { lat: number; lng: number }
  startMs: number
  startKmh: number
  headingDeg?: number
  phases: Phase[]
  orientation?: { yaw: number; pitch: number; roll: number } // phone in pocket, radians
  withMotion?: boolean
}) {
  const toDevice = rotation(opts.orientation?.yaw ?? 0.7, opts.orientation?.pitch ?? 1.2, opts.orientation?.roll ?? -0.4)
  const dt = 0.1 // 10 Hz physics step
  let t = opts.startMs
  let lat = opts.start.lat
  let lng = opts.start.lng
  let v = opts.startKmh / 3.6
  let heading = ((opts.headingDeg ?? 0) * Math.PI) / 180 // radians, 0 = north, clockwise
  const gps: GpsFix[] = []
  const motion: MotionSample[] = []
  let nextGps = t

  const step = (longAcc: number, yawRate: number) => {
    // World frame: x east, y north, z up. Longitudinal along heading, lateral = v·yaw (centripetal).
    const fwd: Vec = [Math.sin(heading), Math.cos(heading), 0]
    const right: Vec = [Math.cos(heading), -Math.sin(heading), 0]
    const lateral = v * yawRate
    const lin: Vec = [fwd[0] * longAcc + right[0] * lateral, fwd[1] * longAcc + right[1] * lateral, 0]
    if (opts.withMotion !== false) {
      const a = toDevice([lin[0], lin[1], lin[2] + G]) // accelerationIncludingGravity
      const w = toDevice([0, 0, (-yawRate * 180) / Math.PI]) // °/s about world up
      // DeviceMotion rotationRate: alpha about z, beta about x, gamma about y.
      motion.push([Math.round(t), a[0], a[1], a[2], w[2], w[0], w[1]])
    }
    if (t >= nextGps) {
      gps.push([Math.round(t), lat, lng, 5, v, (heading * 180) / Math.PI])
      nextGps += 1000
    }
    v = Math.max(0, v + longAcc * dt)
    heading += yawRate * dt
    const d = v * dt
    lat += (d * Math.cos(heading)) / 111_320
    lng += (d * Math.sin(heading)) / (111_320 * Math.cos((lat * Math.PI) / 180))
    t += dt * 1000
  }

  for (const p of opts.phases) {
    if (p.kind === 'cruise') for (let i = 0; i < p.seconds / dt; i++) step(0, 0)
    else if (p.kind === 'stop') {
      v = 0
      for (let i = 0; i < p.seconds / dt; i++) step(0, 0)
    } else if (p.kind === 'speed') {
      const target = p.toKmh / 3.6
      const acc = p.accelG * G
      while (acc < 0 ? v > target + 1e-6 : v < target - 1e-6) step(acc, 0)
    } else {
      const yawRate = v / p.radiusM
      const duration = ((Math.abs(p.degrees) * Math.PI) / 180) / yawRate
      for (let i = 0; i < duration / dt; i++) step(0, Math.sign(p.degrees) * yawRate)
    }
  }
  return { gps, motion, endMs: t }
}
