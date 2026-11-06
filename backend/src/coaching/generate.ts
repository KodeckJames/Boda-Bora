import { z } from 'zod'
import { chat, COACHING_MODEL } from '../lib/ai'
import { env } from '../env'
import type { FactPack } from './facts'
import { templateCoaching, type Coaching } from './template'

const MAX_CHARS = 480 // about three SMS segments, for when SMS delivery arrives

const SYSTEM = [
  'Wewe ni kocha wa usalama wa waendesha boda boda nchini Kenya.',
  'Andika ushauri mfupi, wa heshima na wa vitendo, ukitumia UKWELI ULIOTOLEWA TU.',
  'Usibuni namba, mahali, nyakati wala takwimu ambazo hazipo kwenye ukweli.',
  'Taja mahali na saa hatari ikiwa zimetolewa, na kitendo kimoja mahususi cha kubadilisha wiki ijayo.',
  'Usitumie jina la mendeshaji. Sentensi 2 hadi 3.',
  'Jibu kwa JSON pekee: {"message_sw": "...", "message_en": "...", "focus": "mahali · saa au null"}',
  'message_en ni tafsiri ya Kiingereza ya message_sw.',
].join('\n')

const aiOutput = z.object({
  message_sw: z.string().min(20).max(MAX_CHARS),
  message_en: z.string().min(20).max(MAX_CHARS),
  focus: z.string().max(120).nullable(),
})

// Numbers anywhere in the facts (scores, counts, hours, speeds). A message may only use these.
function allowedNumbers(facts: FactPack) {
  return new Set(JSON.stringify(facts).match(/\d+/g) ?? [])
}

// Rejects output that states a number the facts don't contain (an invented statistic).
export function usesOnlyFactNumbers(text: string, facts: FactPack) {
  const allowed = allowedNumbers(facts)
  return (text.match(/\d+/g) ?? []).every((n) => allowed.has(n) || allowed.has(String(Number(n))))
}

export function parseAiCoaching(raw: string, facts: FactPack): Coaching | null {
  const json = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  const result = aiOutput.safeParse(parsed)
  if (!result.success) return null
  const c = result.data
  if (!usesOnlyFactNumbers(`${c.message_sw} ${c.message_en} ${c.focus ?? ''}`, facts)) return null
  return c
}

export type GeneratedCoaching = Coaching & { source: 'ai' | 'template'; model: string | null; fallbackReason?: string }

export async function generateCoaching(facts: FactPack): Promise<GeneratedCoaching> {
  if (!env.NEON_AI_GATEWAY_BASE_URL || !env.NEON_AI_GATEWAY_TOKEN) {
    return { ...templateCoaching(facts), source: 'template', model: null, fallbackReason: 'ai_not_configured' }
  }
  try {
    const raw = await chat([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Ukweli wa wiki hii (JSON):\n${JSON.stringify(facts)}` },
    ])
    const ai = parseAiCoaching(raw, facts)
    if (ai) return { ...ai, source: 'ai', model: COACHING_MODEL }
    return { ...templateCoaching(facts), source: 'template', model: null, fallbackReason: 'ai_output_rejected' }
  } catch (err) {
    console.error('coaching AI call failed', (err as Error).message)
    return { ...templateCoaching(facts), source: 'template', model: null, fallbackReason: 'ai_error' }
  }
}
