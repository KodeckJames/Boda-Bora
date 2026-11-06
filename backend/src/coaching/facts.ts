import { distanceM, eatHour } from '../ingest/geo'

// The facts a coaching message may use. Built from the rider's own week; nothing else reaches
// the model (no name or phone number: the app adds the rider's first name itself).

export type EventType = 'harsh_braking' | 'sharp_cornering' | 'rapid_acceleration'
export type CoachEvent = {
  type: EventType
  severity: 'low' | 'medium' | 'high'
  t: number
  lat: number | null
  lng: number | null
  speedKmh: number | null
  blackspotName: string | null
}
export type NamedPlace = { name: string; lat: number; lng: number }

export type SubScoreName = 'braking' | 'cornering' | 'acceleration' | 'night_exposure' | 'route_risk'

export type FactPack = {
  week_start: string
  score: number
  previous_score: number | null
  change: number | null
  weakest: { name: SubScoreName; score: number }
  focus: {
    event_type: EventType
    count: number
    place: string | null // a blackspot or stage name; null when the events aren't near a known place
    hours: string // EAT window, e.g. "18:00–20:00"
    typical_speed_kmh: number | null
  } | null
  advice_speed_kmh: number | null // a concrete target the message can quote
  target_score: number
}

const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 4 }
const PLACE_RADIUS_M = 800
const pad = (h: number) => `${String(h % 24).padStart(2, '0')}:00`

function nearestPlace(e: CoachEvent, places: NamedPlace[]) {
  if (e.blackspotName) return e.blackspotName
  if (e.lat === null || e.lng === null) return null
  let best: { name: string; d: number } | null = null
  for (const p of places) {
    const d = distanceM({ lat: e.lat, lng: e.lng }, p)
    if (d <= PLACE_RADIUS_M && (!best || d < best.d)) best = { name: p.name, d }
  }
  return best?.name ?? null
}

// Where and when the rider's risk concentrated: events grouped by type × place × 2-hour band,
// ranked by severity-weighted count.
export function riskCluster(events: CoachEvent[], places: NamedPlace[]): FactPack['focus'] {
  const groups = new Map<string, { type: EventType; place: string | null; band: number; weight: number; events: CoachEvent[] }>()
  for (const e of events) {
    const place = nearestPlace(e, places)
    const band = Math.floor(eatHour(e.t) / 2) * 2
    const key = `${e.type}|${place ?? ''}|${band}`
    const g = groups.get(key) ?? { type: e.type, place, band, weight: 0, events: [] }
    g.weight += SEVERITY_WEIGHT[e.severity]
    g.events.push(e)
    groups.set(key, g)
  }
  // Prefer clusters at a named place when weights tie: they make actionable advice.
  const top = [...groups.values()].sort((a, b) => b.weight - a.weight || Number(!!b.place) - Number(!!a.place))[0]
  if (!top) return null
  const speeds = top.events.map((e) => e.speedKmh).filter((s): s is number => s !== null).sort((a, b) => a - b)
  return {
    event_type: top.type,
    count: top.events.length,
    place: top.place,
    hours: `${pad(top.band)}–${pad(top.band + 2)}`,
    typical_speed_kmh: speeds.length ? Math.round(speeds[speeds.length >> 1]! / 5) * 5 : null,
  }
}

// A concrete, conservative target to quote: slower than the speed the events happened at.
export function adviceSpeed(focus: FactPack['focus']): number | null {
  if (!focus?.typical_speed_kmh) return null
  const cap = focus.event_type === 'sharp_cornering' ? 25 : 30
  return Math.min(cap, Math.max(15, focus.typical_speed_kmh - 10))
}

export function buildFactPack(opts: {
  weekStart: string
  score: number
  previousScore: number | null
  subScores: Record<SubScoreName, number>
  events: CoachEvent[]
  places: NamedPlace[]
}): FactPack {
  const weakest = (Object.entries(opts.subScores) as [SubScoreName, number][]).sort((a, b) => a[1] - b[1])[0]!
  const focus = riskCluster(opts.events, opts.places)
  const round = (n: number) => Math.round(n)
  return {
    week_start: opts.weekStart,
    score: round(opts.score),
    previous_score: opts.previousScore === null ? null : round(opts.previousScore),
    change: opts.previousScore === null ? null : round(opts.score - opts.previousScore),
    weakest: { name: weakest[0], score: round(weakest[1]) },
    focus,
    advice_speed_kmh: adviceSpeed(focus),
    target_score: Math.min(100, round(opts.score) + 5),
  }
}
