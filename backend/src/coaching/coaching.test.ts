import { describe, expect, test } from 'bun:test'
import { adviceSpeed, buildFactPack, riskCluster, type CoachEvent } from './facts'
import { parseAiCoaching, usesOnlyFactNumbers } from './generate'
import { templateCoaching } from './template'

// 18:40 EAT on Monday 2 Nov 2026
const evening = Date.UTC(2026, 10, 2, 15, 40)
const githurai = { name: 'Githurai 45 roundabout', lat: -1.1947, lng: 36.9133 }

const ev = (over: Partial<CoachEvent>): CoachEvent => ({
  type: 'harsh_braking',
  severity: 'medium',
  t: evening,
  lat: githurai.lat,
  lng: githurai.lng,
  speedKmh: 48,
  blackspotName: null,
  ...over,
})

const subScores = { braking: 58, cornering: 66, acceleration: 61, night_exposure: 55, route_risk: 70 }

describe('fact pack', () => {
  test('the risk cluster is the heaviest type × place × time band', () => {
    const events = [
      ev({}),
      ev({ t: evening + 600_000, severity: 'high' }),
      ev({ t: evening + 86_400_000 }), // same place and band, next day
      ev({ type: 'sharp_cornering', t: Date.UTC(2026, 10, 3, 5), lat: -1.25, lng: 36.85 }), // elsewhere, morning
    ]
    const focus = riskCluster(events, [githurai])
    expect(focus).toEqual({
      event_type: 'harsh_braking',
      count: 3,
      place: 'Githurai 45 roundabout',
      hours: '18:00–20:00',
      typical_speed_kmh: 50,
    })
  })

  test('a blackspot name wins over a nearby stage', () => {
    const focus = riskCluster([ev({ blackspotName: 'Roysambu footbridge' })], [githurai])
    expect(focus?.place).toBe('Roysambu footbridge')
  })

  test('events far from any named place have no place', () => {
    expect(riskCluster([ev({ lat: -1.4, lng: 36.7 })], [githurai])?.place).toBeNull()
  })

  test('advice speed is below the event speed and capped', () => {
    expect(adviceSpeed({ event_type: 'harsh_braking', count: 1, place: null, hours: '', typical_speed_kmh: 50 })).toBe(30)
    expect(adviceSpeed({ event_type: 'harsh_braking', count: 1, place: null, hours: '', typical_speed_kmh: 30 })).toBe(20)
    expect(adviceSpeed({ event_type: 'sharp_cornering', count: 1, place: null, hours: '', typical_speed_kmh: 45 })).toBe(25)
  })

  test('weakest sub-score, change and target are computed', () => {
    const f = buildFactPack({ weekStart: '2026-11-02', score: 64.4, previousScore: 67, subScores, coverage: 0.9, events: [ev({})], places: [githurai] })
    expect(f.weakest).toEqual({ name: 'night_exposure', score: 55 })
    expect(f.change).toBe(-3)
    expect(f.target_score).toBe(69)
  })
})

describe('template coaching', () => {
  const facts = buildFactPack({
    weekStart: '2026-11-02',
    score: 64,
    previousScore: 67,
    subScores,
    coverage: 0.9,
    events: [ev({}), ev({ t: evening + 600_000 }), ev({ t: evening + 900_000 })],
    places: [githurai],
  })

  test('names the place, the time and one concrete action', () => {
    const c = templateCoaching(facts)
    expect(c.message_sw).toContain('Githurai 45 roundabout')
    expect(c.message_sw).toContain('18:00–20:00')
    expect(c.message_sw).toContain('30 km/h')
    expect(c.message_en).toContain('3 harsh braking events')
    expect(c.focus).toBe('Githurai 45 roundabout · 18:00–20:00')
    expect(c.message_sw.length).toBeLessThanOrEqual(480)
  })

  test('only ever uses numbers from the facts', () => {
    const c = templateCoaching(facts)
    expect(usesOnlyFactNumbers(`${c.message_sw} ${c.message_en}`, facts)).toBe(true)
  })

  test('a clean week gets encouragement', () => {
    const clean = buildFactPack({ weekStart: '2026-11-02', score: 92, previousScore: 88, subScores, coverage: 0.9, events: [], places: [] })
    expect(templateCoaching(clean).message_en).toBe('Your score this week is 92 (+4). No risky events were recorded. Keep it up!')
  })
})

describe('coverage coaching', () => {
  test('low coverage overrides praise, even for a perfect score', () => {
    const f = buildFactPack({ weekStart: '2026-11-02', score: 100, previousScore: 56, subScores, coverage: 0.3, events: [], places: [] })
    const c = templateCoaching(f)
    expect(f.low_coverage).toBe(true)
    expect(c.message_en).toContain('recorded only 30% of your shifts')
    expect(c.message_en).not.toContain('Keep it up')
    expect(usesOnlyFactNumbers(`${c.message_sw} ${c.message_en}`, f)).toBe(true)
  })

  test('no shift records is not treated as low coverage', () => {
    const f = buildFactPack({ weekStart: '2026-11-02', score: 90, previousScore: null, subScores, coverage: null, events: [], places: [] })
    expect(f.low_coverage).toBe(false)
  })
})

describe('AI output validation', () => {
  const facts = buildFactPack({ weekStart: '2026-11-02', score: 64, previousScore: 67, subScores, coverage: 0.9, events: [ev({}), ev({ t: evening + 60_000 })], places: [githurai] })
  const good = {
    message_sw: 'Breki zako za ghafla zilitokea karibu na Githurai 45 roundabout saa 18:00–20:00. Punguza mwendo hadi 30 km/h.',
    message_en: 'Your harsh braking happened near Githurai 45 roundabout, 18:00–20:00. Slow to 30 km/h.',
    focus: 'Githurai 45 roundabout · 18:00–20:00',
  }

  test('accepts valid JSON, with or without a code fence', () => {
    expect(parseAiCoaching(JSON.stringify(good), facts)).toEqual(good)
    expect(parseAiCoaching('```json\n' + JSON.stringify(good) + '\n```', facts)).toEqual(good)
  })

  test('rejects an invented statistic', () => {
    const invented = { ...good, message_en: 'Riders like you cut crashes by 73% when they slow to 30 km/h.' }
    expect(parseAiCoaching(JSON.stringify(invented), facts)).toBeNull()
  })

  test('rejects missing fields, overlong text and non-JSON', () => {
    expect(parseAiCoaching(JSON.stringify({ message_sw: good.message_sw }), facts)).toBeNull()
    expect(parseAiCoaching(JSON.stringify({ ...good, message_sw: 'a'.repeat(500) }), facts)).toBeNull()
    expect(parseAiCoaching('Here is your coaching: slow down!', facts)).toBeNull()
  })
})
