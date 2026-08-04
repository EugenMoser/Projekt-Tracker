import { describe, it, expect } from '@jest/globals'
import BetterSQLite from 'better-sqlite3'
import { migrations } from '@projekt-tracker/schema'

const U = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'

function migrationSql(version: number): string {
  const found = migrations.find((m) => m.version === version)
  if (!found) throw new Error(`migration v${version} missing`)
  return found.sql
}

/** Fresh DB with only v1 applied, plus the rows every project row needs. */
function seedV1() {
  const sqlite = new BetterSQLite(':memory:')
  sqlite.exec(migrationSql(1))
  sqlite
    .prepare(`INSERT INTO users (id, display_name, tier, created_at, updated_at) VALUES (?, 'Owner', 'pro', 0, 0)`)
    .run(U)
  sqlite
    .prepare(`INSERT INTO order_types (id, user_id, name, digit, created_at, updated_at) VALUES (?, ?, 'Foto', 1, 0, 0)`)
    .run(OT, U)
  sqlite
    .prepare(
      `INSERT INTO customers (id, user_id, customer_number, order_type_id, name, created_at, updated_at)
       VALUES (?, ?, '26101', ?, 'Muster', 0, 0)`,
    )
    .run(CU, U, OT)
  return sqlite
}

function insertProject(sqlite: BetterSQLite.Database, id: string, updatedAt: number) {
  sqlite
    .prepare(
      `INSERT INTO projects
         (id, user_id, customer_id, title, color, pricing_mode, hourly_rate_cents, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, '#4A90D9', 'hourly', 8000, 'active', 0, ?)`,
    )
    .run(id, U, CU, `P-${id}`, updatedAt)
}

describe('migration v2 — sort_order backfill', () => {
  it('preserves the previously visible order (updated_at DESC)', () => {
    const sqlite = seedV1()
    // newest first after the backfill: c (300) , b (200), a (100)
    insertProject(sqlite, 'a', 100)
    insertProject(sqlite, 'b', 200)
    insertProject(sqlite, 'c', 300)

    sqlite.exec(migrationSql(2))

    const rows = sqlite
      .prepare(`SELECT id, sort_order FROM projects ORDER BY sort_order ASC`)
      .all() as { id: string; sort_order: number }[]

    expect(rows.map((r) => r.id)).toEqual(['c', 'b', 'a'])
    expect(rows.map((r) => r.sort_order)).toEqual([1000, 2000, 3000])
  })

  it('leaves an empty projects table alone', () => {
    const sqlite = seedV1()
    sqlite.exec(migrationSql(2))
    const rows = sqlite.prepare(`SELECT COUNT(*) AS n FROM projects`).get() as { n: number }
    expect(rows.n).toBe(0)
  })

  it('creates the sort index', () => {
    const sqlite = seedV1()
    sqlite.exec(migrationSql(2))
    const idx = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'projects_user_status_sort_idx'`)
      .get()
    expect(idx).toBeDefined()
  })
})
