import { and, eq, isNull } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { db } from '../db/client'
import { invites, memberships, profiles, riders, type Profile } from '../db/schema'
import { env } from '../env'
import type { AuthEnv } from './auth'

export type Role = NonNullable<Profile['role']>

export type Access = {
  profile: Profile
  riderId: string | null // the caller's own rider record, if they're a rider
  saccoIds: string[] // SACCOs the caller administers
  insurerIds: string[] // insurers the caller works for
}

export type AccessEnv = AuthEnv & { Variables: AuthEnv['Variables'] & { access: Access } }

const adminEmails = new Set(env.ADMIN_EMAILS.map((e) => e.toLowerCase()))

// Accepts pending invites for a verified email. Only verified emails count: otherwise anyone
// could register an unverified account with a staff member's address and take their role.
async function acceptInvites(userId: string, email: string) {
  const pending = await db
    .select()
    .from(invites)
    .where(and(eq(invites.email, email), isNull(invites.accepted_at)))
  for (const inv of pending) {
    await db.transaction(async (tx) => {
      await tx.update(profiles).set({ role: inv.role }).where(eq(profiles.user_id, userId))
      if (inv.sacco_id && inv.role === 'sacco_admin') {
        await tx.insert(memberships).values({ user_id: userId, sacco_id: inv.sacco_id }).onConflictDoNothing()
      }
      if (inv.insurer_id && inv.role === 'insurer_analyst') {
        await tx.insert(memberships).values({ user_id: userId, insurer_id: inv.insurer_id }).onConflictDoNothing()
      }
      if (inv.rider_id && inv.role === 'rider') {
        await tx
          .update(riders)
          .set({ user_id: userId })
          .where(and(eq(riders.id, inv.rider_id), isNull(riders.user_id)))
      }
      await tx
        .update(invites)
        .set({ accepted_by: userId, accepted_at: new Date() })
        .where(eq(invites.id, inv.id))
    })
  }
}

async function loadAccess(profile: Profile): Promise<Access> {
  const [rider] = await db.select({ id: riders.id }).from(riders).where(eq(riders.user_id, profile.user_id))
  const rows = await db.select().from(memberships).where(eq(memberships.user_id, profile.user_id))
  return {
    profile,
    riderId: rider?.id ?? null,
    saccoIds: rows.flatMap((m) => (m.sacco_id ? [m.sacco_id] : [])),
    insurerIds: rows.flatMap((m) => (m.insurer_id ? [m.insurer_id] : [])),
  }
}

// Runs after requireUser: makes sure the caller has a profile, applies invites, loads scopes.
export const withAccess = createMiddleware<AccessEnv>(async (c, next) => {
  const user = c.get('user')
  const verifiedEmail = user.emailVerified ? user.email : null
  await db
    .insert(profiles)
    .values({ user_id: user.userId, email: user.email, name: user.name })
    .onConflictDoUpdate({ target: profiles.user_id, set: { email: user.email, name: user.name } })

  if (verifiedEmail) {
    if (adminEmails.has(verifiedEmail)) {
      await db.update(profiles).set({ role: 'admin' }).where(eq(profiles.user_id, user.userId))
    }
    await acceptInvites(user.userId, verifiedEmail)
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.user_id, user.userId))
  c.set('access', await loadAccess(profile!))
  await next()
})

export const requireRole = (...roles: Role[]) =>
  createMiddleware<AccessEnv>(async (c, next) => {
    const role = c.get('access').profile.role
    if (!role || !roles.includes(role)) {
      throw new HTTPException(403, { message: `Requires role: ${roles.join(' or ')}` })
    }
    await next()
  })

// Throws unless the caller administers this SACCO (admins see everything).
export function assertSacco(access: Access, saccoId: string) {
  if (access.profile.role === 'admin') return
  if (!access.saccoIds.includes(saccoId)) throw new HTTPException(403, { message: 'Not your SACCO' })
}

// Rider-level data: the rider themself, an admin of the rider's SACCO, or a platform admin.
// Insurers never get rider data this way; they only see consented scores via the insurer API.
export async function assertCanViewRider(access: Access, riderId: string) {
  if (access.profile.role === 'admin' || access.riderId === riderId) return
  if (access.profile.role === 'sacco_admin' && access.saccoIds.length > 0) {
    const [rider] = await db.select({ sacco_id: riders.sacco_id }).from(riders).where(eq(riders.id, riderId))
    if (rider?.sacco_id && access.saccoIds.includes(rider.sacco_id)) return
  }
  throw new HTTPException(404, { message: 'Rider not found' }) // 404, so rider ids can't be probed
}

export function assertInsurer(access: Access, insurerId: string) {
  if (access.profile.role === 'admin') return
  if (!access.insurerIds.includes(insurerId)) throw new HTTPException(403, { message: 'Not your insurer' })
}
