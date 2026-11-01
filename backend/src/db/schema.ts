import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Starter tables. The full schema (trips, events, scores, coaching...) grows from here.
export const saccos = pgTable('saccos', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const riders = pgTable('riders', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(), // E.164, e.g. +254712345678
  saccoId: uuid('sacco_id').references(() => saccos.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Rider = typeof riders.$inferSelect
