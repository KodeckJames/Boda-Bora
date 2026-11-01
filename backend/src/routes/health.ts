import { Hono } from 'hono'
import { env } from '../env'

export const health = new Hono().get('/', (c) =>
  c.json({ status: 'ok', env: env.NODE_ENV, uptime: process.uptime() }),
)
