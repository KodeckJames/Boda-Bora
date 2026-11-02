import { z } from 'zod'

// Kenyan mobile numbers, normalised to E.164: 0712345678, 712345678, 254712345678 → +254712345678.
export function normaliseKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '').replace(/^\+/, '')
  const local = digits.startsWith('254') ? digits.slice(3) : digits.replace(/^0/, '')
  return /^[17]\d{8}$/.test(local) ? `+254${local}` : null
}

export const kenyanPhone = z
  .string()
  .transform((v, ctx) => {
    const phone = normaliseKenyanPhone(v)
    if (!phone) {
      ctx.addIssue({ code: 'custom', message: 'Enter a Kenyan mobile number, e.g. 0712 345 678' })
      return z.NEVER
    }
    return phone
  })
