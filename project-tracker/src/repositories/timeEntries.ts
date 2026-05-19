import { eq, and, isNull, desc } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'

export function getTimeEntry(userId: string, id: string) {
  return db.select().from(schema.timeEntries)
    .where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.userId, userId)))
    .get() ?? null
}

export function listTimeEntriesForProject(userId: string, projectId: string) {
  return db.select().from(schema.timeEntries)
    .where(and(
      eq(schema.timeEntries.userId, userId),
      eq(schema.timeEntries.projectId, projectId),
      isNull(schema.timeEntries.deletedAt)
    ))
    .orderBy(desc(schema.timeEntries.startedAt))
    .all()
}

export function updateTimeEntry(
  userId: string, id: string,
  data: { startedAt: Date; endedAt: Date; taskId: string; notes?: string }
) {
  const duration = Math.round((data.endedAt.getTime() - data.startedAt.getTime()) / 1000)
  return db.update(schema.timeEntries)
    .set({
      startedAt: data.startedAt, endedAt: data.endedAt,
      durationSeconds: duration, taskId: data.taskId,
      notes: data.notes ?? null, updatedAt: new Date(),
    })
    .where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.userId, userId)))
    .run()
}

export function softDeleteTimeEntry(userId: string, id: string) {
  return db.update(schema.timeEntries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.userId, userId)))
    .run()
}
