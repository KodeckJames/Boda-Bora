import type { FactPack } from './facts'

// Deterministic coaching used when the AI is unavailable or its output fails validation.
// Written from the fact pack only, so it can never state anything the data doesn't support.

export type Coaching = { message_sw: string; message_en: string; focus: string | null }

const sw = {
  harsh_braking: 'breki za ghafla',
  sharp_cornering: 'kona kali',
  rapid_acceleration: 'kuongeza mwendo ghafla',
} as const
const en = {
  harsh_braking: 'harsh braking',
  sharp_cornering: 'sharp cornering',
  rapid_acceleration: 'sudden acceleration',
} as const
const actionSw = {
  harsh_braking: (s: number | null) => (s ? `Punguza mwendo hadi ${s} km/h mapema na uache nafasi mbele yako.` : 'Punguza mwendo mapema na uache nafasi mbele yako.'),
  sharp_cornering: (s: number | null) => (s ? `Ingia kwenye kona kwa ${s} km/h au chini.` : 'Punguza mwendo kabla ya kuingia kwenye kona.'),
  rapid_acceleration: () => 'Ongeza mwendo polepole unapoondoka.',
}
const actionEn = {
  harsh_braking: (s: number | null) => (s ? `Slow to ${s} km/h early and leave space ahead.` : 'Slow down early and leave space ahead.'),
  sharp_cornering: (s: number | null) => (s ? `Take the corner at ${s} km/h or less.` : 'Slow down before you turn.'),
  rapid_acceleration: () => 'Pull away gently.',
}

export function templateCoaching(f: FactPack): Coaching {
  const trend =
    f.change === null ? '' : f.change > 0 ? ` (+${f.change})` : f.change < 0 ? ` (${f.change})` : ''
  // Too little of the shift recorded: that's the message, whatever the score says.
  if (f.low_coverage) {
    return {
      message_sw: `Alama yako wiki hii ni ${f.score}${trend}, lakini app ilirekodi ${f.coverage_pct}% tu ya zamu zako. Bonyeza "Anza kazi" mwanzo wa kila zamu na uiache ikirekodi hadi mwisho, ili alama yako iaminike na bima.`,
      message_en: `Your score this week is ${f.score}${trend}, but the app recorded only ${f.coverage_pct}% of your shifts. Tap "Start shift" at the start of every shift and leave it recording to the end, so insurers can trust your score.`,
      focus: null,
    }
  }
  if (!f.focus) {
    return {
      message_sw: `Alama yako wiki hii ni ${f.score}${trend}. Hakuna tukio la hatari lililorekodiwa. Endelea hivyo!`,
      message_en: `Your score this week is ${f.score}${trend}. No risky events were recorded. Keep it up!`,
      focus: null,
    }
  }
  const { event_type: type, count, place, hours } = f.focus
  const whereSw = place ? ` karibu na ${place}` : ''
  const whereEn = place ? ` near ${place}` : ''
  return {
    message_sw:
      `Alama yako wiki hii ni ${f.score}${trend}. Ulikuwa na ${sw[type]} mara ${count}${whereSw}, saa ${hours}. ` +
      `${actionSw[type](f.advice_speed_kmh)} Ukifanya hivi, alama yako inaweza kufika ${f.target_score}.`,
    message_en:
      `Your score this week is ${f.score}${trend}. You had ${count} ${en[type]} event${count === 1 ? '' : 's'}${whereEn}, ${hours}. ` +
      `${actionEn[type](f.advice_speed_kmh)} Do this and your score could reach ${f.target_score}.`,
    focus: [place, hours].filter(Boolean).join(' · '),
  }
}
