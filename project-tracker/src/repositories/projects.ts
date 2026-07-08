import { eq, and, isNull, sum, desc } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'
import { newId } from '../utils/uuid'

export type NewProject = {
  customerId: string
  title: string
  description?: string
  color: string
  pricingMode: 'hourly' | 'fixed'
  hourlyRateCents?: number
  fixedPriceCents?: number
  taskIds: string[]
}

export function listActiveProjects(userId: string) {
  return db.select().from(schema.projects)
    .where(and(
      eq(schema.projects.userId, userId),
      eq(schema.projects.status, 'active'),
      isNull(schema.projects.deletedAt)
    ))
    .orderBy(desc(schema.projects.updatedAt))
    .all()
}

export function getProject(userId: string, id: string) {
  return db.select().from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .get()
}

export function createProject(userId: string, data: NewProject) {
  const now = new Date()
  const id = newId()
  return db.transaction(() => {
    db.insert(schema.projects).values({
      id, userId, customerId: data.customerId, title: data.title,
      description: data.description ?? null, color: data.color,
      pricingMode: data.pricingMode,
      hourlyRateCents: data.hourlyRateCents ?? null,
      fixedPriceCents: data.fixedPriceCents ?? null,
      status: 'active', createdAt: now, updatedAt: now,
    }).run()
    for (const taskId of data.taskIds) {
      db.insert(schema.projectTasks).values({ projectId: id, taskId, userId }).run()
    }
    return id
  })
}

export function updateProject(
  userId: string,
  id: string,
  data: {
    title?: string
    customerId?: string
    description?: string | null
    color?: string
    pricingMode?: 'hourly' | 'fixed'
    hourlyRateCents?: number | null
    fixedPriceCents?: number | null
  },
) {
  return db.update(schema.projects)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .run()
}

export function archiveProject(userId: string, id: string) {
  return db.update(schema.projects)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .run()
}

export function getProjectTotalSeconds(userId: string, projectId: string): number {
  const result = db.select({ total: sum(schema.timeEntries.durationSeconds) })
    .from(schema.timeEntries)
    .where(and(
      eq(schema.timeEntries.userId, userId),
      eq(schema.timeEntries.projectId, projectId),
      isNull(schema.timeEntries.deletedAt)
    ))
    .get()
  return Number(result?.total ?? 0)
}
