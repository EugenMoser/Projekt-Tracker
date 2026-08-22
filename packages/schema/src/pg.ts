import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  displayName: text('display_name').notNull(),
  tier: text('tier').notNull().default('pro'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orderTypes = pgTable(
  'order_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    digit: smallint('digit').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('order_types_user_idx').on(t.userId),
    uniqueUserDigit: uniqueIndex('order_types_user_digit_uq').on(t.userId, t.digit),
    uniqueUserName: uniqueIndex('order_types_user_name_uq').on(t.userId, t.name),
  }),
)

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    customerNumber: varchar('customer_number', { length: 8 }).notNull(),
    orderTypeId: uuid('order_type_id')
      .notNull()
      .references(() => orderTypes.id),
    name: text('name').notNull(),
    street: text('street'),
    zip: varchar('zip', { length: 10 }),
    city: text('city'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('customers_user_idx').on(t.userId),
    uniqueUserNumber: uniqueIndex('customers_user_number_uq').on(t.userId, t.customerNumber),
    numberingIdx: index('customers_numbering_idx').on(t.userId, t.orderTypeId, t.createdAt),
  }),
)

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    title: text('title').notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).notNull(),
    pricingMode: text('pricing_mode').notNull(),
    hourlyRateCents: integer('hourly_rate_cents'),
    fixedPriceCents: integer('fixed_price_cents'),
    status: text('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userStatusIdx: index('projects_user_status_updated_idx').on(t.userId, t.status, t.updatedAt),
    userSortIdx: index('projects_user_status_sort_idx').on(t.userId, t.status, t.sortOrder),
    pricingModeCheck: check('pricing_mode_valid', sql`pricing_mode IN ('hourly', 'fixed')`),
    statusCheck: check('status_valid', sql`status IN ('active', 'archived')`),
    pricingXor: check(
      'pricing_xor',
      sql`
    (pricing_mode = 'hourly' AND hourly_rate_cents IS NOT NULL AND fixed_price_cents IS NULL) OR
    (pricing_mode = 'fixed'  AND fixed_price_cents  IS NOT NULL AND hourly_rate_cents  IS NULL)
  `,
    ),
  }),
)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('tasks_user_idx').on(t.userId),
    uniqueUserDesc: uniqueIndex('tasks_user_description_uq').on(t.userId, t.description),
  }),
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('tags_user_idx').on(t.userId),
    uniqueUserTitle: uniqueIndex('tags_user_title_uq').on(t.userId, t.title),
  }),
)

export const taskTags = pgTable(
  'task_tags',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.tagId] }),
    userIdx: index('task_tags_user_idx').on(t.userId),
  }),
)

export const projectTasks = pgTable(
  'project_tasks',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.taskId] }),
    userIdx: index('project_tasks_user_idx').on(t.userId),
  }),
)

export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    durationSeconds: integer('duration_seconds')
      .generatedAlwaysAs(sql`EXTRACT(EPOCH FROM ended_at - started_at)::int`)
      .notNull(),
    rateSnapshotCents: integer('rate_snapshot_cents'),
    pricingModeSnapshot: text('pricing_mode_snapshot').notNull(),
    notes: text('notes'),
    billable: boolean('billable').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userStartedIdx: index('time_entries_user_started_idx').on(t.userId, t.startedAt),
    userProjectIdx: index('time_entries_user_project_idx').on(t.userId, t.projectId, t.startedAt),
    userUpdatedIdx: index('time_entries_user_updated_idx').on(t.userId, t.updatedAt),
  }),
)

export const timers = pgTable(
  'timers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueUser: uniqueIndex('timers_user_uq').on(t.userId),
  }),
)

export const appSettings = pgTable('app_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  pinHash: text('pin_hash'),
  biometricEnabled: boolean('biometric_enabled').notNull().default(false),
  lastExportPeriod: text('last_export_period'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
