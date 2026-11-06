// Rider Safety Score model. Pure functions; the jobs function feeds them from the database.
// All constants are starting values, to be calibrated on the Thika Road field traces.

export type EventType = 'harsh_braking' | 'sharp_cornering' | 'rapid_acceleration'
export type Severity = 'low' | 'medium' | 'high'

export type RideSummary = { distanceM: number; nightM: number; blackspotM: number }
export type EventSummary = { type: EventType; severity: Severity }
export type Interval = { from: number; to: number } // epoch ms, from < to

export type SubScores = {
  braking: number
  cornering: number
  acceleration: number
  night_exposure: number
  route_risk: number
}

export const SCORING = {
  minWeeklyKm: 20, // below this a week has too little data to score
  severityWeight: { low: 1, medium: 2, high: 4 } satisfies Record<Severity, number>,
  // Rate at which a sub-score reaches 50, and how steep the curve is around it.
  curve: {
    braking: { r50: 8, p: 1.5 }, // weighted events per 100 km
    cornering: { r50: 8, p: 1.5 },
    acceleration: { r50: 10, p: 1.5 },
    night_exposure: { r50: 0.35, p: 2 }, // share of distance ridden 19:00–06:00
    route_risk: { r50: 0.15, p: 2 }, // share of distance inside blackspot radii
  } satisfies Record<keyof SubScores, { r50: number; p: number }>,
  weights: { braking: 0.3, cornering: 0.25, acceleration: 0.15, night_exposure: 0.15, route_risk: 0.15 } satisfies Record<
    keyof SubScores,
    number
  >,
  fullConfidenceKm: 100, // weekly distance that counts as a fully representative sample
  noShiftsConfidenceCap: 0.5, // unverifiable without shift records: always below the insurer bar
  insurerMinConfidence: 0.6, // insurers only see scores at or above this
} as const

// Underwriting tiers by score. Pricing per tier is each insurer's own decision.
export const TIERS = [
  { tier: 'A', min: 85 },
  { tier: 'B', min: 70 },
  { tier: 'C', min: 55 },
  { tier: 'D', min: 0 },
] as const
export type Tier = (typeof TIERS)[number]['tier']
export const tierOf = (score: number): Tier => TIERS.find((t) => score >= t.min)!.tier

const curve = (rate: number, { r50, p }: { r50: number; p: number }) => 100 / (1 + (Math.max(0, rate) / r50) ** p)
const round1 = (n: number) => Math.round(n * 10) / 10

export function subScores(rides: RideSummary[], events: EventSummary[]): SubScores & { score: number; distanceKm: number } {
  const distanceM = rides.reduce((s, r) => s + r.distanceM, 0)
  const per100km = (type: EventType) => {
    const weighted = events.filter((e) => e.type === type).reduce((s, e) => s + SCORING.severityWeight[e.severity], 0)
    return distanceM > 0 ? (weighted / distanceM) * 100_000 : 0
  }
  const share = (m: number) => (distanceM > 0 ? m / distanceM : 0)
  const sub: SubScores = {
    braking: curve(per100km('harsh_braking'), SCORING.curve.braking),
    cornering: curve(per100km('sharp_cornering'), SCORING.curve.cornering),
    acceleration: curve(per100km('rapid_acceleration'), SCORING.curve.acceleration),
    night_exposure: curve(share(rides.reduce((s, r) => s + r.nightM, 0)), SCORING.curve.night_exposure),
    route_risk: curve(share(rides.reduce((s, r) => s + r.blackspotM, 0)), SCORING.curve.route_risk),
  }
  const score = (Object.keys(sub) as (keyof SubScores)[]).reduce((s, k) => s + sub[k] * SCORING.weights[k], 0)
  return {
    braking: round1(sub.braking),
    cornering: round1(sub.cornering),
    acceleration: round1(sub.acceleration),
    night_exposure: round1(sub.night_exposure),
    route_risk: round1(sub.route_risk),
    score: round1(score),
    distanceKm: distanceM / 1000,
  }
}

// ---------- Interval helpers ----------

export function union(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.to > i.from).sort((a, b) => a.from - b.from)
  const out: Interval[] = []
  for (const i of sorted) {
    const last = out.at(-1)
    if (last && i.from <= last.to) last.to = Math.max(last.to, i.to)
    else out.push({ ...i })
  }
  return out
}

export const total = (intervals: Interval[]) => intervals.reduce((s, i) => s + (i.to - i.from), 0)

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = []
  for (const x of union(a)) {
    for (const y of union(b)) {
      const from = Math.max(x.from, y.from)
      const to = Math.min(x.to, y.to)
      if (to > from) out.push({ from, to })
    }
  }
  return union(out)
}

function subtract(a: Interval[], b: Interval[]): Interval[] {
  let rest = union(a)
  for (const cut of union(b)) {
    rest = rest.flatMap((r) => {
      if (cut.to <= r.from || cut.from >= r.to) return [r]
      const parts: Interval[] = []
      if (cut.from > r.from) parts.push({ from: r.from, to: cut.from })
      if (cut.to < r.to) parts.push({ from: cut.to, to: r.to })
      return parts
    })
  }
  return rest
}

// Time a ride-mode session actually recorded: the session minus periods the app was hidden.
export type Session = { from: number; to: number; gaps: { from: number; to?: number }[] }

export function recordedIntervals(sessions: Session[]): Interval[] {
  return union(
    sessions.flatMap((s) =>
      subtract([{ from: s.from, to: s.to }], s.gaps.map((g) => ({ from: g.from, to: g.to ?? s.to }))),
    ),
  )
}

// Share of an interval set falling 19:00–06:00 EAT, sampled per minute (exact enough for weekly shares).
function nightShare(intervals: Interval[]) {
  let night = 0
  let all = 0
  for (const i of intervals) {
    for (let t = i.from; t < i.to; t += 60_000) {
      const h = new Date(t + 3 * 3600_000).getUTCHours()
      all++
      if (h >= 19 || h < 6) night++
    }
  }
  return all > 0 ? night / all : 0
}

// ---------- Coverage and confidence ----------

export type Confidence = { coverage: number | null; confidence: number; flags: string[] }

export function coverageAndConfidence(opts: {
  shifts: Interval[]
  sessions: Session[]
  distanceKm: number
  score: number
  previous?: { score: number; coverage: number | null } | null
}): Confidence {
  const flags: string[] = []
  const recorded = recordedIntervals(opts.sessions)
  const volume = Math.min(1, opts.distanceKm / SCORING.fullConfidenceKm)

  if (opts.shifts.length === 0) {
    flags.push('no_shift_records')
    return { coverage: null, confidence: round2(Math.min(SCORING.noShiftsConfidenceCap, volume)), flags }
  }

  const shiftTime = union(opts.shifts)
  const coverage = total(shiftTime) > 0 ? total(intersect(recorded, shiftTime)) / total(shiftTime) : 0
  let confidence = coverage * Math.sqrt(volume)
  if (coverage < 0.6) flags.push('low_coverage')

  // Selective logging: the SACCO says the rider works nights, but the recordings avoid them.
  const shiftNight = nightShare(shiftTime)
  const recordedNight = nightShare(intersect(recorded, shiftTime))
  if (shiftNight >= 0.25 && recordedNight < shiftNight / 2) {
    flags.push('night_hours_underrecorded')
    confidence *= 0.7
  }

  // A score that jumps while coverage falls is the classic gaming pattern.
  const prev = opts.previous
  if (prev && prev.coverage !== null && opts.score - prev.score >= 10 && prev.coverage - coverage >= 0.2) {
    flags.push('score_up_coverage_down')
    confidence *= 0.6
  }

  return { coverage: round2(coverage), confidence: round2(Math.min(1, confidence)), flags }
}

const round2 = (n: number) => Math.round(n * 100) / 100

// ---------- Weeks (Monday 00:00 EAT) ----------

const EAT_MS = 3 * 3600_000
const DAY_MS = 86_400_000

export function weekOf(epochMs: number): { weekStart: string; from: number; to: number } {
  const local = new Date(epochMs + EAT_MS)
  const daysSinceMonday = (local.getUTCDay() + 6) % 7
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - daysSinceMonday * DAY_MS
  return {
    weekStart: new Date(mondayLocal).toISOString().slice(0, 10),
    from: mondayLocal - EAT_MS,
    to: mondayLocal - EAT_MS + 7 * DAY_MS,
  }
}
