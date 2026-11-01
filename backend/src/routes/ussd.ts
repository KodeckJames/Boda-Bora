import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

// Africa's Talking USSD callback: form-encoded POST, plain-text reply starting with
// "CON" (continue session) or "END" (close session).
const ussdRequest = z.object({
  sessionId: z.string(),
  serviceCode: z.string(),
  phoneNumber: z.string(),
  networkCode: z.string().optional(),
  text: z.string().default(''),
})

export const ussd = new Hono().post('/', zValidator('form', ussdRequest), (c) => {
  const { text } = c.req.valid('form')
  // TODO: check USSD_CALLBACK_TOKEN, look up the rider by phoneNumber, route menu choices.
  const reply =
    text === ''
      ? 'CON Karibu Boda Bora\n1. Alama yangu\n2. Ushauri wa wiki\n3. Safari za wiki\n4. Shiriki na bima\n0. English'
      : 'END Huduma hii inakuja hivi karibuni.'
  return c.text(reply)
})
