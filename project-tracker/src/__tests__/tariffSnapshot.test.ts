import * as schema from '@projekt-tracker/schema'
import { migrations } from '@projekt-tracker/schema'
import BetterSQLite from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import { buildTimeEntrySnapshot } from '../repositories/tariffSnapshot'

function makeTestDb() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) sqlite.exec(m.sql)
  return drizzle(sqlite, { schema })
}

const NOW = new Date()
const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'

function seedProject(
  db: ReturnType<typeof makeTestDb>,
  overrides: Partial<typeof schema.projects.$inferInsert>,
) {
  const id = overrides.id ?? '00000000-0000-0000-0000-000000000004'
  db.insert(schema.users)
    .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
    .run()
  db.insert(schema.orderTypes)
    .values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW })
    .run()
  db.insert(schema.customers)
    .values({
      id: CU,
      userId: U,
      customerNumber: '26101',
      orderTypeId: OT,
      name: 'Müller',
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run()
  db.insert(schema.projects)
    .values({
      id,
      userId: U,
      customerId: CU,
      title: 'P',
      color: '#000',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      status: 'active',
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides,
    })
    .run()
  return id
}

describe('buildTimeEntrySnapshot', () => {
  it('freezes hourly rate from project', () => {
    const db = makeTestDb()
    const projectId = seedProject(db, { pricingMode: 'hourly', hourlyRateCents: 9500 })
    const snapshot = buildTimeEntrySnapshot(db, { projectId, userId: U })
    expect(snapshot.rateSnapshotCents).toBe(9500)
    expect(snapshot.pricingModeSnapshot).toBe('hourly')
  })

  it('sets rateSnapshotCents to null for fixed-price project', () => {
    const db = makeTestDb()
    const projectId = seedProject(db, {
      id: '00000000-0000-0000-0000-000000000099',
      pricingMode: 'fixed',
      fixedPriceCents: 150000,
      hourlyRateCents: null,
    })
    const snapshot = buildTimeEntrySnapshot(db, { projectId, userId: U })
    expect(snapshot.rateSnapshotCents).toBeNull()
    expect(snapshot.pricingModeSnapshot).toBe('fixed')
  })

  it('throws if project not found', () => {
    const db = makeTestDb()
    db.insert(schema.users)
      .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
      .run()
    expect(() => buildTimeEntrySnapshot(db, { projectId: 'does-not-exist', userId: U })).toThrow(
      'Project not found',
    )
  })

  it('throws if project belongs to different user', () => {
    const db = makeTestDb()
    const projectId = seedProject(db, {})
    expect(() => buildTimeEntrySnapshot(db, { projectId, userId: 'wrong-user' })).toThrow(
      'Project not found',
    )
  })
})
