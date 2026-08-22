import BetterSQLite from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { describe, expect, it } from 'vitest'

import { migrations } from '../migrations.js'
import * as schema from '../sqlite.js'

function makeTestDb() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) {
    sqlite.exec(m.sql)
  }
  return drizzle(sqlite, { schema })
}

const NOW = new Date()
const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'
const PR = '00000000-0000-0000-0000-000000000004'
const TA = '00000000-0000-0000-0000-000000000005'

function seedBase(db: ReturnType<typeof makeTestDb>) {
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
      id: PR,
      userId: U,
      customerId: CU,
      title: 'Hochzeit Müller',
      color: '#4A90D9',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      status: 'active',
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run()
  db.insert(schema.tasks)
    .values({ id: TA, userId: U, description: 'Bildbearbeitung', createdAt: NOW, updatedAt: NOW })
    .run()
}

describe('users', () => {
  it('roundtrip', () => {
    const db = makeTestDb()
    db.insert(schema.users)
      .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
      .run()
    const rows = db.select().from(schema.users).where(eq(schema.users.id, U)).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].tier).toBe('pro')
  })
})

describe('order_types', () => {
  it('rejects duplicate digit per user', () => {
    const db = makeTestDb()
    db.insert(schema.users)
      .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
      .run()
    db.insert(schema.orderTypes)
      .values({ id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: NOW, updatedAt: NOW })
      .run()
    expect(() =>
      db
        .insert(schema.orderTypes)
        .values({
          id: '00000000-0000-0000-0000-000000000099',
          userId: U,
          name: 'Andere',
          digit: 1,
          createdAt: NOW,
          updatedAt: NOW,
        })
        .run(),
    ).toThrow()
  })
})

describe('customers', () => {
  it('rejects duplicate customer_number per user', () => {
    const db = makeTestDb()
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
    expect(() =>
      db
        .insert(schema.customers)
        .values({
          id: '00000000-0000-0000-0000-000000000099',
          userId: U,
          customerNumber: '26101',
          orderTypeId: OT,
          name: 'Other',
          createdAt: NOW,
          updatedAt: NOW,
        })
        .run(),
    ).toThrow()
  })
})

describe('projects', () => {
  it('stores hourly pricing', () => {
    const db = makeTestDb()
    seedBase(db)
    const rows = db.select().from(schema.projects).where(eq(schema.projects.id, PR)).all()
    expect(rows[0].pricingMode).toBe('hourly')
    expect(rows[0].hourlyRateCents).toBe(8000)
    expect(rows[0].fixedPriceCents).toBeNull()
  })

  it('stores fixed pricing', () => {
    const db = makeTestDb()
    db.insert(schema.users)
      .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
      .run()
    db.insert(schema.orderTypes)
      .values({ id: OT, userId: U, name: 'Design', digit: 2, createdAt: NOW, updatedAt: NOW })
      .run()
    db.insert(schema.customers)
      .values({
        id: CU,
        userId: U,
        customerNumber: '26201',
        orderTypeId: OT,
        name: 'Schmidt',
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
    const FP = '00000000-0000-0000-0000-000000000099'
    db.insert(schema.projects)
      .values({
        id: FP,
        userId: U,
        customerId: CU,
        title: 'Logo',
        color: '#00FF00',
        pricingMode: 'fixed',
        fixedPriceCents: 150000,
        status: 'active',
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
    const rows = db.select().from(schema.projects).where(eq(schema.projects.id, FP)).all()
    expect(rows[0].fixedPriceCents).toBe(150000)
    expect(rows[0].hourlyRateCents).toBeNull()
  })
})

describe('project_templates', () => {
  it('stores hourly pricing', () => {
    const db = makeTestDb()
    db.insert(schema.users)
      .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
      .run()
    const TPL = '00000000-0000-0000-0000-000000000010'
    db.insert(schema.projectTemplates)
      .values({
        id: TPL,
        userId: U,
        name: 'Hochzeit',
        pricingMode: 'hourly',
        hourlyRateCents: 8000,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
    const rows = db
      .select()
      .from(schema.projectTemplates)
      .where(eq(schema.projectTemplates.id, TPL))
      .all()
    expect(rows[0].pricingMode).toBe('hourly')
    expect(rows[0].hourlyRateCents).toBe(8000)
    expect(rows[0].fixedPriceCents).toBeNull()
  })

  it('stores fixed pricing', () => {
    const db = makeTestDb()
    db.insert(schema.users)
      .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
      .run()
    const TPL = '00000000-0000-0000-0000-000000000011'
    db.insert(schema.projectTemplates)
      .values({
        id: TPL,
        userId: U,
        name: 'Logo-Design',
        pricingMode: 'fixed',
        fixedPriceCents: 150000,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
    const rows = db
      .select()
      .from(schema.projectTemplates)
      .where(eq(schema.projectTemplates.id, TPL))
      .all()
    expect(rows[0].fixedPriceCents).toBe(150000)
    expect(rows[0].hourlyRateCents).toBeNull()
  })

  it('rejects duplicate name per user', () => {
    const db = makeTestDb()
    db.insert(schema.users)
      .values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: NOW, updatedAt: NOW })
      .run()
    db.insert(schema.projectTemplates)
      .values({
        id: '00000000-0000-0000-0000-000000000012',
        userId: U,
        name: 'Hochzeit',
        pricingMode: 'hourly',
        hourlyRateCents: 8000,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
    expect(() =>
      db
        .insert(schema.projectTemplates)
        .values({
          id: '00000000-0000-0000-0000-000000000013',
          userId: U,
          name: 'Hochzeit',
          pricingMode: 'fixed',
          fixedPriceCents: 150000,
          createdAt: NOW,
          updatedAt: NOW,
        })
        .run(),
    ).toThrow()
  })
})

describe('template_tasks', () => {
  it('links a template to a task', () => {
    const db = makeTestDb()
    seedBase(db)
    const TPL = '00000000-0000-0000-0000-000000000014'
    db.insert(schema.projectTemplates)
      .values({
        id: TPL,
        userId: U,
        name: 'Hochzeit',
        pricingMode: 'hourly',
        hourlyRateCents: 8000,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
    db.insert(schema.templateTasks).values({ templateId: TPL, taskId: TA, userId: U }).run()
    const rows = db
      .select()
      .from(schema.templateTasks)
      .where(eq(schema.templateTasks.templateId, TPL))
      .all()
    expect(rows).toHaveLength(1)
    expect(rows[0].taskId).toBe(TA)
  })
})

describe('time_entries', () => {
  it('stores duration_seconds and rate_snapshot_cents', () => {
    const db = makeTestDb()
    seedBase(db)
    const TE = '00000000-0000-0000-0000-000000000006'
    const started = new Date('2026-01-01T10:00:00Z')
    const ended = new Date('2026-01-01T11:30:00Z')
    db.insert(schema.timeEntries)
      .values({
        id: TE,
        userId: U,
        projectId: PR,
        taskId: TA,
        startedAt: started,
        endedAt: ended,
        durationSeconds: 5400,
        rateSnapshotCents: 8000,
        pricingModeSnapshot: 'hourly',
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
    const rows = db.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, TE)).all()
    expect(rows[0].durationSeconds).toBe(5400)
    expect(rows[0].rateSnapshotCents).toBe(8000)
    expect(rows[0].billable).toBe(true)
  })

  it('stores billable = false when explicitly set', () => {
    const db = makeTestDb()
    seedBase(db)
    const TE = '00000000-0000-0000-0000-000000000099'
    db.insert(schema.timeEntries)
      .values({
        id: TE,
        userId: U,
        projectId: PR,
        taskId: TA,
        startedAt: NOW,
        endedAt: NOW,
        durationSeconds: 3600,
        rateSnapshotCents: 8000,
        pricingModeSnapshot: 'hourly',
        billable: false,
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run()
    const rows = db.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, TE)).all()
    expect(rows[0].billable).toBe(false)
  })
})

describe('timers', () => {
  it('enforces single active timer per user', () => {
    const db = makeTestDb()
    seedBase(db)
    const T1 = '00000000-0000-0000-0000-000000000007'
    const T2 = '00000000-0000-0000-0000-000000000008'
    db.insert(schema.timers)
      .values({ id: T1, userId: U, projectId: PR, startedAt: NOW, createdAt: NOW, updatedAt: NOW })
      .run()
    expect(() =>
      db
        .insert(schema.timers)
        .values({
          id: T2,
          userId: U,
          projectId: PR,
          startedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
        })
        .run(),
    ).toThrow()
  })
})
