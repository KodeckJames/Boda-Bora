import { z } from 'zod'

// Kenyan motorcycle number plates: KM + two letters, three digits, one letter, e.g. KMFB 412X.
// Accepts any spacing or case and returns the standard form "KMFB 412X".
export function normaliseBikePlate(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, '')
  const m = /^(KM[A-Z]{2})(\d{3}[A-Z])$/.exec(compact)
  return m ? `${m[1]} ${m[2]}` : null
}

export const bikePlate = z.string().transform((v, ctx) => {
  const plate = normaliseBikePlate(v)
  if (!plate) {
    ctx.addIssue({ code: 'custom', message: 'Enter a motorcycle number plate, e.g. KMFB 412X' })
    return z.NEVER
  }
  return plate
})

// A full name: at least two words, so riders can be told apart on SACCO rosters.
export const fullName = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(3)
      .max(100)
      .refine((v) => v.split(' ').length >= 2, { message: 'Enter your full name (first and last name)' }),
  )
