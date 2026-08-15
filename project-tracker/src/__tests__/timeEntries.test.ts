import { eq } from 'drizzle-orm'
import * as schema from '@projekt-tracker/schema'

// Mock the db/client module - factory can only use globals, must require inside
jest.mock('../db/client', () => {
  // eslint-disable-next-line global-require
  const BetterSQLite = require('better-sqlite3')
  // eslint-disable-next-line global-require
  const { drizzle } = require('drizzle-orm/better-sqlite3')
  // eslint-disable-next-line global-require
  const schema = require('@projekt-tracker/schema')
  // eslint-disable-next-line global-require
  const { migrations } = require('@projekt-tracker/schema')

  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) sqlite.exec(m.sql)
  const db = drizzle(sqlite, { schema })
  return {
    db,
    __testDb__: db,
  }
})

// eslint-disable-next-line import/order
import { createTimeEntry } from '../repositories/timeEntries'
// eslint-disable-next-line import/order
import { db } from '../db/client'

const testDb = (db as any).__testDb__ || db

const NOW = new Date('2026-07-01T10:00:00Z')
const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'
const P1 = '00000000-0000-0000-0000-000000000004'
const P2 = '00000000-0000-0000-0000-000000000099'
const TK = '00000000-0000-0000-0000-000000000005'

function clearDb() {
  // Delete all rows from tables to reset for each test
  testDb.delete(schema.timeEntries).run()
  testDb.delete(schema.projectTasks).run()
  testDb.delete(schema.tasks).run()
  testDb.delete(schema.projects).run()
  testDb.delete(schema.customers).run()
  testDb.delete(schema.orderTypes).run()
  testDb.delete(schema.users).run()
}

function seedBase() {
  clearDb()
  testDb.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
  testDb.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
  testDb.insert(schema.customers).values({ id: CU, userId: U, customerNumber: '26101', orderTypeId: OT, name: 'Müller', createdAt: NOW, updatedAt: NOW }).run()
  testDb.insert(schema.projects).values({ id: P1, userId: U, customerId: CU, title: 'P1', color: '#000', pricingMode: 'hourly', hourlyRateCents: 8000, status: 'active', createdAt: NOW, updatedAt: NOW }).run()
  testDb.insert(schema.tasks).values({ id: TK, userId: U, description: 'Aufbau', createdAt: NOW, updatedAt: NOW }).run()
}

function getEntry(id: string) {
  return testDb.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, id)).get()
}

describe('createTimeEntry', () => {
  beforeEach(() => {
    seedBase()
  })

  it('computes duration_seconds correctly from startedAt/endedAt', () => {
    const startedAt = new Date('2026-07-01T10:00:00Z')
    const endedAt = new Date('2026-07-01T11:30:00Z') // 1.5 hours = 5400 seconds

    const id = createTimeEntry(U, {
      projectId: P1,
      taskId: TK,
      startedAt,
      endedAt,
    })

    const entry = getEntry(id)
    expect(entry).not.toBeNull()
    expect(entry!.durationSeconds).toBe(5400)
  })

  it('uses rateSnapshotCents and pricingModeSnapshot from project when no override', () => {
    const startedAt = new Date('2026-07-01T10:00:00Z')
    const endedAt = new Date('2026-07-01T11:00:00Z')

    const id = createTimeEntry(U, {
      projectId: P1,
      taskId: TK,
      startedAt,
      endedAt,
    })

    const entry = getEntry(id)
    expect(entry).not.toBeNull()
    expect(entry!.rateSnapshotCents).toBe(8000)
    expect(entry!.pricingModeSnapshot).toBe('hourly')
  })

  it('overrides rateSnapshotCents with rateOverrideCents for hourly projects', () => {
    const startedAt = new Date('2026-07-01T10:00:00Z')
    const endedAt = new Date('2026-07-01T11:00:00Z')

    const id = createTimeEntry(U, {
      projectId: P1,
      taskId: TK,
      startedAt,
      endedAt,
      rateOverrideCents: 12000,
    })

    const entry = getEntry(id)
    expect(entry).not.toBeNull()
    expect(entry!.rateSnapshotCents).toBe(12000)
    expect(entry!.pricingModeSnapshot).toBe('hourly')
  })

  it('throws when endedAt <= startedAt', () => {
    const startedAt = new Date('2026-07-01T11:00:00Z')
    const endedAt = new Date('2026-07-01T10:00:00Z') // endedAt is before startedAt

    expect(() => {
      createTimeEntry(U, {
        projectId: P1,
        taskId: TK,
        startedAt,
        endedAt,
      })
    }).toThrow()
  })

  it('throws when endedAt equals startedAt', () => {
    const now = new Date('2026-07-01T11:00:00Z')

    expect(() => {
      createTimeEntry(U, {
        projectId: P1,
        taskId: TK,
        startedAt: now,
        endedAt: now,
      })
    }).toThrow()
  })

  it('stores notes when provided', () => {
    const startedAt = new Date('2026-07-01T10:00:00Z')
    const endedAt = new Date('2026-07-01T11:00:00Z')

    const id = createTimeEntry(U, {
      projectId: P1,
      taskId: TK,
      startedAt,
      endedAt,
      notes: 'Test note',
    })

    const entry = getEntry(id)
    expect(entry).not.toBeNull()
    expect(entry!.notes).toBe('Test note')
  })

  it('stores null for notes when not provided', () => {
    const startedAt = new Date('2026-07-01T10:00:00Z')
    const endedAt = new Date('2026-07-01T11:00:00Z')

    const id = createTimeEntry(U, {
      projectId: P1,
      taskId: TK,
      startedAt,
      endedAt,
    })

    const entry = getEntry(id)
    expect(entry).not.toBeNull()
    expect(entry!.notes).toBeNull()
  })

  it('ignores rateOverrideCents for fixed-price projects', () => {
    // Seed a fixed-price project
    testDb.insert(schema.projects).values({
      id: P2,
      userId: U,
      customerId: CU,
      title: 'P2 Fixed',
      color: '#000',
      pricingMode: 'fixed',
      fixedPriceCents: 150000,
      hourlyRateCents: null,
      status: 'active',
      createdAt: NOW,
      updatedAt: NOW,
    }).run()

    const startedAt = new Date('2026-07-01T10:00:00Z')
    const endedAt = new Date('2026-07-01T11:00:00Z')

    // Create entry with rateOverrideCents provided, but project is fixed-price
    const id = createTimeEntry(U, {
      projectId: P2,
      taskId: TK,
      startedAt,
      endedAt,
      rateOverrideCents: 12000, // Should be ignored
    })

    const entry = getEntry(id)
    expect(entry).not.toBeNull()
    // Override must be ignored for fixed-price projects
    expect(entry!.rateSnapshotCents).toBeNull()
    expect(entry!.pricingModeSnapshot).toBe('fixed')
  })
})
