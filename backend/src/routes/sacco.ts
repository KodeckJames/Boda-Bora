import { Hono } from 'hono'
import { notImplemented } from '../lib/errors'

// SACCO fleet monitoring and shift records (used for coverage cross-checks).
export const sacco = new Hono()
  .get('/:saccoId/fleet', notImplemented) // fleet stats + rider list
  .get('/:saccoId/flags', notImplemented) // riders needing attention
  .post('/:saccoId/shifts', notImplemented) // upload shift records
