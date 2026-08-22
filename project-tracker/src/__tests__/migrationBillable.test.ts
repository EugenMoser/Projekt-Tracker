import { describe, expect, it } from '@jest/globals'
import { migrations } from '@projekt-tracker/schema'
import BetterSQLite from 'better-sqlite3'

const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'
const P = '00000000-0000-0000-0000-000000000004'
const TK = '00000000-0000-0000-0000-000000000005'
const TE = '00000000-0000-0000-0000-000000000006'

function migrationSql(version: number): string {
  const found = migrations.find((m) => m.version === version)
  if (!found) throw new Error(`migration v${version} missing`)
  return found.sql
}

/** Fresh DB with v1+v2 applied, plus one time_entries row inserted before v3 runs. */
function seedV2WithEntry() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.exec(migrationSql(1))
  sqlite.exec(migrationSql(2))
  sqlite
    .prepare(
      `INSERT INTO users (id, display_name, tier, created_at, updated_at) VALUES (?, 'Owner', 'pro', 0, 0)`,
    )
    .run(U)
  sqlite
    .prepare(
      `INSERT INTO order_types (id, user_id, name, digit, created_at, updated_at) VALUES (?, ?, 'Foto', 1, 0, 0)`,
    )
    .run(OT, U)
  sqlite
    .prepare(
      `INSERT INTO customers (id, user_id, customer_number, order_type_id, name, created_at, updated_at)
       VALUES (?, ?, '26101', ?, 'Muster', 0, 0)`,
    )
    .run(CU, U, OT)
  sqlite
    .prepare(
      `INSERT INTO projects
         (id, user_id, customer_id, title, color, pricing_mode, hourly_rate_cents, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, 'P', '#4A90D9', 'hourly', 8000, 'active', 1000, 0, 0)`,
    )
    .run(P, U, CU)
  sqlite
    .prepare(
      `INSERT INTO tasks (id, user_id, description, created_at, updated_at) VALUES (?, ?, 'Aufbau', 0, 0)`,
    )
    .run(TK, U)
  sqlite
    .prepare(
      `INSERT INTO time_entries
         (id, user_id, project_id, task_id, started_at, ended_at, duration_seconds, rate_snapshot_cents, pricing_mode_snapshot, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 3600000, 3600, 8000, 'hourly', 0, 0)`,
    )
    .run(TE, U, P, TK)
  return sqlite
}

describe('migration v3 — billable column', () => {
  it('creates the billable column on time_entries', () => {
    const sqlite = seedV2WithEntry()
    sqlite.exec(migrationSql(3))
    const columns = sqlite.prepare(`PRAGMA table_info(time_entries)`).all() as { name: string }[]
    expect(columns.map((c) => c.name)).toContain('billable')
  })

  it('defaults existing rows to billable = 1', () => {
    const sqlite = seedV2WithEntry()
    sqlite.exec(migrationSql(3))
    const row = sqlite.prepare(`SELECT billable FROM time_entries WHERE id = ?`).get(TE) as {
      billable: number
    }
    expect(row.billable).toBe(1)
  })

  it('bumps schema_version to 3', () => {
    const sqlite = seedV2WithEntry()
    sqlite.exec(migrationSql(3))
    const row = sqlite.prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`).get() as {
      value: string
    }
    expect(row.value).toBe('3')
  })
})
