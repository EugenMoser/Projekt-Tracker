import BetterSQLite from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '@projekt-tracker/schema'
import { migrations } from '@projekt-tracker/schema'
import { collectPushPayload, applyPull } from '../sync/syncRepository'
import type { PullResponse } from '../sync/types'

const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'
const PR = '00000000-0000-0000-0000-000000000004'
const TA = '00000000-0000-0000-0000-000000000005'
const TE = '00000000-0000-0000-0000-000000000006'

function makeDb() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.pragma('foreign_keys = ON')
  for (const m of migrations) sqlite.exec(m.sql)
  return drizzle(sqlite, { schema })
}

const T0 = new Date('2026-01-01T00:00:00.000Z')
const T1 = new Date('2026-01-02T00:00:00.000Z')
const T2 = new Date('2026-01-03T00:00:00.000Z')

function seedBase(db: ReturnType<typeof makeDb>) {
  db.insert(schema.users).values({
    id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0,
  }).run()
  db.insert(schema.orderTypes).values({
    id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.customers).values({
    id: CU, userId: U, customerNumber: '26101', orderTypeId: OT,
    name: 'Müller', createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.projects).values({
    id: PR, userId: U, customerId: CU, title: 'Projekt A', color: '#FF0000',
    pricingMode: 'hourly', hourlyRateCents: 8000, status: 'active',
    createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.tasks).values({
    id: TA, userId: U, description: 'Planung', createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.timeEntries).values({
    id: TE, userId: U, projectId: PR, taskId: TA,
    startedAt: T0, endedAt: T1, durationSeconds: 3600,
    rateSnapshotCents: 8000, pricingModeSnapshot: 'hourly',
    notes: null, createdAt: T0, updatedAt: T1,
  }).run()
  db.insert(schema.projectTasks).values({ projectId: PR, taskId: TA, userId: U }).run()
}

describe('collectPushPayload', () => {
  it('full sync (since=null): collects all entities', () => {
    const db = makeDb()
    seedBase(db)
    const payload = collectPushPayload(db, U, null)
    expect(payload.orderTypes).toHaveLength(1)
    expect(payload.orderTypes[0].id).toBe(OT)
    expect(payload.orderTypes[0].createdAt).toBe(T0.toISOString())
    expect(payload.customers).toHaveLength(1)
    expect(payload.projects).toHaveLength(1)
    expect(payload.tasks).toHaveLength(1)
    expect(payload.timeEntries).toHaveLength(1)
    expect(payload.projectTasks).toHaveLength(1)
  })

  it('incremental sync (since=T0): only entities updated after T0', () => {
    const db = makeDb()
    seedBase(db)
    // Add second orderType updated at T0 (not after T0)
    db.insert(schema.orderTypes).values({
      id: '00000000-0000-0000-0000-000000000099',
      userId: U, name: 'Taufe', digit: 2, createdAt: T0, updatedAt: T0,
    }).run()
    const payload = collectPushPayload(db, U, T0)
    // orderType updated at T1 > T0 → included
    expect(payload.orderTypes).toHaveLength(1)
    expect(payload.orderTypes[0].id).toBe(OT)
  })

  it('incremental sync after T1: nothing to push', () => {
    const db = makeDb()
    seedBase(db)
    const payload = collectPushPayload(db, U, T2)
    expect(payload.orderTypes).toHaveLength(0)
    expect(payload.customers).toHaveLength(0)
    expect(payload.projects).toHaveLength(0)
    expect(payload.tasks).toHaveLength(0)
    expect(payload.timeEntries).toHaveLength(0)
  })

  it('join tables always included regardless of since', () => {
    const db = makeDb()
    seedBase(db)
    const payload = collectPushPayload(db, U, T2)
    // projectTasks always sent (full replace on server)
    expect(payload.projectTasks).toHaveLength(1)
    expect(payload.timers).toHaveLength(0) // no active timer
  })

  it('soft-deleted entity (deletedAt set) is included with deletedAt as ISO', () => {
    const db = makeDb()
    seedBase(db)
    // Soft-delete the orderType
    db.update(schema.orderTypes)
      .set({ deletedAt: T1, updatedAt: T1 })
      .run()
    const payload = collectPushPayload(db, U, null)
    expect(payload.orderTypes[0].deletedAt).toBe(T1.toISOString())
  })

  it('timestamps are ISO strings in payload', () => {
    const db = makeDb()
    seedBase(db)
    const payload = collectPushPayload(db, U, null)
    expect(payload.orderTypes[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(payload.orderTypes[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('applyPull', () => {
  const baseResponse = (): PullResponse => ({
    orderTypes: [],
    customers: [],
    projects: [],
    tasks: [],
    tags: [],
    timeEntries: [],
    taskTags: [],
    projectTasks: [],
    timers: [],
    appSettings: null,
    serverTime: T2.toISOString(),
  })

  it('inserts new entity from server', () => {
    const db = makeDb()
    db.insert(schema.users).values({
      id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0,
    }).run()

    applyPull(db, {
      ...baseResponse(),
      orderTypes: [{
        id: OT, name: 'Hochzeit', digit: 1,
        createdAt: T0.toISOString(), updatedAt: T1.toISOString(), deletedAt: null,
      }],
    })

    const rows = db.select().from(schema.orderTypes).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(OT)
    expect(rows[0].name).toBe('Hochzeit')
  })

  it('updates existing entity when server updatedAt is newer (LWW)', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.orderTypes).values({
      id: OT, userId: U, name: 'Alt', digit: 1, createdAt: T0, updatedAt: T0,
    }).run()

    applyPull(db, {
      ...baseResponse(),
      orderTypes: [{
        id: OT, name: 'Neu', digit: 1,
        createdAt: T0.toISOString(), updatedAt: T1.toISOString(), deletedAt: null,
      }],
    })

    const row = db.select().from(schema.orderTypes).get()
    expect(row?.name).toBe('Neu')
  })

  it('does NOT update local entity when server updatedAt is older (LWW preserved)', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    // Local has T2 (newer than server's T1)
    db.insert(schema.orderTypes).values({
      id: OT, userId: U, name: 'Local-Neu', digit: 1, createdAt: T0, updatedAt: T2,
    }).run()

    applyPull(db, {
      ...baseResponse(),
      orderTypes: [{
        id: OT, name: 'Server-Alt', digit: 1,
        createdAt: T0.toISOString(), updatedAt: T1.toISOString(), deletedAt: null,
      }],
    })

    const row = db.select().from(schema.orderTypes).get()
    expect(row?.name).toBe('Local-Neu') // local preserved
  })

  it('propagates deletedAt from server', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.orderTypes).values({
      id: OT, userId: U, name: 'Hochzeit', digit: 1, createdAt: T0, updatedAt: T0,
    }).run()

    applyPull(db, {
      ...baseResponse(),
      orderTypes: [{
        id: OT, name: 'Hochzeit', digit: 1,
        createdAt: T0.toISOString(), updatedAt: T1.toISOString(),
        deletedAt: T1.toISOString(),
      }],
    })

    const row = db.select().from(schema.orderTypes).get()
    expect(row?.deletedAt).toBeTruthy()
  })

  it('full-replaces timers (delete existing, insert server timers)', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.orderTypes).values({ id: OT, userId: U, name: 'H', digit: 1, createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.customers).values({ id: CU, userId: U, customerNumber: '26101', orderTypeId: OT, name: 'M', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.projects).values({ id: PR, userId: U, customerId: CU, title: 'P', color: '#000', pricingMode: 'hourly', hourlyRateCents: 8000, status: 'active', createdAt: T0, updatedAt: T0 }).run()
    // Insert a local timer
    db.insert(schema.timers).values({ id: 'old-timer', userId: U, projectId: PR, startedAt: T0, createdAt: T0, updatedAt: T0 }).run()

    // Server says: no active timer
    applyPull(db, { ...baseResponse(), timers: [] })

    const timers = db.select().from(schema.timers).all()
    expect(timers).toHaveLength(0)
  })

  it('full-replaces taskTags', () => {
    const db = makeDb()
    db.insert(schema.users).values({ id: U, displayName: 'Owner', tier: 'pro', createdAt: T0, updatedAt: T0 }).run()
    db.insert(schema.tasks).values({ id: TA, userId: U, description: 'A', createdAt: T0, updatedAt: T0 }).run()
    const TAG = '00000000-0000-0000-0000-000000000007'
    db.insert(schema.tags).values({ id: TAG, userId: U, title: 'wichtig', createdAt: T0, updatedAt: T0 }).run()
    // Local has an existing task-tag
    db.insert(schema.taskTags).values({ taskId: TA, tagId: TAG, userId: U }).run()

    // Server says: no taskTags
    applyPull(db, { ...baseResponse(), taskTags: [] })

    const rows = db.select().from(schema.taskTags).all()
    expect(rows).toHaveLength(0)
  })
})
