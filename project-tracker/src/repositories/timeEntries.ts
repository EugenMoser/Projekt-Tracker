import * as schema from '@projekt-tracker/schema'
import { and, desc, eq, isNull } from 'drizzle-orm'

import { db } from '../db/client'
import { newId } from '../utils/uuid'
import { buildTimeEntrySnapshot } from './tariffSnapshot'

export function getTimeEntry(userId: string, id: string) {
  return (
    db
      .select()
      .from(schema.timeEntries)
      .where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.userId, userId)))
      .get() ?? null
  )
}

export function listTimeEntriesForProject(userId: string, projectId: string) {
  return db
    .select()
    .from(schema.timeEntries)
    .where(
      and(
        eq(schema.timeEntries.userId, userId),
        eq(schema.timeEntries.projectId, projectId),
        isNull(schema.timeEntries.deletedAt),
      ),
    )
    .orderBy(desc(schema.timeEntries.startedAt))
    .all()
}

export function updateTimeEntry(
  userId: string,
  id: string,
  data: { startedAt: Date; endedAt: Date; taskId: string; notes?: string },
) {
  const duration = Math.round((data.endedAt.getTime() - data.startedAt.getTime()) / 1000)
  return db
    .update(schema.timeEntries)
    .set({
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      durationSeconds: duration,
      taskId: data.taskId,
      notes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.userId, userId)))
    .run()
}

export function softDeleteTimeEntry(userId: string, id: string) {
  return db
    .update(schema.timeEntries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.userId, userId)))
    .run()
}

export function createTimeEntry(
  userId: string,
  data: {
    projectId: string
    taskId: string
    startedAt: Date
    endedAt: Date
    notes?: string
    rateOverrideCents?: number | null
  },
): string {
  const { projectId, taskId, startedAt, endedAt, notes, rateOverrideCents } = data

  // Guard: endedAt must be strictly after startedAt
  if (endedAt <= startedAt) {
    throw new Error('endedAt must be after startedAt')
  }

  // Get the tariff snapshot from the project
  const snapshot = buildTimeEntrySnapshot(db, { projectId, userId })

  // Use override rate if provided and project is hourly, otherwise use snapshot rate
  const rateSnapshotCents =
    rateOverrideCents !== undefined &&
    rateOverrideCents !== null &&
    snapshot.pricingModeSnapshot === 'hourly'
      ? rateOverrideCents
      : snapshot.rateSnapshotCents

  // Calculate duration in seconds
  const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)

  // Generate ID and timestamps
  const id = newId()
  const now = new Date()

  // Insert the time entry
  db.insert(schema.timeEntries)
    .values({
      id,
      userId,
      projectId,
      taskId,
      startedAt,
      endedAt,
      durationSeconds,
      rateSnapshotCents,
      pricingModeSnapshot: snapshot.pricingModeSnapshot,
      notes: notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return id
}
