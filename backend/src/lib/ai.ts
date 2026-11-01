import { HTTPException } from 'hono/http-exception'
import { env } from '../env'

export const COACHING_MODEL = 'gemini-3-flash'

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

// Neon AI Gateway, OpenAI-compatible chat completions. Needs a paid Neon plan.
export async function chat(messages: Message[], model = COACHING_MODEL) {
  if (!env.NEON_AI_GATEWAY_BASE_URL || !env.NEON_AI_GATEWAY_TOKEN) {
    throw new HTTPException(503, { message: 'AI Gateway is not configured' })
  }
  const res = await fetch(`${env.NEON_AI_GATEWAY_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.NEON_AI_GATEWAY_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
  })
  if (!res.ok) {
    throw new HTTPException(502, { message: `AI Gateway error ${res.status}: ${await res.text()}` })
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message.content ?? ''
}
