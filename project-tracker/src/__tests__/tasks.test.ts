import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import * as schema from '@projekt-tracker/schema'

// `../repositories/tasks` imports the singleton `db` from `../db/client`,
// which normally opens a native expo-sqlite database. In tests we swap that
// singleton for a real in-memory better-sqlite3 instance (same Drizzle API),
// so the repository under test runs against a real SQLite DB — no mocked
// query results, just a different physical backend.
jest.mock('../db/client', () => {
  const BetterSQLite = require('better-sqlite3')
  const { drizzle } = require('drizzle-orm/better-sqlite3')
  const schema = require('@projekt-tracker/schema')
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of schema.migrations) sqlite.exec(m.sql)
  return { db: drizzle(sqlite, { schema }) }
})

import { db as mockDb } from '../db/client'
import { listTasks, listTasksForProject, removeTaskFromProject } from '../repositories/tasks'

const NOW = new Date('2026-07-01T10:00:00Z')
const U = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-0000000000ff'
const OT1 = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'
const PROJECT = '00000000-0000-0000-0000-000000000004'
const TASK_A = '00000000-0000-0000-0000-000000000005'
const TASK_B = '00000000-0000-0000-0000-000000000006'

beforeEach(() => {
  // mockDb is a module-level singleton shared across tests (jest.mock only
  // registers it once), so we reset state before each test instead of
  // recreating the database.
  mockDb.delete(schema.projectTasks).run()
  mockDb.delete(schema.projects).run()
  mockDb.delete(schema.tasks).run()
  mockDb.delete(schema.customers).run()
  mockDb.delete(schema.orderTypes).run()
  mockDb.delete(schema.users).run()
})

function seedBase() {
  mockDb.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
  mockDb.insert(schema.users).values({ id: U2, displayName: 'Other', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
  mockDb.insert(schema.orderTypes).values({ id: OT1, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
  mockDb.insert(schema.customers).values({
    id: CU, userId: U, customerNumber: '26101', orderTypeId: OT1,
    name: 'Müller', createdAt: NOW, updatedAt: NOW,
  }).run()
  mockDb.insert(schema.projects).values({
    id: PROJECT, userId: U, customerId: CU, title: 'Hochzeit Müller',
    color: '#000000', pricingMode: 'hourly', hourlyRateCents: 5000,
    status: 'active', createdAt: NOW, updatedAt: NOW,
  }).run()
  mockDb.insert(schema.tasks).values({ id: TASK_A, userId: U, description: 'Shooting', createdAt: NOW, updatedAt: NOW }).run()
  mockDb.insert(schema.tasks).values({ id: TASK_B, userId: U, description: 'Schnitt', createdAt: NOW, updatedAt: NOW }).run()
  mockDb.insert(schema.projectTasks).values({ projectId: PROJECT, taskId: TASK_A, userId: U }).run()
  mockDb.insert(schema.projectTasks).values({ projectId: PROJECT, taskId: TASK_B, userId: U }).run()
}

describe('removeTaskFromProject', () => {
  it('removes exactly the given assignment; task itself stays in listTasks', () => {
    seedBase()
    removeTaskFromProject(U, PROJECT, TASK_A)

    const assigned = listTasksForProject(U, PROJECT)
    expect(assigned.find((t) => t.id === TASK_A)).toBeUndefined()

    const allTasks = listTasks(U)
    expect(allTasks.find((t) => t.id === TASK_A)).toBeDefined()
  })

  it('does not remove the assignment with wrong userId (tenant isolation)', () => {
    seedBase()
    removeTaskFromProject(U2, PROJECT, TASK_A)

    const assigned = listTasksForProject(U, PROJECT)
    expect(assigned.find((t) => t.id === TASK_A)).toBeDefined()
  })

  it('leaves other assignments of the same project untouched', () => {
    seedBase()
    removeTaskFromProject(U, PROJECT, TASK_A)

    const assigned = listTasksForProject(U, PROJECT)
    expect(assigned.find((t) => t.id === TASK_B)).toBeDefined()
  })

  it('is a no-op without error when the assignment does not exist', () => {
    seedBase()
    removeTaskFromProject(U, PROJECT, TASK_A)

    expect(() => removeTaskFromProject(U, PROJECT, TASK_A)).not.toThrow()

    const assigned = listTasksForProject(U, PROJECT)
    expect(assigned.find((t) => t.id === TASK_A)).toBeUndefined()
    expect(assigned.find((t) => t.id === TASK_B)).toBeDefined()
  })
})
