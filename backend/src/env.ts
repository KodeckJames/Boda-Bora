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
  // Neon-managed: injected in deployed Functions, pulled into .env locally by `neon deploy`.
  DATABASE_URL: optional,
  NEON_AUTH_BASE_URL: optional,
  NEON_AUTH_JWKS_URL: optional,
  NEON_REALTIME_URL: optional,
  NEON_REALTIME_SECRET: optional,
  REALTIME_SECRET: optional, // same secret, under the name deployed Functions receive it
  NEON_AI_GATEWAY_BASE_URL: optional,
  NEON_AI_GATEWAY_TOKEN: optional,
  // Object Storage uses the standard AWS_* variables, read by the S3 client directly.
  AWS_ENDPOINT_URL_S3: optional,
  AT_USERNAME: z.string().default('sandbox'),
  AT_API_KEY: optional,
  USSD_CALLBACK_TOKEN: optional,
  USSD_SERVICE_CODE: z.string().default('*384*22#'),
})

export const env = schema.parse(process.env)
export const isProd = env.NODE_ENV === 'production'
