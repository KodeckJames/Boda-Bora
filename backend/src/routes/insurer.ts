import { Hono } from 'hono'
import { notImplemented } from '../lib/errors'

// Underwriting: tiers, score distribution, quote requests (consented riders only).
export const insurer = new Hono()
  .get('/tiers', notImplemented)
  .get('/distribution', notImplemented)
  .get('/quotes', notImplemented)
  .post('/quotes/:quoteId/decision', notImplemented)
