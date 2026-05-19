import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '@projekt-tracker/schema/pg'
import { queryExportData } from '../repositories/export.js'

const DATABASE_URL = process.env.DATABASE_URL
const skipIf = !DATABASE_URL

const userId   = 'eeeeeeee-0000-0000-0000-000000000001'
const otId     = 'eeeeeeee-0000-0000-0000-000000000002'
const custId   = 'eeeeeeee-0000-0000-0000-000000000003'
const taskId   = 'eeeeeeee-0000-0000-0000-000000000004'
const projId   = 'eeeeeeee-0000-0000-0000-000000000005'
const teId     = 'eeeeeeee-0000-0000-0000-000000000006'
const cust2Id  = 'eeeeeeee-0000-0000-0000-000000000007'
const proj2Id  = 'eeeeeeee-0000-0000-0000-000000000008'
const task2Id  = 'eeeeeeee-0000-0000-0000-000000000009'
const te2Id    = 'eeeeeeee-0000-0000-0000-000000000010'

describe.skipIf(skipIf)('queryExportData', () => {
  let client: ReturnType<typeof postgres>
  let db: ReturnType<typeof drizzle<typeof schema>>

  beforeEach(async () => {
    client = postgres(DATABASE_URL!)
    db = drizzle(client, { schema })

    await client`INSERT INTO users (id, display_name) VALUES (${userId}, 'ExportTest') ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO order_types (id, user_id, name, digit, created_at, updated_at) VALUES (${otId}, ${userId}, 'Test', 9, now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO customers (id, user_id, customer_number, order_type_id, name, street, zip, city, created_at, updated_at) VALUES (${custId}, ${userId}, '26901', ${otId}, 'Müller', 'Hauptstr. 1', '12345', 'Berlin', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO tasks (id, user_id, description, created_at, updated_at) VALUES (${taskId}, ${userId}, 'Bildbearbeitung', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO projects (id, user_id, customer_id, title, color, pricing_mode, hourly_rate_cents, status, created_at, updated_at) VALUES (${projId}, ${userId}, ${custId}, 'Hochzeit Müller', '#4A90D9', 'hourly', 8000, 'active', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO time_entries (id, user_id, project_id, task_id, started_at, ended_at, rate_snapshot_cents, pricing_mode_snapshot, created_at, updated_at) VALUES (${teId}, ${userId}, ${projId}, ${taskId}, '2026-05-10 10:00:00Z', '2026-05-10 12:00:00Z', 8000, 'hourly', now(), now()) ON CONFLICT (id) DO NOTHING`

    await client`INSERT INTO customers (id, user_id, customer_number, order_type_id, name, created_at, updated_at) VALUES (${cust2Id}, ${userId}, '26902', ${otId}, 'Schmidt', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO tasks (id, user_id, description, created_at, updated_at) VALUES (${task2Id}, ${userId}, 'Design', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO projects (id, user_id, customer_id, title, color, pricing_mode, fixed_price_cents, status, created_at, updated_at) VALUES (${proj2Id}, ${userId}, ${cust2Id}, 'Logo Schmidt', '#000000', 'fixed', 50000, 'active', now(), now()) ON CONFLICT (id) DO NOTHING`
    await client`INSERT INTO time_entries (id, user_id, project_id, task_id, started_at, ended_at, rate_snapshot_cents, pricing_mode_snapshot, created_at, updated_at) VALUES (${te2Id}, ${userId}, ${proj2Id}, ${task2Id}, '2026-05-11 09:00:00Z', '2026-05-11 10:00:00Z', NULL, 'fixed', now(), now()) ON CONFLICT (id) DO NOTHING`
  })

  afterEach(async () => {
    await client`DELETE FROM time_entries WHERE user_id = ${userId}`
    await client`DELETE FROM project_tasks WHERE user_id = ${userId}`
    await client`DELETE FROM task_tags WHERE user_id = ${userId}`
    await client`DELETE FROM timers WHERE user_id = ${userId}`
    await client`DELETE FROM projects WHERE user_id = ${userId}`
    await client`DELETE FROM tasks WHERE user_id = ${userId}`
    await client`DELETE FROM customers WHERE user_id = ${userId}`
    await client`DELETE FROM order_types WHERE user_id = ${userId}`
    await client`DELETE FROM users WHERE id = ${userId}`
    await client.end()
  })

  it('returns one row per project+task combination', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'))
    expect(rows).toHaveLength(2)
  })

  it('hourly row has correct aggregated seconds and amount', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'))
    const hourly = rows.find(r => r.pricingMode === 'hourly')!
    expect(hourly.customerNumber).toBe('26901')
    expect(hourly.totalSeconds).toBe(7200)
    expect(hourly.totalAmountCents).toBe(16000)
    expect(hourly.hourlyRateCents).toBe(8000)
  })

  it('fixed-price row has totalSeconds but zero amountCents', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'))
    const fixed = rows.find(r => r.pricingMode === 'fixed')!
    expect(fixed.fixedPriceCents).toBe(50000)
    expect(fixed.totalSeconds).toBe(3600)
    expect(fixed.totalAmountCents).toBe(0)
  })

  it('excludes entries outside date range', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-04-01Z'), new Date('2026-05-01Z'))
    expect(rows).toHaveLength(0)
  })

  it('filters by customerId', async () => {
    const { rows } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'), custId)
    expect(rows).toHaveLength(1)
    expect(rows[0].customerName).toBe('Müller')
  })

  it('tagMap is empty when no tags exist', async () => {
    const { tagMap } = await queryExportData(db as any, userId, new Date('2026-05-01Z'), new Date('2026-06-01Z'))
    expect(Object.keys(tagMap)).toHaveLength(0)
  })
})
