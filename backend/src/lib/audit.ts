import { db } from '../db/client'
import { audit_log } from '../db/schema'

// Records who viewed or changed which rider's data. Never blocks the request on failure.
export async function audit(
  actorUserId: string,
  action: string,
  subjectType: string,
  subjectId?: string | null,
  meta?: Record<string, unknown>,
) {
  await db
    .insert(audit_log)
    .values({ actor_user_id: actorUserId, action, subject_type: subjectType, subject_id: subjectId, meta })
    .catch((err) => console.error('audit log write failed', err))
}
