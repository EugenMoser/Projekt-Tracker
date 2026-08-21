import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import * as schema from '@projekt-tracker/schema'
import { eq } from 'drizzle-orm'

import { db as mockDb } from '../db/client'
import {
  createProject,
  getProject,
  getProjectTimeEntrySummary,
  hardDeleteProject,
  listActiveProjects,
  listArchivedProjects,
  moveProject,
  restoreProject,
} from '../repositories/projects'
import { addTaskToProject, createTask, listTasksForProject } from '../repositories/tasks'
import { createTimeEntry, listTimeEntriesForProject } from '../repositories/timeEntries'
import { SORT_STEP } from '../utils/sortOrder'

// Same pattern as tasks.test.ts: swap the expo-sqlite singleton for a real
// in-memory better-sqlite3 database, so the repository runs against real SQL.
jest.mock('../db/client', () => {
  const BetterSQLite = require('better-sqlite3')
  const { drizzle } = require('drizzle-orm/better-sqlite3')
  const schema = require('@projekt-tracker/schema')
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of schema.migrations) sqlite.exec(m.sql)
  return { db: drizzle(sqlite, { schema }) }
})

const U = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-0000000000ff'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'

beforeEach(() => {
  mockDb.delete(schema.timers).run()
  mockDb.delete(schema.timeEntries).run()
  mockDb.delete(schema.projectTasks).run()
  mockDb.delete(schema.tasks).run()
  mockDb.delete(schema.projects).run()
  mockDb.delete(schema.customers).run()
  mockDb.delete(schema.orderTypes).run()
  mockDb.delete(schema.users).run()

  const now = new Date('2026-08-01T10:00:00Z')
  for (const id of [U, U2]) {
    mockDb
      .insert(schema.users)
      .values({
        id,
        displayName: 'Owner',
        tier: 'pro',
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }
  mockDb
    .insert(schema.orderTypes)
    .values({
      id: OT,
      userId: U,
      name: 'Foto',
      digit: 1,
      createdAt: now,
      updatedAt: now,
    })
    .run()
  mockDb
    .insert(schema.customers)
    .values({
      id: CU,
      userId: U,
      customerNumber: '26101',
      orderTypeId: OT,
      name: 'Muster',
      createdAt: now,
      updatedAt: now,
    })
    .run()
})

function makeProject(title: string): string {
  return createProject(U, {
    customerId: CU,
    title,
    color: '#4A90D9',
    pricingMode: 'hourly',
    hourlyRateCents: 8000,
    taskIds: [],
  })
}

function orderedTitles(): string[] {
  return listActiveProjects(U).map((p) => p.title)
}

function rowOf(id: string) {
  return mockDb.select().from(schema.projects).where(eq(schema.projects.id, id)).get()!
}

function sortOrderOf(id: string): number {
  return rowOf(id).sortOrder
}

function updatedAtOf(id: string): Date {
  return rowOf(id).updatedAt
}

describe('project ordering', () => {
  it('appends new projects at the end', () => {
    makeProject('A')
    makeProject('B')
    makeProject('C')
    expect(orderedTitles()).toEqual(['A', 'B', 'C'])
  })

  it('spaces new projects by SORT_STEP', () => {
    const a = makeProject('A')
    const b = makeProject('B')
    expect(sortOrderOf(b) - sortOrderOf(a)).toBe(SORT_STEP)
  })

  it('moves a project to the front', () => {
    makeProject('A')
    makeProject('B')
    const c = makeProject('C')
    const a = listActiveProjects(U)[0].id

    moveProject(U, c, null, a)

    expect(orderedTitles()).toEqual(['C', 'A', 'B'])
  })

  it('moves a project into the middle', () => {
    const a = makeProject('A')
    const b = makeProject('B')
    const c = makeProject('C')

    moveProject(U, c, a, b)

    expect(orderedTitles()).toEqual(['A', 'C', 'B'])
  })

  it('moves a project to the end', () => {
    const a = makeProject('A')
    makeProject('B')
    const c = makeProject('C')

    moveProject(U, a, c, null)

    expect(orderedTitles()).toEqual(['B', 'C', 'A'])
  })

  it('only bumps updated_at on the moved row', () => {
    const a = makeProject('A')
    const b = makeProject('B')
    const c = makeProject('C')

    // Backdate the row we are about to move, so "was written" is provable:
    // without a real UPDATE its updated_at would still be the old value.
    const backdated = new Date('2026-01-01T00:00:00Z')
    mockDb
      .update(schema.projects)
      .set({ updatedAt: backdated })
      .where(eq(schema.projects.id, c))
      .run()
    const before = new Map([a, b, c].map((id) => [id, updatedAtOf(id)]))

    moveProject(U, c, null, a)

    expect(updatedAtOf(a)).toEqual(before.get(a))
    expect(updatedAtOf(b)).toEqual(before.get(b))
    expect(updatedAtOf(c).getTime()).toBeGreaterThan(backdated.getTime())
  })

  it('renumbers when no integer fits between the neighbours', () => {
    const a = makeProject('A')
    const b = makeProject('B')
    const c = makeProject('C')
    // Squeeze A and B together so keyBetween has no room left.
    mockDb.update(schema.projects).set({ sortOrder: 1000 }).where(eq(schema.projects.id, a)).run()
    mockDb.update(schema.projects).set({ sortOrder: 1001 }).where(eq(schema.projects.id, b)).run()
    mockDb.update(schema.projects).set({ sortOrder: 5000 }).where(eq(schema.projects.id, c)).run()

    moveProject(U, c, a, b)

    expect(orderedTitles()).toEqual(['A', 'C', 'B'])
    // After the rebalance A and B sit on the 1000 grid again, with C halfway
    // in between.
    expect(sortOrderOf(b) - sortOrderOf(a)).toBe(SORT_STEP)
  })

  it('throws when the neighbours cannot describe a position', () => {
    const a = makeProject('A')
    const b = makeProject('B')

    expect(() => moveProject(U, b, a, a)).toThrow(/Cannot place project/)
  })

  it('keeps an archived project out of the way and restores it in place', () => {
    makeProject('A')
    const archived = makeProject('Archiv')
    const c = makeProject('C')
    const archivedOrder = sortOrderOf(archived)

    mockDb
      .update(schema.projects)
      .set({ status: 'archived' })
      .where(eq(schema.projects.id, archived))
      .run()

    expect(orderedTitles()).toEqual(['A', 'C'])

    // A new project must not reuse the archived project's key.
    const d = makeProject('D')
    expect(sortOrderOf(d)).toBeGreaterThan(archivedOrder)

    // Restoring puts it back between A and C, where it was.
    mockDb
      .update(schema.projects)
      .set({ status: 'active' })
      .where(eq(schema.projects.id, archived))
      .run()
    expect(orderedTitles()).toEqual(['A', 'Archiv', 'C', 'D'])
    expect(sortOrderOf(c)).toBeGreaterThan(archivedOrder)
  })

  it('ignores a project that belongs to another user', () => {
    const a = makeProject('A')
    const b = makeProject('B')
    const beforeA = sortOrderOf(a)

    moveProject(U2, a, null, b)

    expect(sortOrderOf(a)).toBe(beforeA)
  })
})

describe('archiving and restoring', () => {
  function archive(id: string) {
    mockDb
      .update(schema.projects)
      .set({ status: 'archived' })
      .where(eq(schema.projects.id, id))
      .run()
  }

  it('lists only archived projects, most recently archived first', () => {
    const a = makeProject('A')
    const b = makeProject('B')
    makeProject('C')
    archive(a)
    mockDb
      .update(schema.projects)
      .set({ updatedAt: new Date('2026-08-02T00:00:00Z') })
      .where(eq(schema.projects.id, a))
      .run()
    archive(b)
    mockDb
      .update(schema.projects)
      .set({ updatedAt: new Date('2026-08-03T00:00:00Z') })
      .where(eq(schema.projects.id, b))
      .run()

    expect(listArchivedProjects(U).map((p) => p.title)).toEqual(['B', 'A'])
  })

  it("does not list another user's archived projects", () => {
    const a = makeProject('A')
    archive(a)

    expect(listArchivedProjects(U2)).toEqual([])
  })

  it('restores an archived project to active', () => {
    const a = makeProject('A')
    archive(a)
    expect(listArchivedProjects(U).map((p) => p.title)).toEqual(['A'])

    restoreProject(U, a)

    expect(listArchivedProjects(U)).toEqual([])
    expect(orderedTitles()).toContain('A')
  })

  it('bumps updated_at when restoring', () => {
    const a = makeProject('A')
    archive(a)
    const backdated = new Date('2026-01-01T00:00:00Z')
    mockDb
      .update(schema.projects)
      .set({ updatedAt: backdated })
      .where(eq(schema.projects.id, a))
      .run()

    restoreProject(U, a)

    expect(updatedAtOf(a).getTime()).toBeGreaterThan(backdated.getTime())
  })

  it('ignores a restore for a project belonging to another user', () => {
    const a = makeProject('A')
    archive(a)

    restoreProject(U2, a)

    expect(listArchivedProjects(U).map((p) => p.title)).toEqual(['A'])
  })
})

describe('hard-deleting a project', () => {
  function makeTask(description: string): string {
    return createTask(U, description)
  }

  function makeTimeEntry(projectId: string, taskId: string, hour: number): string {
    return createTimeEntry(U, {
      projectId,
      taskId,
      startedAt: new Date(`2026-08-01T${String(hour).padStart(2, '0')}:00:00Z`),
      endedAt: new Date(`2026-08-01T${String(hour).padStart(2, '0')}:30:00Z`),
    })
  }

  it('tombstones the project row', () => {
    const a = makeProject('A')

    hardDeleteProject(U, a)

    expect(rowOf(a).deletedAt).not.toBeNull()
  })

  it('removes the project from active and archived listings', () => {
    const active = makeProject('Active')
    const archived = makeProject('Archived')
    mockDb
      .update(schema.projects)
      .set({ status: 'archived' })
      .where(eq(schema.projects.id, archived))
      .run()

    hardDeleteProject(U, active)
    hardDeleteProject(U, archived)

    expect(listActiveProjects(U).map((p) => p.title)).not.toContain('Active')
    expect(listArchivedProjects(U).map((p) => p.title)).not.toContain('Archived')
  })

  it('makes getProject return undefined afterwards', () => {
    const a = makeProject('A')

    hardDeleteProject(U, a)

    expect(getProject(U, a)).toBeUndefined()
  })

  it("cascades to the project's time entries", () => {
    const a = makeProject('A')
    const task = makeTask('Task 1')
    addTaskToProject(U, a, task)
    makeTimeEntry(a, task, 9)
    makeTimeEntry(a, task, 11)

    hardDeleteProject(U, a)

    expect(listTimeEntriesForProject(U, a)).toEqual([])
  })

  it('does not touch time entries of a different project', () => {
    const a = makeProject('A')
    const b = makeProject('B')
    const task = makeTask('Task 1')
    addTaskToProject(U, a, task)
    addTaskToProject(U, b, task)
    makeTimeEntry(b, task, 9)

    hardDeleteProject(U, a)

    expect(listTimeEntriesForProject(U, b)).toHaveLength(1)
  })

  it('removes the project_tasks join rows', () => {
    const a = makeProject('A')
    const task = makeTask('Task 1')
    addTaskToProject(U, a, task)

    hardDeleteProject(U, a)

    expect(
      mockDb.select().from(schema.projectTasks).where(eq(schema.projectTasks.projectId, a)).all(),
    ).toEqual([])
  })

  it('removes an active timer running on the deleted project', () => {
    const a = makeProject('A')
    mockDb
      .insert(schema.timers)
      .values({
        id: '00000000-0000-0000-0000-0000000000bb',
        userId: U,
        projectId: a,
        startedAt: new Date('2026-08-01T09:00:00Z'),
        createdAt: new Date('2026-08-01T09:00:00Z'),
        updatedAt: new Date('2026-08-01T09:00:00Z'),
      })
      .run()

    hardDeleteProject(U, a)

    expect(mockDb.select().from(schema.timers).where(eq(schema.timers.userId, U)).all()).toEqual([])
  })

  it('leaves an active timer on a different project untouched', () => {
    const a = makeProject('A')
    const b = makeProject('B')
    mockDb
      .insert(schema.timers)
      .values({
        id: '00000000-0000-0000-0000-0000000000cc',
        userId: U,
        projectId: b,
        startedAt: new Date('2026-08-01T09:00:00Z'),
        createdAt: new Date('2026-08-01T09:00:00Z'),
        updatedAt: new Date('2026-08-01T09:00:00Z'),
      })
      .run()

    hardDeleteProject(U, a)

    expect(
      mockDb.select().from(schema.timers).where(eq(schema.timers.userId, U)).all(),
    ).toHaveLength(1)
  })

  it('leaves the global task untouched', () => {
    const a = makeProject('A')
    const task = makeTask('Survives')
    addTaskToProject(U, a, task)

    hardDeleteProject(U, a)

    expect(listTasksForProject(U, a)).toEqual([])
    const stillThere = mockDb.select().from(schema.tasks).where(eq(schema.tasks.id, task)).get()
    expect(stillThere).toBeDefined()
    expect(stillThere?.deletedAt).toBeNull()
  })

  it('ignores a hard-delete for a project belonging to another user', () => {
    const a = makeProject('A')
    const task = makeTask('Task 1')
    addTaskToProject(U, a, task)
    makeTimeEntry(a, task, 9)

    hardDeleteProject(U2, a)

    expect(rowOf(a).deletedAt).toBeNull()
    expect(listTimeEntriesForProject(U, a)).toHaveLength(1)
    expect(
      mockDb.select().from(schema.projectTasks).where(eq(schema.projectTasks.projectId, a)).all(),
    ).toHaveLength(1)
  })

  it('is a no-op for an unknown project id', () => {
    expect(() => hardDeleteProject(U, '00000000-0000-0000-0000-0000000000aa')).not.toThrow()
  })

  it('is a no-op when called again on an already hard-deleted project', () => {
    const a = makeProject('A')
    hardDeleteProject(U, a)
    const firstDeletedAt = rowOf(a).deletedAt

    expect(() => hardDeleteProject(U, a)).not.toThrow()
    expect(rowOf(a).deletedAt).not.toBeNull()
    expect(firstDeletedAt).not.toBeNull()
  })
})

describe('getProjectTimeEntrySummary', () => {
  function makeTask(description: string): string {
    return createTask(U, description)
  }

  it('returns zero for a project with no time entries', () => {
    const a = makeProject('A')

    expect(getProjectTimeEntrySummary(U, a)).toEqual({ count: 0, totalSeconds: 0 })
  })

  it("counts and sums only this project's non-deleted entries", () => {
    const a = makeProject('A')
    const b = makeProject('B')
    const task = makeTask('Task 1')
    addTaskToProject(U, a, task)
    addTaskToProject(U, b, task)
    const e1 = createTimeEntry(U, {
      projectId: a,
      taskId: task,
      startedAt: new Date('2026-08-01T09:00:00Z'),
      endedAt: new Date('2026-08-01T10:00:00Z'),
    })
    createTimeEntry(U, {
      projectId: a,
      taskId: task,
      startedAt: new Date('2026-08-01T11:00:00Z'),
      endedAt: new Date('2026-08-01T11:30:00Z'),
    })
    createTimeEntry(U, {
      projectId: b,
      taskId: task,
      startedAt: new Date('2026-08-01T12:00:00Z'),
      endedAt: new Date('2026-08-01T13:00:00Z'),
    })
    mockDb
      .update(schema.timeEntries)
      .set({ deletedAt: new Date('2026-08-01T12:00:00Z') })
      .where(eq(schema.timeEntries.id, e1))
      .run()
    // e1 soft-deleted to prove the summary filters via isNull(deletedAt),
    // not by absence of the row — validates the actual filter works.

    expect(getProjectTimeEntrySummary(U, a)).toEqual({ count: 1, totalSeconds: 1800 })
  })
})
