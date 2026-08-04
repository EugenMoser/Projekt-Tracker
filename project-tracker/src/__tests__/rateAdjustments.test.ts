import BetterSQLite from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { and, eq } from 'drizzle-orm'
import * as schema from '@projekt-tracker/schema'
import { migrations } from '@projekt-tracker/schema'
import { applyRateToProjectEntries, applyRateToTimeEntry } from '../repositories/rateAdjustments'

function makeTestDb() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) sqlite.exec(m.sql)
  return drizzle(sqlite, { schema })
}

const NOW = new Date('2026-07-01T10:00:00Z')
const U = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-0000000000ff'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'
const P1 = '00000000-0000-0000-0000-000000000004'
const P2 = '00000000-0000-0000-0000-000000000005'
const TK = '00000000-0000-0000-0000-000000000006'

type Db = ReturnType<typeof makeTestDb>

function seedBase(db: Db) {
  db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.users).values({ id: U2, displayName: 'Other', tier: 'pro', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.customers).values({ id: CU, userId: U, customerNumber: '26101', orderTypeId: OT, name: 'Müller', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.projects).values({ id: P1, userId: U, customerId: CU, title: 'P1', color: '#000', pricingMode: 'hourly', hourlyRateCents: 8000, status: 'active', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.projects).values({ id: P2, userId: U, customerId: CU, title: 'P2', color: '#000', pricingMode: 'hourly', hourlyRateCents: 5000, status: 'active', createdAt: NOW, updatedAt: NOW }).run()
  db.insert(schema.tasks).values({ id: TK, userId: U, description: 'Aufbau', createdAt: NOW, updatedAt: NOW }).run()
}

function seedEntry(db: Db, id: string, projectId: string, overrides: Partial<typeof schema.timeEntries.$inferInsert> = {}) {
  db.insert(schema.timeEntries).values({
    id, userId: U, projectId, taskId: TK,
    startedAt: NOW, endedAt: new Date(NOW.getTime() + 3600_000), durationSeconds: 3600,
    rateSnapshotCents: 8000, pricingModeSnapshot: 'hourly',
    notes: null, createdAt: NOW, updatedAt: NOW,
    ...overrides,
  }).run()
}

function getEntry(db: Db, id: string) {
  return db.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, id)).get()
}

describe('applyRateToProjectEntries', () => {
  it('sets rate + mode on all active entries of the project', () => {
    const db = makeTestDb(); seedBase(db)
    seedEntry(db, 'e1', P1); seedEntry(db, 'e2', P1)
    applyRateToProjectEntries(db, U, P1, { rateSnapshotCents: 9000, pricingModeSnapshot: 'hourly' })
    expect(getEntry(db, 'e1')!.rateSnapshotCents).toBe(9000)
    expect(getEntry(db, 'e2')!.rateSnapshotCents).toBe(9000)
  })

  it('does not touch soft-deleted entries', () => {
    const db = makeTestDb(); seedBase(db)
    seedEntry(db, 'e1', P1, { deletedAt: NOW })
    applyRateToProjectEntries(db, U, P1, { rateSnapshotCents: 9000, pricingModeSnapshot: 'hourly' })
    expect(getEntry(db, 'e1')!.rateSnapshotCents).toBe(8000)
  })

  it('does not touch entries of other projects', () => {
    const db = makeTestDb(); seedBase(db)
    seedEntry(db, 'e1', P1); seedEntry(db, 'e2', P2, { rateSnapshotCents: 5000 })
    applyRateToProjectEntries(db, U, P1, { rateSnapshotCents: 9000, pricingModeSnapshot: 'hourly' })
    expect(getEntry(db, 'e2')!.rateSnapshotCents).toBe(5000)
  })

  it('does not touch entries of other users (tenant isolation)', () => {
    const db = makeTestDb(); seedBase(db)
    seedEntry(db, 'e1', P1)
    applyRateToProjectEntries(db, U2, P1, { rateSnapshotCents: 9000, pricingModeSnapshot: 'hourly' })
    expect(getEntry(db, 'e1')!.rateSnapshotCents).toBe(8000)
  })

  it('switches mode fixed -> hourly retroactively', () => {
    const db = makeTestDb(); seedBase(db)
    seedEntry(db, 'e1', P1, { rateSnapshotCents: null, pricingModeSnapshot: 'fixed' })
    applyRateToProjectEntries(db, U, P1, { rateSnapshotCents: 7000, pricingModeSnapshot: 'hourly' })
    const e = getEntry(db, 'e1')!
    expect(e.rateSnapshotCents).toBe(7000)
    expect(e.pricingModeSnapshot).toBe('hourly')
  })

  it('bumps updated_at', () => {
    const db = makeTestDb(); seedBase(db)
    seedEntry(db, 'e1', P1, { updatedAt: new Date('2026-06-01T00:00:00Z') })
    applyRateToProjectEntries(db, U, P1, { rateSnapshotCents: 9000, pricingModeSnapshot: 'hourly' })
    expect(getEntry(db, 'e1')!.updatedAt.getTime()).toBeGreaterThan(new Date('2026-06-01T00:00:00Z').getTime())
  })
})

describe('applyRateToTimeEntry', () => {
  it('overwrites the snapshot of a single entry', () => {
    const db = makeTestDb(); seedBase(db)
    seedEntry(db, 'e1', P1); seedEntry(db, 'e2', P1)
    applyRateToTimeEntry(db, U, 'e1', 12000)
    expect(getEntry(db, 'e1')!.rateSnapshotCents).toBe(12000)
    expect(getEntry(db, 'e2')!.rateSnapshotCents).toBe(8000)
  })

  it('does not touch entries of other users (tenant isolation)', () => {
    const db = makeTestDb(); seedBase(db)
    seedEntry(db, 'e1', P1)
    applyRateToTimeEntry(db, U2, 'e1', 12000)
    expect(getEntry(db, 'e1')!.rateSnapshotCents).toBe(8000)
  })
})
