import { eq, and, isNull, sum, asc, desc, max } from 'drizzle-orm'
import { db } from '../db/client'
import * as schema from '@projekt-tracker/schema'
import { newId } from '../utils/uuid'
import { SORT_STEP, keyBetween } from '../utils/sortOrder'

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
    // createdAt is the tiebreak: the v2 backfill can hand out equal keys when
    // two projects share an updated_at.
    .orderBy(asc(schema.projects.sortOrder), asc(schema.projects.createdAt))
    .all()
}

/**
 * Next key at the end of the list. Deliberately spans archived projects too:
 * they keep their key while archived, and a new project must not collide with
 * one that is about to be restored.
 */
function nextSortOrder(userId: string): number {
  const row = db.select({ value: max(schema.projects.sortOrder) })
    .from(schema.projects)
    .where(and(
      eq(schema.projects.userId, userId),
      isNull(schema.projects.deletedAt)
    ))
    .get()
  return (row?.value ?? 0) + SORT_STEP
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
      status: 'active', sortOrder: nextSortOrder(userId),
      createdAt: now, updatedAt: now,
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

export function listArchivedProjects(userId: string) {
  return db.select().from(schema.projects)
    .where(and(
      eq(schema.projects.userId, userId),
      eq(schema.projects.status, 'archived'),
      isNull(schema.projects.deletedAt)
    ))
    .orderBy(desc(schema.projects.updatedAt))
    .all()
}

export function restoreProject(userId: string, id: string) {
  return db.update(schema.projects)
    .set({ status: 'active', updatedAt: new Date() })
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

/**
 * Put `projectId` between `prevId` and `nextId`. A null neighbour means the
 * edge of the list. Takes neighbour IDs rather than a target index because the
 * grid hands us the reordered array on drop — the repository stays independent
 * of how the UI counts.
 *
 * Throws when the neighbours do not describe a valid position (same ID twice,
 * inverted order, unknown IDs) — even a rebalance cannot help there. The caller
 * must reload the list in that case: the drop was not persisted, so the UI
 * would otherwise keep showing an order the database does not have.
 */
export function moveProject(
  userId: string,
  projectId: string,
  prevId: string | null,
  nextId: string | null,
): void {
  db.transaction(() => {
    let key = keyBetween(sortOrderOf(userId, prevId), sortOrderOf(userId, nextId))
    if (key === null) {
      rebalance(userId)
      key = keyBetween(sortOrderOf(userId, prevId), sortOrderOf(userId, nextId))
    }
    if (key === null) {
      throw new Error(
        `Cannot place project ${projectId} between ${prevId} and ${nextId}`
      )
    }

    db.update(schema.projects)
      .set({ sortOrder: key, updatedAt: new Date() })
      .where(and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.userId, userId)
      ))
      .run()
  })
}

function sortOrderOf(userId: string, id: string | null): number | null {
  if (id === null) return null
  const row = db.select({ sortOrder: schema.projects.sortOrder })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .get()
  return row?.sortOrder ?? null
}

/**
 * Spread every key back onto the 1000 grid. The only path that writes more
 * than one row, so it also stamps several updated_at values — acceptable
 * because it takes roughly ten drops into the same gap to get here. Spans
 * archived projects so a restored one does not land at an arbitrary spot.
 */
function rebalance(userId: string): void {
  const rows = db.select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(
      eq(schema.projects.userId, userId),
      isNull(schema.projects.deletedAt)
    ))
    .orderBy(asc(schema.projects.sortOrder), asc(schema.projects.createdAt))
    .all()

  const now = new Date()
  rows.forEach((row, index) => {
    db.update(schema.projects)
      .set({ sortOrder: (index + 1) * SORT_STEP, updatedAt: now })
      .where(and(
        eq(schema.projects.id, row.id),
        eq(schema.projects.userId, userId)
      ))
      .run()
  })
}
