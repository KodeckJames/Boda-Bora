import type { Context, MiddlewareHandler } from 'hono'

// Fixed-window rate limits held in memory. Each Function isolate counts on its own, so under
// load the effective limit is a multiple of `max`: this stops runaway clients and casual
// abuse, not a determined attacker. Move the counters to a shared store (e.g. Upstash Redis)
// when exact limits matter.

type Window = { count: number; resetAt: number }
const windows = new Map<string, Window>()
const MAX_KEYS = 50_000

function clientIp(c: Context) {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown'
}

export function rateLimit(opts: { name: string; max: number; windowMs: number; by: 'user' | 'ip' }): MiddlewareHandler {
  return async (c, next) => {
    const now = Date.now()
    const who = opts.by === 'user' ? ((c.get('user') as { userId?: string } | undefined)?.userId ?? clientIp(c)) : clientIp(c)
    const key = `${opts.name}:${who}`
    let w = windows.get(key)
    if (!w || w.resetAt <= now) {
      if (windows.size >= MAX_KEYS) for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k)
      w = { count: 0, resetAt: now + opts.windowMs }
      windows.set(key, w)
    }
    w.count++
    c.header('RateLimit-Limit', String(opts.max))
    c.header('RateLimit-Remaining', String(Math.max(0, opts.max - w.count)))
    if (w.count > opts.max) {
      const retry = Math.ceil((w.resetAt - now) / 1000)
      c.header('Retry-After', String(retry))
      return c.json({ error: `Too many requests. Try again in ${retry} s.` }, 429)
    }
    await next()
  }
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

// For tests.
export const resetRateLimits = () => windows.clear()
