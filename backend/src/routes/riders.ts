import { Hono } from 'hono'
import { notImplemented } from '../lib/errors'

// Rider profiles, scores and weekly traces.
export const riders = new Hono()
  .get('/', notImplemented) // list riders
  .get('/:id', notImplemented) // rider profile
  .get('/:id/score', notImplemented) // current Rider Safety Score + sub-scores + coverage confidence
  .get('/:id/week', notImplemented) // weekly trace: events, hourly risk, route
  .get('/:id/trips', notImplemented) // recent trips
