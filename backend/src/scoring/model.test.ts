import { describe, expect, test } from 'bun:test'
import { coverageAndConfidence, recordedIntervals, SCORING, subScores, weekOf, type EventSummary } from './model'

const H = 3600_000
const day = Date.UTC(2026, 10, 2, 3) // Monday 2 Nov 2026, 06:00 EAT

const km = (n: number) => ({ distanceM: n * 1000, nightM: 0, blackspotM: 0 })
const events = (type: EventSummary['type'], severity: EventSummary['severity'], n: number) =>
  Array.from({ length: n }, () => ({ type, severity }))

describe('sub-scores', () => {
  test('a clean week scores 100', () => {
    const s = subScores([km(150)], [])
    expect(s.score).toBe(100)
    expect(s.distanceKm).toBe(150)
  })

  test('a sub-score is 50 exactly at its r50 rate', () => {
    // 8 weighted braking events per 100 km = r50: 4 medium events (weight 2) over 100 km.
    const s = subScores([km(100)], events('harsh_braking', 'medium', 4))
    expect(s.braking).toBe(50)
    expect(s.cornering).toBe(100)
  })

  test('severity counts: one high event weighs like four low ones', () => {
    const high = subScores([km(100)], events('harsh_braking', 'high', 2))
    const low = subScores([km(100)], events('harsh_braking', 'low', 8))
    expect(high.braking).toBe(low.braking)
  })

  test('events are normalised by distance', () => {
    const short = subScores([km(50)], events('sharp_cornering', 'low', 4))
    const long = subScores([km(200)], events('sharp_cornering', 'low', 4))
    expect(long.cornering).toBeGreaterThan(short.cornering)
  })

  test('night riding and blackspots lower their sub-scores', () => {
    const s = subScores([{ distanceM: 100_000, nightM: 35_000, blackspotM: 15_000 }], [])
    expect(s.night_exposure).toBe(50)
    expect(s.route_risk).toBe(50)
    expect(s.score).toBe(85) // 0.15·50 + 0.15·50 + 0.7·100
  })

  test('weights add up to 1', () => {
    expect(Object.values(SCORING.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })
})

describe('coverage and confidence', () => {
  const shift = { from: day, to: day + 10 * H } // 06:00–16:00 EAT

  test('recording the whole shift gives full coverage', () => {
    const c = coverageAndConfidence({ shifts: [shift], sessions: [{ ...shift, gaps: [] }], distanceKm: 120, score: 80 })
    expect(c.coverage).toBe(1)
    expect(c.confidence).toBe(1)
    expect(c.flags).toEqual([])
  })

  test('app-closed gaps reduce coverage', () => {
    const c = coverageAndConfidence({
      shifts: [shift],
      sessions: [{ ...shift, gaps: [{ from: day + 2 * H, to: day + 6 * H }] }], // 4 h closed
      distanceKm: 120,
      score: 80,
    })
    expect(c.coverage).toBe(0.6)
  })

  test('recording outside shift hours does not count', () => {
    const c = coverageAndConfidence({
      shifts: [shift],
      sessions: [{ from: day + 8 * H, to: day + 14 * H, gaps: [] }], // only 2 h overlap
      distanceKm: 120,
      score: 80,
    })
    expect(c.coverage).toBe(0.2)
    expect(c.flags).toContain('low_coverage')
    expect(c.confidence).toBeLessThan(SCORING.insurerMinConfidence)
  })

  test('little riding lowers confidence even with full coverage', () => {
    const c = coverageAndConfidence({ shifts: [shift], sessions: [{ ...shift, gaps: [] }], distanceKm: 25, score: 80 })
    expect(c.confidence).toBe(0.5) // sqrt(25/100)
  })

  test('no shift records: coverage unknown and confidence capped below the insurer bar', () => {
    const c = coverageAndConfidence({ shifts: [], sessions: [{ ...shift, gaps: [] }], distanceKm: 300, score: 95 })
    expect(c.coverage).toBeNull()
    expect(c.flags).toEqual(['no_shift_records'])
    expect(c.confidence).toBeLessThan(SCORING.insurerMinConfidence)
  })

  test('skipping night hours that the SACCO says were worked is flagged', () => {
    const nightShift = { from: day + 12 * H, to: day + 22 * H } // 18:00–04:00 EAT
    const c = coverageAndConfidence({
      shifts: [nightShift],
      sessions: [{ from: day + 12 * H, to: day + 13 * H, gaps: [] }], // only recorded the 18:00 hour
      distanceKm: 120,
      score: 90,
    })
    expect(c.flags).toContain('night_hours_underrecorded')
  })

  test('a score jump while coverage falls is flagged and penalised', () => {
    const half = { from: day, to: day + 5 * H }
    const base = { shifts: [shift], sessions: [{ ...half, gaps: [] }], distanceKm: 120 }
    const clean = coverageAndConfidence({ ...base, score: 70, previous: { score: 68, coverage: 0.5 } })
    const gamed = coverageAndConfidence({ ...base, score: 85, previous: { score: 70, coverage: 0.95 } })
    expect(gamed.flags).toContain('score_up_coverage_down')
    expect(gamed.confidence).toBeLessThan(clean.confidence)
  })

  test('overlapping sessions are not double counted', () => {
    const rec = recordedIntervals([
      { from: 0, to: 10, gaps: [] },
      { from: 5, to: 15, gaps: [{ from: 12 }] },
    ])
    expect(rec).toEqual([{ from: 0, to: 12 }])
  })
})

describe('weeks', () => {
  test('weeks start Monday 00:00 Kenya time', () => {
    // Sunday 1 Nov 2026 22:30 UTC is Monday 01:30 EAT: already the new week.
    expect(weekOf(Date.UTC(2026, 10, 1, 22, 30)).weekStart).toBe('2026-11-02')
    expect(weekOf(Date.UTC(2026, 10, 1, 20, 59)).weekStart).toBe('2026-10-26')
    const w = weekOf(Date.UTC(2026, 10, 4, 12))
    expect(w.weekStart).toBe('2026-11-02')
    expect(w.from).toBe(Date.UTC(2026, 10, 1, 21)) // Mon 00:00 EAT = Sun 21:00 UTC
    expect(w.to - w.from).toBe(7 * 24 * H)
  })
})
