import { afterEach, describe, expect, setSystemTime, test } from 'bun:test'
import { Hono } from 'hono'
import { parseShiftCsv } from '../routes/sacco'
import { rateLimit, resetRateLimits } from './rate-limit'

afterEach(() => {
  resetRateLimits()
  setSystemTime()
})

const appFor = (by: 'user' | 'ip') =>
  new Hono<{ Variables: { user: { userId: string } } }>()
    .use(async (c, next) => {
      const u = c.req.header('x-test-user')
      if (u) c.set('user', { userId: u })
      await next()
    })
    .get('/', rateLimit({ name: `t-${by}`, max: 2, windowMs: 60_000, by }), (c) => c.text('ok'))

describe('rate limiting', () => {
  test('blocks after the limit with Retry-After, then resets with the window', async () => {
    const app = appFor('ip')
    const hit = () => app.request('/', { headers: { 'x-forwarded-for': '10.0.0.1' } })
    setSystemTime(new Date('2026-11-06T10:00:00Z'))
    expect((await hit()).status).toBe(200)
    expect((await hit()).status).toBe(200)
    const blocked = await hit()
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
    setSystemTime(new Date('2026-11-06T10:01:01Z'))
    expect((await hit()).status).toBe(200)
  })

  test('per-user limits count each user separately', async () => {
    const app = appFor('user')
    const as = (u: string) => app.request('/', { headers: { 'x-test-user': u } })
    await as('a')
    await as('a')
    expect((await as('a')).status).toBe(429)
    expect((await as('b')).status).toBe(200)
  })
})

describe('shift CSV', () => {
  test('parses phone,starts_at,ends_at with any column order and blank lines', () => {
    const rows = parseShiftCsv('ends_at,phone,starts_at\r\n2026-11-02T14:00:00+03:00,0712 345 678,2026-11-02T06:00:00+03:00\n\n')
    expect(rows).toEqual([{ phone: '0712 345 678', rider_id: undefined, starts_at: '2026-11-02T06:00:00+03:00', ends_at: '2026-11-02T14:00:00+03:00' }])
  })

  test('rejects a file without the required header', () => {
    expect(() => parseShiftCsv('name,date\nKevin,2026-11-02')).toThrow('header')
  })
})
