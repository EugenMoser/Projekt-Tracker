import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'
import { newId } from '../utils/uuid'
import { buildTimeEntrySnapshot } from './tariffSnapshot'

export function getActiveTimer(userId: string) {
  return db.select().from(schema.timers)
    .where(eq(schema.timers.userId, userId))
    .get() ?? null
}

export function startTimer(userId: string, projectId: string): void {
  const existing = getActiveTimer(userId)
  if (existing) {
    throw new Error('A timer is already running. Stop it first.')
  }
  const now = new Date()
  db.insert(schema.timers).values({
    id: newId(), userId, projectId, startedAt: now, createdAt: now, updatedAt: now,
  }).run()
}

export function stopTimer(userId: string, taskId: string, notes?: string): void {
  const timer = getActiveTimer(userId)
  if (!timer) throw new Error('No active timer')

  const now = new Date()
  const snapshot = buildTimeEntrySnapshot(db, { projectId: timer.projectId, userId })
  const duration = Math.round((now.getTime() - timer.startedAt.getTime()) / 1000)

  db.insert(schema.timeEntries).values({
    id: newId(), userId, projectId: timer.projectId, taskId,
    startedAt: timer.startedAt, endedAt: now, durationSeconds: duration,
    rateSnapshotCents: snapshot.rateSnapshotCents,
    pricingModeSnapshot: snapshot.pricingModeSnapshot,
    notes: notes ?? null, createdAt: now, updatedAt: now,
  }).run()

  db.delete(schema.timers).where(and(eq(schema.timers.id, timer.id), eq(schema.timers.userId, userId))).run()
}

export function discardTimer(userId: string): void {
  const timer = getActiveTimer(userId)
  if (!timer) throw new Error('No active timer')
  db.delete(schema.timers).where(and(eq(schema.timers.id, timer.id), eq(schema.timers.userId, userId))).run()
}
