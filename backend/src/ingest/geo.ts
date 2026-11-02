export const G = 9.80665 // m/s² per g

export type LatLng = { lat: number; lng: number }

const rad = (d: number) => (d * Math.PI) / 180

export function distanceM(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

// Initial bearing from a to b, degrees 0–360.
export function bearingDeg(a: LatLng, b: LatLng) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Smallest signed difference between two bearings, -180..180.
export function headingDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180
}

// Kenya is UTC+3 all year (no daylight saving).
export function eatHour(epochMs: number) {
  return new Date(epochMs + 3 * 3600_000).getUTCHours()
}

// Night riding window used for night-hours exposure: 19:00–06:00 EAT.
export const isNight = (epochMs: number) => {
  const h = eatHour(epochMs)
  return h >= 19 || h < 6
}

// Ramer–Douglas–Peucker simplification, tolerance in metres (equirectangular approximation).
export function simplify<T extends LatLng>(points: T[], toleranceM: number): T[] {
  if (points.length <= 2) return points
  const lat0 = rad(points[0]!.lat)
  const xy = points.map((p) => [rad(p.lng) * Math.cos(lat0) * 6371000, rad(p.lat) * 6371000] as const)
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()!
    const [x1, y1] = xy[s]!
    const [x2, y2] = xy[e]!
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    let maxD = 0
    let idx = -1
    for (let i = s + 1; i < e; i++) {
      const [x, y] = xy[i]!
      const d = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / len
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (idx > 0 && maxD > toleranceM) {
      keep[idx] = 1
      stack.push([s, idx], [idx, e])
    }
  }
  return points.filter((_, i) => keep[i])
}
