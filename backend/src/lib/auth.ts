import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from '../env'

export type AuthEnv = { Variables: { userId: string } }

// Neon Auth (Managed Better Auth) issues JWTs; the Function verifies them against the JWKS.
const jwks = env.NEON_AUTH_JWKS_URL ? createRemoteJWKSet(new URL(env.NEON_AUTH_JWKS_URL)) : undefined
const issuer = env.NEON_AUTH_BASE_URL ? new URL(env.NEON_AUTH_BASE_URL).origin : undefined

export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  if (!jwks) throw new HTTPException(503, { message: 'Auth is not configured' })
  const header = c.req.header('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) {
    throw new HTTPException(401, { message: 'Missing bearer token' })
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer })
    if (!payload.sub) throw new Error('Token has no subject')
    c.set('userId', payload.sub)
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }
  await next()
})
