import {
  sqliteTable, text, integer, primaryKey,
  uniqueIndex, index,
} from 'drizzle-orm/sqlite-core'

const uuid = (name: string) => text(name)
const tsMs = (name: string) => integer(name, { mode: 'timestamp_ms' })

export const users = sqliteTable('users', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull(),
  tier: text('tier').notNull().default('pro'),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
})

export const orderTypes = sqliteTable('order_types', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  digit: integer('digit').notNull(),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userIdx: index('order_types_user_idx').on(t.userId),
  uniqueUserDigit: uniqueIndex('order_types_user_digit_uq').on(t.userId, t.digit),
  uniqueUserName: uniqueIndex('order_types_user_name_uq').on(t.userId, t.name),
}))

export const customers = sqliteTable('customers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  customerNumber: text('customer_number').notNull(),
  orderTypeId: uuid('order_type_id').notNull().references(() => orderTypes.id),
  name: text('name').notNull(),
  street: text('street'),
  zip: text('zip'),
  city: text('city'),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userIdx: index('customers_user_idx').on(t.userId),
  uniqueUserNumber: uniqueIndex('customers_user_number_uq').on(t.userId, t.customerNumber),
  numberingIdx: index('customers_numbering_idx').on(t.userId, t.orderTypeId, t.createdAt),
}))

export const projects = sqliteTable('projects', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  title: text('title').notNull(),
  description: text('description'),
  color: text('color').notNull(),
  pricingMode: text('pricing_mode').notNull(),
  hourlyRateCents: integer('hourly_rate_cents'),
  fixedPriceCents: integer('fixed_price_cents'),
  status: text('status').notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userStatusIdx: index('projects_user_status_updated_idx').on(t.userId, t.status, t.updatedAt),
  userSortIdx: index('projects_user_status_sort_idx').on(t.userId, t.status, t.sortOrder),
}))

export const tasks = sqliteTable('tasks', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  description: text('description').notNull(),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userIdx: index('tasks_user_idx').on(t.userId),
  uniqueUserDesc: uniqueIndex('tasks_user_description_uq').on(t.userId, t.description),
}))

export const tags = sqliteTable('tags', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userIdx: index('tags_user_idx').on(t.userId),
  uniqueUserTitle: uniqueIndex('tags_user_title_uq').on(t.userId, t.title),
}))

export const taskTags = sqliteTable('task_tags', {
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.tagId] }),
  userIdx: index('task_tags_user_idx').on(t.userId),
}))

export const projectTasks = sqliteTable('project_tasks', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.taskId] }),
  userIdx: index('project_tasks_user_idx').on(t.userId),
}))

export const timeEntries = sqliteTable('time_entries', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  startedAt: tsMs('started_at').notNull(),
  endedAt: tsMs('ended_at').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  rateSnapshotCents: integer('rate_snapshot_cents'),
  pricingModeSnapshot: text('pricing_mode_snapshot').notNull(),
  notes: text('notes'),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
  deletedAt: tsMs('deleted_at'),
}, (t) => ({
  userStartedIdx: index('time_entries_user_started_idx').on(t.userId, t.startedAt),
  userProjectIdx: index('time_entries_user_project_idx').on(t.userId, t.projectId, t.startedAt),
  userUpdatedIdx: index('time_entries_user_updated_idx').on(t.userId, t.updatedAt),
}))

export const timers = sqliteTable('timers', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  startedAt: tsMs('started_at').notNull(),
  createdAt: tsMs('created_at').notNull(),
  updatedAt: tsMs('updated_at').notNull(),
}, (t) => ({
  uniqueUser: uniqueIndex('timers_user_uq').on(t.userId),
}))

export const appSettings = sqliteTable('app_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  pinHash: text('pin_hash'),
  biometricEnabled: integer('biometric_enabled', { mode: 'boolean' }).notNull().default(false),
  lastExportPeriod: text('last_export_period'),
  updatedAt: tsMs('updated_at').notNull(),
})
