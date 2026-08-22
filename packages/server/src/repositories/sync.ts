import * as schema from '@projekt-tracker/schema/pg'
import { and, eq, gte, sql } from 'drizzle-orm'

import type { Db } from '../db.js'
import type { PushBody } from '../routes/sync.js'

export async function pullSince(db: Db, userId: string, since: Date | null) {
  const [
    orderTypes,
    customers,
    projects,
    tasks,
    tags,
    timeEntries,
    timers,
    taskTagsRows,
    projectTasksRows,
    appSettingsRows,
  ] = await Promise.all([
    db
      .select()
      .from(schema.orderTypes)
      .where(
        since
          ? and(eq(schema.orderTypes.userId, userId), gte(schema.orderTypes.updatedAt, since))
          : eq(schema.orderTypes.userId, userId),
      ),
    db
      .select()
      .from(schema.customers)
      .where(
        since
          ? and(eq(schema.customers.userId, userId), gte(schema.customers.updatedAt, since))
          : eq(schema.customers.userId, userId),
      ),
    db
      .select()
      .from(schema.projects)
      .where(
        since
          ? and(eq(schema.projects.userId, userId), gte(schema.projects.updatedAt, since))
          : eq(schema.projects.userId, userId),
      ),
    db
      .select()
      .from(schema.tasks)
      .where(
        since
          ? and(eq(schema.tasks.userId, userId), gte(schema.tasks.updatedAt, since))
          : eq(schema.tasks.userId, userId),
      ),
    db
      .select()
      .from(schema.tags)
      .where(
        since
          ? and(eq(schema.tags.userId, userId), gte(schema.tags.updatedAt, since))
          : eq(schema.tags.userId, userId),
      ),
    db
      .select()
      .from(schema.timeEntries)
      .where(
        since
          ? and(eq(schema.timeEntries.userId, userId), gte(schema.timeEntries.updatedAt, since))
          : eq(schema.timeEntries.userId, userId),
      ),
    db.select().from(schema.timers).where(eq(schema.timers.userId, userId)),
    db.select().from(schema.taskTags).where(eq(schema.taskTags.userId, userId)),
    db.select().from(schema.projectTasks).where(eq(schema.projectTasks.userId, userId)),
    db.select().from(schema.appSettings).where(eq(schema.appSettings.userId, userId)),
  ])

  return {
    orderTypes,
    customers,
    projects,
    tasks,
    tags,
    timeEntries,
    timers,
    taskTags: taskTagsRows,
    projectTasks: projectTasksRows,
    appSettings: appSettingsRows[0] ?? null,
  }
}

export async function pushChanges(db: Db, userId: string, body: PushBody): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. order_types (refs users)
    if (body.orderTypes.length > 0) {
      await tx
        .insert(schema.orderTypes)
        .values(
          body.orderTypes.map((r) => ({
            id: r.id,
            userId,
            name: r.name,
            digit: r.digit,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
          })),
        )
        .onConflictDoUpdate({
          target: schema.orderTypes.id,
          set: {
            name: sql`excluded.name`,
            digit: sql`excluded.digit`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at > order_types.updated_at`,
        })
    }

    // 2. customers (refs users, order_types)
    if (body.customers.length > 0) {
      await tx
        .insert(schema.customers)
        .values(
          body.customers.map((r) => ({
            id: r.id,
            userId,
            customerNumber: r.customerNumber,
            orderTypeId: r.orderTypeId,
            name: r.name,
            street: r.street,
            zip: r.zip,
            city: r.city,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
          })),
        )
        .onConflictDoUpdate({
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
        })
    }

    // 3. tasks (refs users)
    if (body.tasks.length > 0) {
      await tx
        .insert(schema.tasks)
        .values(
          body.tasks.map((r) => ({
            id: r.id,
            userId,
            description: r.description,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
          })),
        )
        .onConflictDoUpdate({
          target: schema.tasks.id,
          set: {
            description: sql`excluded.description`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at > tasks.updated_at`,
        })
    }

    // 4. tags (refs users)
    if (body.tags.length > 0) {
      await tx
        .insert(schema.tags)
        .values(
          body.tags.map((r) => ({
            id: r.id,
            userId,
            title: r.title,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
          })),
        )
        .onConflictDoUpdate({
          target: schema.tags.id,
          set: {
            title: sql`excluded.title`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at > tags.updated_at`,
        })
    }

    // 5. projects (refs users, customers)
    if (body.projects.length > 0) {
      await tx
        .insert(schema.projects)
        .values(
          body.projects.map((r) => ({
            id: r.id,
            userId,
            customerId: r.customerId,
            title: r.title,
            description: r.description,
            color: r.color,
            pricingMode: r.pricingMode,
            hourlyRateCents: r.hourlyRateCents,
            fixedPriceCents: r.fixedPriceCents,
            status: r.status,
            sortOrder: r.sortOrder,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
          })),
        )
        .onConflictDoUpdate({
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
            sortOrder: sql`excluded.sort_order`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at > projects.updated_at`,
        })
    }

    // 6. time_entries (refs users, projects, tasks)
    // durationSeconds is a PG generated column — excluded from INSERT
    if (body.timeEntries.length > 0) {
      await tx
        .insert(schema.timeEntries)
        .values(
          body.timeEntries.map((r) => ({
            id: r.id,
            userId,
            projectId: r.projectId,
            taskId: r.taskId,
            startedAt: new Date(r.startedAt),
            endedAt: new Date(r.endedAt),
            rateSnapshotCents: r.rateSnapshotCents,
            pricingModeSnapshot: r.pricingModeSnapshot,
            billable: r.billable,
            notes: r.notes,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
            deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
          })),
        )
        .onConflictDoUpdate({
          target: schema.timeEntries.id,
          set: {
            projectId: sql`excluded.project_id`,
            taskId: sql`excluded.task_id`,
            startedAt: sql`excluded.started_at`,
            endedAt: sql`excluded.ended_at`,
            rateSnapshotCents: sql`excluded.rate_snapshot_cents`,
            pricingModeSnapshot: sql`excluded.pricing_mode_snapshot`,
            billable: sql`excluded.billable`,
            notes: sql`excluded.notes`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
          },
          setWhere: sql`excluded.updated_at > time_entries.updated_at`,
        })
    }

    // 7. timers — full replace (unique constraint on user_id; at most 1 per user)
    //    undefined = no change; [] = delete active timer
    if (body.timers !== undefined) {
      await tx.delete(schema.timers).where(eq(schema.timers.userId, userId))
      if (body.timers.length > 0) {
        await tx.insert(schema.timers).values(
          body.timers.map((r) => ({
            id: r.id,
            userId,
            projectId: r.projectId,
            startedAt: new Date(r.startedAt),
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          })),
        )
      }
    }

    // 8. task_tags — full replace per user if field provided
    //    userId denormalized on join table for query filtering (DATA_MODEL.md)
    if (body.taskTags !== undefined) {
      await tx.delete(schema.taskTags).where(eq(schema.taskTags.userId, userId))
      if (body.taskTags.length > 0) {
        await tx
          .insert(schema.taskTags)
          .values(body.taskTags.map((r) => ({ taskId: r.taskId, tagId: r.tagId, userId })))
          .onConflictDoNothing()
      }
    }

    // 9. project_tasks — full replace per user if field provided
    if (body.projectTasks !== undefined) {
      await tx.delete(schema.projectTasks).where(eq(schema.projectTasks.userId, userId))
      if (body.projectTasks.length > 0) {
        await tx
          .insert(schema.projectTasks)
          .values(
            body.projectTasks.map((r) => ({ projectId: r.projectId, taskId: r.taskId, userId })),
          )
          .onConflictDoNothing()
      }
    }

    // 10. app_settings (PK = userId)
    if (body.appSettings != null) {
      await tx
        .insert(schema.appSettings)
        .values({
          userId,
          pinHash: body.appSettings.pinHash,
          biometricEnabled: body.appSettings.biometricEnabled,
          lastExportPeriod: body.appSettings.lastExportPeriod,
          updatedAt: new Date(body.appSettings.updatedAt),
        })
        .onConflictDoUpdate({
          target: schema.appSettings.userId,
          set: {
            pinHash: sql`excluded.pin_hash`,
            biometricEnabled: sql`excluded.biometric_enabled`,
            lastExportPeriod: sql`excluded.last_export_period`,
            updatedAt: sql`excluded.updated_at`,
          },
          setWhere: sql`excluded.updated_at > app_settings.updated_at`,
        })
    }
  })
}
