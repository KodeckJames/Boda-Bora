import { sql } from 'drizzle-orm'
import { lineString4326, point4326 } from './geo-types'
import {
  date,

  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Keys match column names (snake_case): Realtime live queries require it, and it keeps
// API responses and SQL in one style.

const id = () => uuid('id').primaryKey().defaultRandom()
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const point = (name: string) => point4326(name)

export const userRole = pgEnum('user_role', ['rider', 'sacco_admin', 'insurer_analyst', 'admin'])
export const batchStatus = pgEnum('batch_status', ['received', 'processing', 'processed', 'failed'])
export const eventType = pgEnum('event_type', ['harsh_braking', 'sharp_cornering', 'rapid_acceleration'])
export const severity = pgEnum('severity', ['low', 'medium', 'high'])
export const shiftSource = pgEnum('shift_source', ['sacco_upload', 'sacco_manual'])
export const coachingSource = pgEnum('coaching_source', ['ai', 'template'])
export const coachingStatus = pgEnum('coaching_status', ['draft', 'published', 'read'])
export const quoteStatus = pgEnum('quote_status', ['pending', 'quoted', 'referred', 'declined'])
export const appLanguage = pgEnum('app_language', ['en', 'sw'])

// ---------- People and organisations ----------

// One row per Neon Auth user (user_id = the JWT `sub`), created on first API call.
export const profiles = pgTable('profiles', {
  user_id: text('user_id').primaryKey(),
  email: text('email'),
  name: text('name'),
  role: userRole('role'), // null until the user completes onboarding
  language: appLanguage('language'), // preferred UI and coaching language; null = not chosen yet
  created_at: createdAt(),
})

export const saccos = pgTable('saccos', {
  id: id(),
  name: text('name').notNull(),
  county: text('county'),
  created_at: createdAt(),
})

export const stages = pgTable(
  'stages',
  {
    id: id(),
    sacco_id: uuid('sacco_id')
      .notNull()
      .references(() => saccos.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    location: point('location'),
    created_at: createdAt(),
  },
  (t) => [index('stages_sacco_idx').on(t.sacco_id)],
)

export const insurers = pgTable('insurers', {
  id: id(),
  name: text('name').notNull(),
  created_at: createdAt(),
})

// Which SACCO or insurer a staff user works for. Scopes every dashboard query.
export const memberships = pgTable(
  'memberships',
  {
    id: id(),
    user_id: text('user_id')
      .notNull()
      .references(() => profiles.user_id, { onDelete: 'cascade' }),
    sacco_id: uuid('sacco_id').references(() => saccos.id, { onDelete: 'cascade' }),
    insurer_id: uuid('insurer_id').references(() => insurers.id, { onDelete: 'cascade' }),
    created_at: createdAt(),
  },
  (t) => [
    uniqueIndex('memberships_user_sacco_idx').on(t.user_id, t.sacco_id),
    uniqueIndex('memberships_user_insurer_idx').on(t.user_id, t.insurer_id),
  ],
)

// Pending role grants. Applied on sign-in when the user's *verified* email matches, which is
// how SACCO staff, insurer staff and SACCO-registered riders get linked to their Google account.
export const invites = pgTable(
  'invites',
  {
    id: id(),
    email: text('email').notNull(), // stored lowercase
    role: userRole('role').notNull(),
    sacco_id: uuid('sacco_id').references(() => saccos.id, { onDelete: 'cascade' }),
    insurer_id: uuid('insurer_id').references(() => insurers.id, { onDelete: 'cascade' }),
    rider_id: uuid('rider_id'), // for rider invites: the rider record the SACCO created
    invited_by: text('invited_by').notNull(),
    accepted_by: text('accepted_by'),
    accepted_at: timestamp('accepted_at', { withTimezone: true }),
    created_at: createdAt(),
  },
  (t) => [index('invites_email_idx').on(t.email)],
)

// A rider can be registered by their SACCO before they sign in; user_id links them later.
export const riders = pgTable(
  'riders',
  {
    id: id(),
    user_id: text('user_id')
      .unique()
      .references(() => profiles.user_id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    phone: text('phone').notNull().unique(), // E.164, e.g. +254712345678
    sacco_id: uuid('sacco_id').references(() => saccos.id),
    stage_id: uuid('stage_id').references(() => stages.id),
    bike_reg: text('bike_reg'),
    created_at: createdAt(),
  },
  (t) => [index('riders_sacco_idx').on(t.sacco_id)],
)

// ---------- Ride data ----------

// SACCO shift records: the reference that trace coverage is measured against.
export const shifts = pgTable(
  'shifts',
  {
    id: id(),
    rider_id: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    sacco_id: uuid('sacco_id')
      .notNull()
      .references(() => saccos.id, { onDelete: 'cascade' }),
    starts_at: timestamp('starts_at', { withTimezone: true }).notNull(),
    ends_at: timestamp('ends_at', { withTimezone: true }).notNull(),
    source: shiftSource('source').notNull(),
    created_at: createdAt(),
  },
  (t) => [
    index('shifts_rider_time_idx').on(t.rider_id, t.starts_at),
    uniqueIndex('shifts_rider_start_idx').on(t.rider_id, t.starts_at),
  ],
)

// One uploaded ride-mode session (a gzipped NDJSON object in the `traces` bucket).
export const upload_batches = pgTable(
  'upload_batches',
  {
    id: id(),
    rider_id: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    object_key: text('object_key').notNull().unique(),
    status: batchStatus('status').notNull().default('received'),
    session_started_at: timestamp('session_started_at', { withTimezone: true }),
    session_ended_at: timestamp('session_ended_at', { withTimezone: true }),
    // Periods the app was hidden or closed during the session: [{ from, to }] in epoch ms.
    gaps: jsonb('gaps').$type<{ from: number; to?: number }[]>(),
    error: text('error'),
    created_at: createdAt(),
    processed_at: timestamp('processed_at', { withTimezone: true }),
    raw_deleted_at: timestamp('raw_deleted_at', { withTimezone: true }), // raw trace removed by retention; summaries kept
  },
  (t) => [index('upload_batches_rider_idx').on(t.rider_id, t.created_at)],
)

export const blackspots = pgTable('blackspots', {
  id: id(),
  name: text('name').notNull(),
  location: point('location').notNull(),
  radius_m: integer('radius_m').notNull().default(150),
  weight: real('weight').notNull().default(1), // relative danger, 1 = typical blackspot
  source: text('source'),
  created_at: createdAt(),
})

export const trips = pgTable(
  'trips',
  {
    id: id(),
    rider_id: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    batch_id: uuid('batch_id').references(() => upload_batches.id, { onDelete: 'cascade' }),
    started_at: timestamp('started_at', { withTimezone: true }).notNull(),
    ended_at: timestamp('ended_at', { withTimezone: true }).notNull(),
    distance_m: real('distance_m').notNull(),
    night_m: real('night_m').notNull().default(0), // distance ridden 19:00–06:00 EAT
    blackspot_m: real('blackspot_m').notNull().default(0), // distance inside blackspot radii
    max_speed_kmh: real('max_speed_kmh'),
    path: lineString4326('path'), // simplified route for maps
    score: real('score'),
    created_at: createdAt(),
  },
  (t) => [index('trips_rider_time_idx').on(t.rider_id, t.started_at)],
)

export const risk_events = pgTable(
  'risk_events',
  {
    id: id(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    rider_id: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    type: eventType('type').notNull(),
    severity: severity('severity').notNull(),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull(),
    location: point('location'),
    speed_kmh: real('speed_kmh'),
    magnitude_g: real('magnitude_g').notNull(),
    blackspot_id: uuid('blackspot_id').references(() => blackspots.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('risk_events_rider_time_idx').on(t.rider_id, t.occurred_at),
    index('risk_events_trip_idx').on(t.trip_id),
  ],
)

// ---------- Scores ----------

const scoreColumns = () => ({
  score: real('score').notNull(),
  braking: real('braking').notNull(),
  cornering: real('cornering').notNull(),
  acceleration: real('acceleration').notNull(),
  night_exposure: real('night_exposure').notNull(),
  route_risk: real('route_risk').notNull(),
  coverage: real('coverage'), // share of SACCO shift time with a trace, 0–1; null = no shift records to check against
  confidence: real('confidence').notNull(), // 0–1; below the threshold, insurers don't see it
})

export const weekly_scores = pgTable(
  'weekly_scores',
  {
    id: id(),
    rider_id: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    week_start: date('week_start').notNull(), // Monday, EAT
    ...scoreColumns(),
    distance_km: real('distance_km').notNull(),
    trip_count: integer('trip_count').notNull(),
    event_count: integer('event_count').notNull(),
    flags: jsonb('flags').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    computed_at: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('weekly_scores_rider_week_idx').on(t.rider_id, t.week_start)],
)

// Latest score per rider, precomputed so reads (dashboards, USSD later) are one lookup.
export const rider_scores_current = pgTable('rider_scores_current', {
  rider_id: uuid('rider_id')
    .primaryKey()
    .references(() => riders.id, { onDelete: 'cascade' }),
  week_start: date('week_start').notNull(),
  ...scoreColumns(),
  delta: real('delta'), // change vs the previous week
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- Coaching ----------

export const coaching_messages = pgTable(
  'coaching_messages',
  {
    id: id(),
    rider_id: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    week_start: date('week_start').notNull(),
    message_sw: text('message_sw').notNull(),
    message_en: text('message_en').notNull(),
    focus: text('focus'), // e.g. "Githurai 45 roundabout · 18:30–19:30"
    facts: jsonb('facts').notNull(), // the fact pack the message was written from
    source: coachingSource('source').notNull(),
    model: text('model'),
    status: coachingStatus('status').notNull().default('published'),
    created_at: createdAt(),
  },
  (t) => [index('coaching_rider_week_idx').on(t.rider_id, t.week_start)],
)

// ---------- Insurance ----------

// A rider's permission for insurers to see their score. insurer_id null = any partner insurer.
export const consents = pgTable(
  'consents',
  {
    id: id(),
    rider_id: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    insurer_id: uuid('insurer_id').references(() => insurers.id, { onDelete: 'cascade' }),
    granted_at: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('consents_rider_idx').on(t.rider_id)],
)

export const quote_requests = pgTable(
  'quote_requests',
  {
    id: id(),
    rider_id: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    insurer_id: uuid('insurer_id')
      .notNull()
      .references(() => insurers.id, { onDelete: 'cascade' }),
    status: quoteStatus('status').notNull().default('pending'),
    score_snapshot: jsonb('score_snapshot').notNull(), // score at request time, for the audit trail
    premium_ksh: integer('premium_ksh'),
    decided_by: text('decided_by'),
    decided_at: timestamp('decided_at', { withTimezone: true }),
    notes: text('notes'),
    created_at: createdAt(),
  },
  (t) => [index('quote_requests_insurer_idx').on(t.insurer_id, t.status)],
)

// ---------- Governance ----------

// Who looked at or changed which rider's data (Kenya Data Protection Act accountability).
export const audit_log = pgTable(
  'audit_log',
  {
    id: id(),
    actor_user_id: text('actor_user_id').notNull(),
    action: text('action').notNull(),
    subject_type: text('subject_type').notNull(),
    subject_id: text('subject_id'),
    meta: jsonb('meta'),
    created_at: createdAt(),
  },
  (t) => [index('audit_subject_idx').on(t.subject_type, t.subject_id)],
)

export type Rider = typeof riders.$inferSelect
export type Profile = typeof profiles.$inferSelect
