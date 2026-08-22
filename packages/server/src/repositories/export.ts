import * as schema from '@projekt-tracker/schema/pg'
import { and, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm'

import type { Db } from '../db.js'

export interface ExportRow {
  customerNumber: string
  customerName: string
  street: string | null
  zip: string | null
  city: string | null
  projectId: string
  projectTitle: string
  pricingMode: 'hourly' | 'fixed'
  hourlyRateCents: number | null
  fixedPriceCents: number | null
  taskId: string
  taskDescription: string
  billable: boolean
  totalSeconds: number
  totalAmountCents: number
}

export type TagMap = Record<string, string[]>

export async function queryExportData(
  db: Db,
  userId: string,
  from: Date,
  to: Date,
  customerId?: string,
): Promise<{ rows: ExportRow[]; tagMap: TagMap }> {
  const conditions = [
    eq(schema.timeEntries.userId, userId),
    gte(schema.timeEntries.startedAt, from),
    lt(schema.timeEntries.startedAt, to),
    isNull(schema.timeEntries.deletedAt),
    isNull(schema.projects.deletedAt),
    isNull(schema.customers.deletedAt),
  ]
  if (customerId) {
    conditions.push(eq(schema.customers.id, customerId))
  }

  const rawRows = await db
    .select({
      customerNumber: schema.customers.customerNumber,
      customerName: schema.customers.name,
      street: schema.customers.street,
      zip: schema.customers.zip,
      city: schema.customers.city,
      projectId: schema.projects.id,
      projectTitle: schema.projects.title,
      pricingMode: schema.projects.pricingMode,
      hourlyRateCents: schema.projects.hourlyRateCents,
      fixedPriceCents: schema.projects.fixedPriceCents,
      taskId: schema.tasks.id,
      taskDescription: schema.tasks.description,
      billable: schema.timeEntries.billable,
      totalSeconds: sql<number>`SUM(${schema.timeEntries.durationSeconds})`,
      totalAmountCents: sql<number>`ROUND(SUM(COALESCE(${schema.timeEntries.rateSnapshotCents}, 0)::numeric * ${schema.timeEntries.durationSeconds}) / 3600.0)`,
    })
    .from(schema.timeEntries)
    .innerJoin(schema.projects, eq(schema.timeEntries.projectId, schema.projects.id))
    .innerJoin(schema.customers, eq(schema.projects.customerId, schema.customers.id))
    .innerJoin(schema.tasks, eq(schema.timeEntries.taskId, schema.tasks.id))
    .where(and(...conditions))
    .groupBy(schema.customers.id, schema.projects.id, schema.tasks.id, schema.timeEntries.billable)
    .orderBy(
      schema.customers.customerNumber,
      schema.projects.title,
      schema.tasks.description,
      desc(schema.timeEntries.billable),
    )

  const rows: ExportRow[] = rawRows.map((r) => ({
    customerNumber: r.customerNumber,
    customerName: r.customerName,
    street: r.street,
    zip: r.zip,
    city: r.city,
    projectId: r.projectId,
    projectTitle: r.projectTitle,
    pricingMode: r.pricingMode as 'hourly' | 'fixed',
    hourlyRateCents: r.hourlyRateCents,
    fixedPriceCents: r.fixedPriceCents,
    taskId: r.taskId,
    taskDescription: r.taskDescription,
    billable: r.billable,
    totalSeconds: Number(r.totalSeconds),
    totalAmountCents: r.billable ? Number(r.totalAmountCents) : 0,
  }))

  const taskIds = [...new Set(rows.map((r) => r.taskId))]
  const tagMap: TagMap = {}

  if (taskIds.length > 0) {
    const tagRows = await db
      .select({
        taskId: schema.taskTags.taskId,
        tagTitle: schema.tags.title,
      })
      .from(schema.taskTags)
      .innerJoin(schema.tags, eq(schema.taskTags.tagId, schema.tags.id))
      .where(and(eq(schema.taskTags.userId, userId), inArray(schema.taskTags.taskId, taskIds)))

    for (const { taskId, tagTitle } of tagRows) {
      if (!tagMap[taskId]) tagMap[taskId] = []
      tagMap[taskId].push(tagTitle)
    }
  }

  return { rows, tagMap }
}
