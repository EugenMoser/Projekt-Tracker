import * as schema from '@projekt-tracker/schema'
import { and, asc, eq, isNull } from 'drizzle-orm'

import { db } from '../db/client'
import { newId } from '../utils/uuid'

export type NewTemplate = {
  name: string
  pricingMode: 'hourly' | 'fixed'
  hourlyRateCents?: number
  fixedPriceCents?: number
  taskIds: string[]
}

export type TemplateUpdate = {
  name?: string
  pricingMode?: 'hourly' | 'fixed'
  hourlyRateCents?: number | null
  fixedPriceCents?: number | null
  taskIds?: string[]
}

export function listTemplates(userId: string) {
  return db
    .select()
    .from(schema.projectTemplates)
    .where(
      and(eq(schema.projectTemplates.userId, userId), isNull(schema.projectTemplates.deletedAt)),
    )
    .orderBy(asc(schema.projectTemplates.name))
    .all()
}

export function getTemplate(userId: string, id: string) {
  const template = db
    .select()
    .from(schema.projectTemplates)
    .where(
      and(
        eq(schema.projectTemplates.id, id),
        eq(schema.projectTemplates.userId, userId),
        isNull(schema.projectTemplates.deletedAt),
      ),
    )
    .get()
  if (!template) return undefined

  const taskRows = db
    .select({ task: schema.tasks })
    .from(schema.templateTasks)
    .innerJoin(schema.tasks, eq(schema.templateTasks.taskId, schema.tasks.id))
    .where(
      and(
        eq(schema.templateTasks.userId, userId),
        eq(schema.templateTasks.templateId, id),
        isNull(schema.tasks.deletedAt),
      ),
    )
    .all()

  return { ...template, taskIds: taskRows.map((r) => r.task.id) }
}

export function createTemplate(userId: string, data: NewTemplate): string {
  const now = new Date()
  const id = newId()
  return db.transaction(() => {
    db.insert(schema.projectTemplates)
      .values({
        id,
        userId,
        name: data.name,
        pricingMode: data.pricingMode,
        hourlyRateCents: data.hourlyRateCents ?? null,
        fixedPriceCents: data.fixedPriceCents ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    for (const taskId of data.taskIds) {
      db.insert(schema.templateTasks).values({ templateId: id, taskId, userId }).run()
    }
    return id
  })
}

export function updateTemplate(userId: string, id: string, data: TemplateUpdate): void {
  db.transaction(() => {
    const { taskIds, ...fields } = data
    db.update(schema.projectTemplates)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(schema.projectTemplates.id, id), eq(schema.projectTemplates.userId, userId)))
      .run()
    if (taskIds !== undefined) {
      db.delete(schema.templateTasks)
        .where(
          and(eq(schema.templateTasks.templateId, id), eq(schema.templateTasks.userId, userId)),
        )
        .run()
      for (const taskId of taskIds) {
        db.insert(schema.templateTasks).values({ templateId: id, taskId, userId }).run()
      }
    }
  })
}

export function deleteTemplate(userId: string, id: string): void {
  db.update(schema.projectTemplates)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.projectTemplates.id, id), eq(schema.projectTemplates.userId, userId)))
    .run()
}
