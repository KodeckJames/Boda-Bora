import { Hono } from 'hono'
import { notImplemented } from '../lib/errors'

// Gemini-generated Kiswahili coaching messages.
export const coaching = new Hono()
  .get('/:riderId', notImplemented) // latest coaching message
  .post('/:riderId/generate', notImplemented) // regenerate from this week's trace
  .post('/:riderId/send', notImplemented) // send via SMS
