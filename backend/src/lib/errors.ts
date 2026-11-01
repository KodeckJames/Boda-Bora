import type { Context, ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { isProd } from '../env'

export const notFound: NotFoundHandler = (c) =>
  c.json({ error: `Route not found: ${c.req.method} ${c.req.path}` }, 404)

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)
  return c.json({ error: isProd ? 'Internal server error' : err.message }, 500)
}

// Placeholder for endpoints whose logic hasn't been written yet.
export const notImplemented = (c: Context) =>
  c.json({ error: 'Not implemented yet', route: `${c.req.method} ${c.req.path}` }, 501)
