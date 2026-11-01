import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { chat } from '../lib/ai'
import { requireUser, type AuthEnv } from '../lib/auth'
import { notImplemented } from '../lib/errors'

// Gemini-generated Kiswahili coaching messages.
export const coaching = new Hono<AuthEnv>()
  .get('/:riderId', notImplemented) // latest coaching message
  // Regenerate from this week's trace. TODO: build the fact pack from the rider's scores.
  .post(
    '/:riderId/generate',
    requireUser,
    zValidator('json', z.object({ facts: z.string().min(1).max(2000) })),
    async (c) => {
      const { facts } = c.req.valid('json')
      const message = await chat([
        {
          role: 'system',
          content:
            'Wewe ni kocha wa usalama wa boda boda. Andika ushauri mfupi kwa Kiswahili (sentensi 2-3) ukitumia ukweli uliotolewa tu.',
        },
        { role: 'user', content: facts },
      ])
      return c.json({ message })
    },
  )
  .post('/:riderId/send', notImplemented) // send via SMS
