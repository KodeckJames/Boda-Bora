import { and, eq, isNull, or, sql, type SQL } from 'drizzle-orm'
import { consents } from '../db/schema'

// A rider has shared their score with an insurer when an unrevoked consent names that insurer
// or names no insurer (any partner insurer). Use inside a WHERE as an EXISTS subquery.
export function hasConsent(riderIdColumn: SQL | { name: string }, insurerId: string) {
  return sql`exists (
    select 1 from ${consents}
    where ${consents.rider_id} = ${riderIdColumn}
      and ${consents.revoked_at} is null
      and (${consents.insurer_id} = ${insurerId} or ${consents.insurer_id} is null)
  )`
}

// The same rule for a single rider, as a plain condition on the consents table.
export const activeConsentFor = (riderId: string, insurerId: string) =>
  and(
    eq(consents.rider_id, riderId),
    isNull(consents.revoked_at),
    or(eq(consents.insurer_id, insurerId), isNull(consents.insurer_id)),
  )
