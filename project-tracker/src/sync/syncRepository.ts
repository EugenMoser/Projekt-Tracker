import { eq, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import * as schema from '@projekt-tracker/schema'
import type { PushPayload, PullResponse } from './types'
import { LOCAL_USER_ID } from './config'

type AnyDb = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>

function toISO(d: Date): string { return d.toISOString() }
function toISOOrNull(d: Date | null | undefined): string | null {
  return d != null ? d.toISOString() : null
}
function toDate(s: string): Date { return new Date(s) }
function toDateOrNull(s: string | null | undefined): Date | null {
  return s != null ? new Date(s) : null
}

export function collectPushPayload(
  db: AnyDb,
  userId: string,
  since: Date | null,
): PushPayload {
  const bDb = db as BetterSQLite3Database<typeof schema>

  function withSince<T extends { updatedAt: Date }>(
    rows: T[],
  ): T[] {
    return since ? rows.filter((r) => r.updatedAt.getTime() > since.getTime()) : rows
  }

  const orderTypesAll = bDb.select().from(schema.orderTypes)
    .where(eq(schema.orderTypes.userId, userId)).all()
  const customersAll = bDb.select().from(schema.customers)
    .where(eq(schema.customers.userId, userId)).all()
  const projectsAll = bDb.select().from(schema.projects)
    .where(eq(schema.projects.userId, userId)).all()
  const tasksAll = bDb.select().from(schema.tasks)
    .where(eq(schema.tasks.userId, userId)).all()
  const tagsAll = bDb.select().from(schema.tags)
    .where(eq(schema.tags.userId, userId)).all()
  const timeEntriesAll = bDb.select().from(schema.timeEntries)
    .where(eq(schema.timeEntries.userId, userId)).all()

  // Join tables + timers: always full set (server does full replace)
  const taskTagsAll = bDb.select().from(schema.taskTags)
    .where(eq(schema.taskTags.userId, userId)).all()
  const projectTasksAll = bDb.select().from(schema.projectTasks)
    .where(eq(schema.projectTasks.userId, userId)).all()
  const timersAll = bDb.select().from(schema.timers)
    .where(eq(schema.timers.userId, userId)).all()
  const appSettingsRow = bDb.select().from(schema.appSettings)
    .where(eq(schema.appSettings.userId, userId)).get() ?? null

  const orderTypes = withSince(orderTypesAll)
  const customers = withSince(customersAll)
  const projects = withSince(projectsAll)
  const tasks = withSince(tasksAll)
  const tags = withSince(tagsAll)
  const timeEntries = withSince(timeEntriesAll)

  return {
    orderTypes: orderTypes.map((r) => ({
      id: r.id, name: r.name, digit: r.digit,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    customers: customers.map((r) => ({
      id: r.id, customerNumber: r.customerNumber, orderTypeId: r.orderTypeId,
      name: r.name, street: r.street ?? null, zip: r.zip ?? null, city: r.city ?? null,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    projects: projects.map((r) => ({
      id: r.id, customerId: r.customerId, title: r.title,
      description: r.description ?? null, color: r.color,
      pricingMode: r.pricingMode as 'hourly' | 'fixed',
      hourlyRateCents: r.hourlyRateCents ?? null,
      fixedPriceCents: r.fixedPriceCents ?? null,
      status: r.status as 'active' | 'archived',
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    tasks: tasks.map((r) => ({
      id: r.id, description: r.description,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    tags: tags.map((r) => ({
      id: r.id, title: r.title,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    timeEntries: timeEntries.map((r) => ({
      id: r.id, projectId: r.projectId, taskId: r.taskId,
      startedAt: toISO(r.startedAt), endedAt: toISO(r.endedAt),
      durationSeconds: r.durationSeconds,
      rateSnapshotCents: r.rateSnapshotCents ?? null,
      pricingModeSnapshot: r.pricingModeSnapshot as 'hourly' | 'fixed',
      notes: r.notes ?? null,
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
      deletedAt: toISOOrNull(r.deletedAt),
    })),
    taskTags: taskTagsAll.map((r) => ({ taskId: r.taskId, tagId: r.tagId })),
    projectTasks: projectTasksAll.map((r) => ({ projectId: r.projectId, taskId: r.taskId })),
    timers: timersAll.map((r) => ({
      id: r.id, projectId: r.projectId,
      startedAt: toISO(r.startedAt),
      createdAt: toISO(r.createdAt), updatedAt: toISO(r.updatedAt),
    })),
    appSettings: appSettingsRow ? {
      pinHash: appSettingsRow.pinHash ?? null,
      biometricEnabled: appSettingsRow.biometricEnabled,
      lastExportPeriod: appSettingsRow.lastExportPeriod ?? null,
      updatedAt: toISO(appSettingsRow.updatedAt),
    } : null,
  }
}

export function applyPull(db: AnyDb, data: PullResponse): void {
  const bDb = db as BetterSQLite3Database<typeof schema>

  // 1. orderTypes
  for (const r of data.orderTypes) {
    bDb.insert(schema.orderTypes).values({
      id: r.id, userId: LOCAL_USER_ID,
      name: r.name, digit: r.digit,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.orderTypes.id,
      set: {
        name: sql`excluded.name`,
        digit: sql`excluded.digit`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > order_types.updated_at`,
    }).run()
  }

  // 2. customers
  for (const r of data.customers) {
    bDb.insert(schema.customers).values({
      id: r.id, userId: LOCAL_USER_ID,
      customerNumber: r.customerNumber, orderTypeId: r.orderTypeId,
      name: r.name, street: r.street, zip: r.zip, city: r.city,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.customers.id,
      set: {
        customerNumber: sql`excluded.customer_number`,
        orderTypeId: sql`excluded.order_type_id`,
        name: sql`excluded.name`,
        street: sql`excluded.street`,
        zip: sql`excluded.zip`,
        city: sql`excluded.city`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > customers.updated_at`,
    }).run()
  }

  // 3. tasks
  for (const r of data.tasks) {
    bDb.insert(schema.tasks).values({
      id: r.id, userId: LOCAL_USER_ID,
      description: r.description,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.tasks.id,
      set: {
        description: sql`excluded.description`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > tasks.updated_at`,
    }).run()
  }

  // 4. tags
  for (const r of data.tags) {
    bDb.insert(schema.tags).values({
      id: r.id, userId: LOCAL_USER_ID,
      title: r.title,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.tags.id,
      set: {
        title: sql`excluded.title`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > tags.updated_at`,
    }).run()
  }

  // 5. projects (refs customers — must come after customers)
  for (const r of data.projects) {
    bDb.insert(schema.projects).values({
      id: r.id, userId: LOCAL_USER_ID,
      customerId: r.customerId, title: r.title,
      description: r.description, color: r.color,
      pricingMode: r.pricingMode,
      hourlyRateCents: r.hourlyRateCents,
      fixedPriceCents: r.fixedPriceCents,
      status: r.status,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.projects.id,
      set: {
        customerId: sql`excluded.customer_id`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        color: sql`excluded.color`,
        pricingMode: sql`excluded.pricing_mode`,
        hourlyRateCents: sql`excluded.hourly_rate_cents`,
        fixedPriceCents: sql`excluded.fixed_price_cents`,
        status: sql`excluded.status`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > projects.updated_at`,
    }).run()
  }

  // 6. timeEntries (refs projects + tasks)
  for (const r of data.timeEntries) {
    bDb.insert(schema.timeEntries).values({
      id: r.id, userId: LOCAL_USER_ID,
      projectId: r.projectId, taskId: r.taskId,
      startedAt: toDate(r.startedAt),
      endedAt: toDate(r.endedAt),
      durationSeconds: r.durationSeconds,
      rateSnapshotCents: r.rateSnapshotCents,
      pricingModeSnapshot: r.pricingModeSnapshot,
      notes: r.notes,
      createdAt: toDate(r.createdAt),
      updatedAt: toDate(r.updatedAt),
      deletedAt: toDateOrNull(r.deletedAt),
    }).onConflictDoUpdate({
      target: schema.timeEntries.id,
      set: {
        projectId: sql`excluded.project_id`,
        taskId: sql`excluded.task_id`,
        startedAt: sql`excluded.started_at`,
        endedAt: sql`excluded.ended_at`,
        durationSeconds: sql`excluded.duration_seconds`,
        rateSnapshotCents: sql`excluded.rate_snapshot_cents`,
        pricingModeSnapshot: sql`excluded.pricing_mode_snapshot`,
        notes: sql`excluded.notes`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
      },
      setWhere: sql`excluded.updated_at > time_entries.updated_at`,
    }).run()
  }

  // 7. timers — full replace
  bDb.delete(schema.timers).where(eq(schema.timers.userId, LOCAL_USER_ID)).run()
  if (data.timers.length > 0) {
    bDb.insert(schema.timers).values(
      data.timers.map((r) => ({
        id: r.id, userId: LOCAL_USER_ID, projectId: r.projectId,
        startedAt: toDate(r.startedAt),
        createdAt: toDate(r.createdAt), updatedAt: toDate(r.updatedAt),
      }))
    ).run()
  }

  // 8. taskTags — full replace
  bDb.delete(schema.taskTags).where(eq(schema.taskTags.userId, LOCAL_USER_ID)).run()
  if (data.taskTags.length > 0) {
    bDb.insert(schema.taskTags).values(
      data.taskTags.map((r) => ({ taskId: r.taskId, tagId: r.tagId, userId: LOCAL_USER_ID }))
    ).onConflictDoNothing().run()
  }

  // 9. projectTasks — full replace
  bDb.delete(schema.projectTasks).where(eq(schema.projectTasks.userId, LOCAL_USER_ID)).run()
  if (data.projectTasks.length > 0) {
    bDb.insert(schema.projectTasks).values(
      data.projectTasks.map((r) => ({ projectId: r.projectId, taskId: r.taskId, userId: LOCAL_USER_ID }))
    ).onConflictDoNothing().run()
  }

  // 10. appSettings — LWW
  if (data.appSettings) {
    bDb.insert(schema.appSettings).values({
      userId: LOCAL_USER_ID,
      pinHash: data.appSettings.pinHash,
      biometricEnabled: data.appSettings.biometricEnabled,
      lastExportPeriod: data.appSettings.lastExportPeriod,
      updatedAt: toDate(data.appSettings.updatedAt),
    }).onConflictDoUpdate({
      target: schema.appSettings.userId,
      set: {
        pinHash: sql`excluded.pin_hash`,
        biometricEnabled: sql`excluded.biometric_enabled`,
        lastExportPeriod: sql`excluded.last_export_period`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: sql`excluded.updated_at > app_settings.updated_at`,
    }).run()
  }
}
