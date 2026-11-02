import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from '../env'

export type AuthUser = {
  userId: string
  email: string | null
  emailVerified: boolean
  name: string | null
}

export type AuthEnv = { Variables: { user: AuthUser } }

// Neon Auth (Managed Better Auth, Google sign-in) issues EdDSA JWTs valid for 15 minutes.
// Issuer and audience are both the Neon Auth origin.
const jwks = env.NEON_AUTH_JWKS_URL ? createRemoteJWKSet(new URL(env.NEON_AUTH_JWKS_URL)) : undefined
const origin = env.NEON_AUTH_BASE_URL ? new URL(env.NEON_AUTH_BASE_URL).origin : undefined

export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  if (!jwks || !origin) throw new HTTPException(503, { message: 'Auth is not configured' })
  const header = c.req.header('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) {
    throw new HTTPException(401, { message: 'Missing bearer token' })
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer: origin, audience: origin })
    if (!payload.sub) throw new Error('Token has no subject')
    c.set('user', {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      emailVerified: payload.emailVerified === true,
      name: typeof payload.name === 'string' ? payload.name : null,
    })
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }
  await next()
})
