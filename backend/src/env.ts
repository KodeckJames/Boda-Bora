import { z } from 'zod'

// Parsed once at startup so a bad config fails fast instead of mid-request.
// Empty values in .env count as unset.
const optional = z.string().optional().transform((v) => v || undefined)

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  DATABASE_URL: optional,
  NEON_AI_GATEWAY_URL: optional,
  NEON_AI_GATEWAY_TOKEN: optional,
  AT_USERNAME: z.string().default('sandbox'),
  AT_API_KEY: optional,
  USSD_CALLBACK_TOKEN: optional,
  USSD_SERVICE_CODE: z.string().default('*384*22#'),
})

export const env = schema.parse(process.env)
export const isProd = env.NODE_ENV === 'production'
