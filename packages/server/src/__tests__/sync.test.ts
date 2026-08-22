import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as schema from '@projekt-tracker/schema/pg'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Hono } from 'hono'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { AppVariables } from '../middleware/auth.js'
import { createBootstrapRoute } from '../routes/auth.js'
import { createSyncRoute, pushBodySchema } from '../routes/sync.js'

describe('pushBodySchema — unit', () => {
  it('accepts an empty body (all arrays default to [])', () => {
    const r = pushBodySchema.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.orderTypes).toEqual([])
      expect(r.data.customers).toEqual([])
      expect(r.data.projects).toEqual([])
      expect(r.data.tasks).toEqual([])
      expect(r.data.tags).toEqual([])
      expect(r.data.timeEntries).toEqual([])
      expect(r.data.taskTags).toBeUndefined()
      expect(r.data.projectTasks).toBeUndefined()
      expect(r.data.timers).toBeUndefined()
      expect(r.data.appSettings).toBeUndefined()
    }
  })

  it('accepts a valid orderType record', () => {
    const r = pushBodySchema.safeParse({
      orderTypes: [
        {
          id: '01930000-0000-7000-8000-000000000001',
          name: 'Hochzeitsfotografie',
          digit: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('rejects an orderType with digit = 0 (min is 1)', () => {
    const r = pushBodySchema.safeParse({
      orderTypes: [
        {
          id: '01930000-0000-7000-8000-000000000001',
          name: 'Test',
          digit: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects an orderType with digit = 10 (max is 9)', () => {
    const r = pushBodySchema.safeParse({
      orderTypes: [
        {
          id: '01930000-0000-7000-8000-000000000001',
          name: 'Test',
          digit: 10,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects a project with invalid pricingMode', () => {
    const r = pushBodySchema.safeParse({
      projects: [
        {
          id: '01930000-0000-7000-8000-000000000002',
          customerId: '01930000-0000-7000-8000-000000000003',
          title: 'Project',
          description: null,
          color: '#FF0000',
          pricingMode: 'subscription',
          hourlyRateCents: null,
          fixedPriceCents: null,
          status: 'active',
          sortOrder: 1000,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  // sortOrder is required rather than `.default(0)`: a client that does not know
  // the field would otherwise silently collapse every project onto key 0 on the
  // server and destroy the user's arrangement for every other device.
  it('rejects a project without sortOrder', () => {
    const r = pushBodySchema.safeParse({
      projects: [
        {
          id: '01930000-0000-7000-8000-000000000002',
          customerId: '01930000-0000-7000-8000-000000000003',
          title: 'Project',
          description: null,
          color: '#FF0000',
          pricingMode: 'hourly',
          hourlyRateCents: 8000,
          fixedPriceCents: null,
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects a sortOrder beyond the PG int32 range', () => {
    const base = {
      id: '01930000-0000-7000-8000-000000000002',
      customerId: '01930000-0000-7000-8000-000000000003',
      title: 'Project',
      description: null,
      color: '#FF0000',
      pricingMode: 'hourly',
      hourlyRateCents: 8000,
      fixedPriceCents: null,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    }
    expect(
      pushBodySchema.safeParse({ projects: [{ ...base, sortOrder: 2147483648 }] }).success,
    ).toBe(false)
    expect(
      pushBodySchema.safeParse({ projects: [{ ...base, sortOrder: -2147483649 }] }).success,
    ).toBe(false)
    expect(
      pushBodySchema.safeParse({ projects: [{ ...base, sortOrder: 2147483647 }] }).success,
    ).toBe(true)
  })

  it('rejects a timeEntry with invalid pricingModeSnapshot', () => {
    const r = pushBodySchema.safeParse({
      timeEntries: [
        {
          id: '01930000-0000-7000-8000-000000000004',
          projectId: '01930000-0000-7000-8000-000000000005',
          taskId: '01930000-0000-7000-8000-000000000006',
          startedAt: '2026-01-01T08:00:00.000Z',
          endedAt: '2026-01-01T09:00:00.000Z',
          rateSnapshotCents: null,
          pricingModeSnapshot: 'unknown',
          billable: true,
          notes: null,
          createdAt: '2026-01-01T08:00:00.000Z',
          updatedAt: '2026-01-01T08:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects a timeEntry where endedAt equals startedAt', () => {
    const r = pushBodySchema.safeParse({
      timeEntries: [
        {
          id: '01930000-0000-7000-8000-000000000004',
          projectId: '01930000-0000-7000-8000-000000000005',
          taskId: '01930000-0000-7000-8000-000000000006',
          startedAt: '2026-01-01T08:00:00.000Z',
          endedAt: '2026-01-01T08:00:00.000Z',
          rateSnapshotCents: null,
          pricingModeSnapshot: 'hourly',
          billable: true,
          notes: null,
          createdAt: '2026-01-01T08:00:00.000Z',
          updatedAt: '2026-01-01T08:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('rejects a timeEntry where endedAt is before startedAt', () => {
    const r = pushBodySchema.safeParse({
      timeEntries: [
        {
          id: '01930000-0000-7000-8000-000000000004',
          projectId: '01930000-0000-7000-8000-000000000005',
          taskId: '01930000-0000-7000-8000-000000000006',
          startedAt: '2026-01-01T09:00:00.000Z',
          endedAt: '2026-01-01T08:00:00.000Z',
          rateSnapshotCents: null,
          pricingModeSnapshot: 'hourly',
          billable: true,
          notes: null,
          createdAt: '2026-01-01T08:00:00.000Z',
          updatedAt: '2026-01-01T08:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('accepts a timeEntry where endedAt is after startedAt', () => {
    const r = pushBodySchema.safeParse({
      timeEntries: [
        {
          id: '01930000-0000-7000-8000-000000000004',
          projectId: '01930000-0000-7000-8000-000000000005',
          taskId: '01930000-0000-7000-8000-000000000006',
          startedAt: '2026-01-01T08:00:00.000Z',
          endedAt: '2026-01-01T09:00:00.000Z',
          rateSnapshotCents: null,
          pricingModeSnapshot: 'hourly',
          billable: true,
          notes: null,
          createdAt: '2026-01-01T08:00:00.000Z',
          updatedAt: '2026-01-01T08:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('rejects a timeEntry missing billable', () => {
    const r = pushBodySchema.safeParse({
      timeEntries: [
        {
          id: '01930000-0000-7000-8000-000000000004',
          projectId: '01930000-0000-7000-8000-000000000005',
          taskId: '01930000-0000-7000-8000-000000000006',
          startedAt: '2026-01-01T08:00:00.000Z',
          endedAt: '2026-01-01T09:00:00.000Z',
          rateSnapshotCents: null,
          pricingModeSnapshot: 'hourly',
          notes: null,
          createdAt: '2026-01-01T08:00:00.000Z',
          updatedAt: '2026-01-01T08:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('accepts a timeEntry with billable: false', () => {
    const r = pushBodySchema.safeParse({
      timeEntries: [
        {
          id: '01930000-0000-7000-8000-000000000004',
          projectId: '01930000-0000-7000-8000-000000000005',
          taskId: '01930000-0000-7000-8000-000000000006',
          startedAt: '2026-01-01T08:00:00.000Z',
          endedAt: '2026-01-01T09:00:00.000Z',
          rateSnapshotCents: null,
          pricingModeSnapshot: 'hourly',
          billable: false,
          notes: null,
          createdAt: '2026-01-01T08:00:00.000Z',
          updatedAt: '2026-01-01T08:00:00.000Z',
          deletedAt: null,
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('accepts taskTags as undefined (absent) vs empty array []', () => {
    expect(pushBodySchema.parse({}).taskTags).toBeUndefined()
    expect(pushBodySchema.parse({ taskTags: [] }).taskTags).toEqual([])
  })

  it('accepts appSettings with all fields', () => {
    const r = pushBodySchema.safeParse({
      appSettings: {
        pinHash: null,
        biometricEnabled: false,
        lastExportPeriod: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })
    expect(r.success).toBe(true)
  })
})

const DB_URL = process.env.DATABASE_URL
const SECRET = 'integration-test-secret-32chars!!'

describe.skipIf(!DB_URL)('Sync endpoints (integration)', () => {
  let sql: ReturnType<typeof postgres>
  let db: ReturnType<typeof drizzle<typeof schema>>
  let token: string
  let app: Hono<{ Variables: AppVariables }>

  beforeAll(async () => {
    sql = postgres(DB_URL!, { max: 5 })
    db = drizzle(sql, { schema })

    const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../../migrations')
    const migSql = postgres(DB_URL!, { max: 1 })
    await migrate(drizzle(migSql), { migrationsFolder })
    await migSql.end()

    const bootstrapApp = new Hono<{ Variables: AppVariables }>()
    bootstrapApp.route('/v1/auth', createBootstrapRoute(db, SECRET))
    const res = await bootstrapApp.request('/v1/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Sync Integration Test User' }),
    })
    const body = (await res.json()) as { token: string; userId: string }
    token = body.token

    app = new Hono<{ Variables: AppVariables }>()
    app.route('/v1/sync', createSyncRoute(db, SECRET))
  })

  afterAll(async () => {
    await sql.end()
  })

  it('GET /v1/sync/pull returns 401 without token', async () => {
    const res = await app.request('/v1/sync/pull')
    expect(res.status).toBe(401)
  })

  it('POST /v1/sync/push returns 401 without token', async () => {
    const res = await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  it('GET /v1/sync/pull returns empty arrays for new user', async () => {
    const res = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.orderTypes).toEqual([])
    expect(body.customers).toEqual([])
    expect(body.projects).toEqual([])
    expect(body.tasks).toEqual([])
    expect(body.tags).toEqual([])
    expect(body.timeEntries).toEqual([])
    expect(body.timers).toEqual([])
    expect(body.taskTags).toEqual([])
    expect(body.projectTasks).toEqual([])
    expect(body.appSettings).toBeNull()
    expect(typeof body.serverTime).toBe('string')
  })

  it('GET /v1/sync/pull returns 400 for invalid since param', async () => {
    const res = await app.request('/v1/sync/pull?since=not-a-date', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(400)
  })

  it('POST /v1/sync/push creates an order type, pull returns it', async () => {
    const orderTypeId = '01930001-0000-7000-8000-000000000001'
    const now = new Date().toISOString()

    const pushRes = await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderTypes: [
          {
            id: orderTypeId,
            name: 'Sync Test Art',
            digit: 3,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
      }),
    })
    expect(pushRes.status).toBe(200)
    const pushBody = (await pushRes.json()) as { serverTime: string }
    expect(typeof pushBody.serverTime).toBe('string')

    const pullRes = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(pullRes.status).toBe(200)
    const pullBody = (await pullRes.json()) as { orderTypes: { id: string; name: string }[] }
    const found = pullBody.orderTypes.find((o) => o.id === orderTypeId)
    expect(found).toBeDefined()
    expect(found?.name).toBe('Sync Test Art')
  })

  it('push with older updated_at does not overwrite server record (LWW)', async () => {
    const orderTypeId = '01930002-0000-7000-8000-000000000001'
    const serverTime = new Date('2026-05-15T10:00:00.000Z').toISOString()
    const olderTime = new Date('2026-05-15T09:00:00.000Z').toISOString()

    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderTypes: [
          {
            id: orderTypeId,
            name: 'Original Name',
            digit: 4,
            createdAt: serverTime,
            updatedAt: serverTime,
            deletedAt: null,
          },
        ],
      }),
    })

    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderTypes: [
          {
            id: orderTypeId,
            name: 'Stale Name',
            digit: 4,
            createdAt: serverTime,
            updatedAt: olderTime,
            deletedAt: null,
          },
        ],
      }),
    })

    const pullRes = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const pullBody = (await pullRes.json()) as { orderTypes: { id: string; name: string }[] }
    const found = pullBody.orderTypes.find((o) => o.id === orderTypeId)
    expect(found?.name).toBe('Original Name')
  })

  it('push timers=[] clears the active timer', async () => {
    const otId = '01930003-0000-7000-8000-000000000001'
    const custId = '01930003-0000-7000-8000-000000000002'
    const projId = '01930003-0000-7000-8000-000000000003'
    const timerId = '01930003-0000-7000-8000-000000000004'
    const now = new Date().toISOString()

    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderTypes: [
          {
            id: otId,
            name: 'Timer Test Art',
            digit: 5,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        customers: [
          {
            id: custId,
            customerNumber: '26500A01',
            orderTypeId: otId,
            name: 'Timer Test Kunde',
            street: null,
            zip: null,
            city: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        projects: [
          {
            id: projId,
            customerId: custId,
            title: 'Timer Test Projekt',
            description: null,
            color: '#FF0000',
            pricingMode: 'hourly',
            hourlyRateCents: 8000,
            fixedPriceCents: null,
            status: 'active',
            sortOrder: 1000,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        timers: [
          { id: timerId, projectId: projId, startedAt: now, createdAt: now, updatedAt: now },
        ],
      }),
    })

    const before = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const beforeBody = (await before.json()) as { timers: { id: string }[] }
    expect(beforeBody.timers.some((t) => t.id === timerId)).toBe(true)

    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timers: [] }),
    })

    const after = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const afterBody = (await after.json()) as { timers: unknown[] }
    expect(afterBody.timers).toEqual([])
  })

  it('GET /pull?since=<ts> returns only records updated after ts', async () => {
    const beforeTs = new Date(Date.now() - 1000).toISOString()

    const otId = '01930004-0000-7000-8000-000000000001'
    const after = new Date().toISOString()

    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderTypes: [
          {
            id: otId,
            name: 'Since Test Art',
            digit: 6,
            createdAt: after,
            updatedAt: after,
            deletedAt: null,
          },
        ],
      }),
    })

    const res = await app.request(`/v1/sync/pull?since=${encodeURIComponent(beforeTs)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { orderTypes: { id: string }[] }
    expect(body.orderTypes.some((o) => o.id === otId)).toBe(true)

    const futureTs = new Date(Date.now() + 60_000).toISOString()
    const resEmpty = await app.request(`/v1/sync/pull?since=${encodeURIComponent(futureTs)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const bodyEmpty = (await resEmpty.json()) as { orderTypes: { id: string }[] }
    expect(bodyEmpty.orderTypes.some((o) => o.id === otId)).toBe(false)
  })

  it('push/pull round-trips billable: false for a time entry', async () => {
    const otId = '01930005-0000-7000-8000-000000000001'
    const custId = '01930005-0000-7000-8000-000000000002'
    const projId = '01930005-0000-7000-8000-000000000003'
    const taskId = '01930005-0000-7000-8000-000000000004'
    const teId = '01930005-0000-7000-8000-000000000005'
    const now = new Date().toISOString()

    await app.request('/v1/sync/push', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderTypes: [
          {
            id: otId,
            name: 'Billable Test Art',
            digit: 7,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        customers: [
          {
            id: custId,
            customerNumber: '26600A01',
            orderTypeId: otId,
            name: 'Billable Test Kunde',
            street: null,
            zip: null,
            city: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        projects: [
          {
            id: projId,
            customerId: custId,
            title: 'Billable Test Projekt',
            description: null,
            color: '#FF0000',
            pricingMode: 'hourly',
            hourlyRateCents: 8000,
            fixedPriceCents: null,
            status: 'active',
            sortOrder: 1000,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        tasks: [
          {
            id: taskId,
            description: 'Billable Test Aufgabe',
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        timeEntries: [
          {
            id: teId,
            projectId: projId,
            taskId,
            startedAt: now,
            endedAt: new Date(Date.now() + 3600_000).toISOString(),
            rateSnapshotCents: 8000,
            pricingModeSnapshot: 'hourly',
            billable: false,
            notes: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
      }),
    })

    const pullRes = await app.request('/v1/sync/pull', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const pullBody = (await pullRes.json()) as { timeEntries: { id: string; billable: boolean }[] }
    const found = pullBody.timeEntries.find((t) => t.id === teId)
    expect(found).toBeDefined()
    expect(found?.billable).toBe(false)
  })
})
