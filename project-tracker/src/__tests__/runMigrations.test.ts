import { describe, expect, it } from '@jest/globals'
import { migrations } from '@projekt-tracker/schema'
import BetterSQLite from 'better-sqlite3'
import type * as SQLite from 'expo-sqlite'

import { runMigrations } from '../db/migrate'

// The other migration tests exec the SQL directly. This one drives the real
// runner instead, because the upgrade path — version bookkeeping in _meta plus
// "run it again and nothing happens" — is exactly what a device does on the
// second launch after an update.
function fakeExpoDb(sqlite: BetterSQLite.Database): SQLite.SQLiteDatabase {
  const fake = {
    execAsync: async (sql: string): Promise<void> => {
      sqlite.exec(sql)
    },
    getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
      const row = sqlite.prepare(sql).get(...(params as never[]))
      return (row as T | undefined) ?? null
    },
    runAsync: async (sql: string, params: unknown[] = []): Promise<void> => {
      sqlite.prepare(sql).run(...(params as never[]))
    },
  }
  return fake as unknown as SQLite.SQLiteDatabase
}

const OWNER = '00000000-0000-0000-0000-000000000001'
const OT = '00000000-0000-0000-0000-000000000002'
const CU = '00000000-0000-0000-0000-000000000003'

function schemaVersion(sqlite: BetterSQLite.Database): string | undefined {
  const row = sqlite.prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`).get() as
    { value: string } | undefined
  return row?.value
}

function seedProject(sqlite: BetterSQLite.Database, id: string, sortOrder: number) {
  sqlite
    .prepare(
      `INSERT INTO order_types (id, user_id, name, digit, created_at, updated_at) VALUES (?, ?, 'Foto', 1, 0, 0)`,
    )
    .run(OT, OWNER)
  sqlite
    .prepare(
      `INSERT INTO customers (id, user_id, customer_number, order_type_id, name, created_at, updated_at)
       VALUES (?, ?, '26101', ?, 'Muster', 0, 0)`,
    )
    .run(CU, OWNER, OT)
  sqlite
    .prepare(
      `INSERT INTO projects
         (id, user_id, customer_id, title, color, pricing_mode, hourly_rate_cents, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, 'P', '#4A90D9', 'hourly', 8000, 'active', ?, 0, 0)`,
    )
    .run(id, OWNER, CU, sortOrder)
}

describe('runMigrations', () => {
  it('brings an empty database up to the latest version', async () => {
    const sqlite = new BetterSQLite(':memory:')

    const didMigrate = await runMigrations(fakeExpoDb(sqlite))

    expect(didMigrate).toBe(true)
    expect(schemaVersion(sqlite)).toBe('4')

    const columns = sqlite.prepare(`PRAGMA table_info(projects)`).all() as { name: string }[]
    expect(columns.map((c) => c.name)).toContain('sort_order')

    const owner = sqlite.prepare(`SELECT id FROM users WHERE id = ?`).get(OWNER)
    expect(owner).toBeDefined()
  })

  it('is a no-op on the second run', async () => {
    const sqlite = new BetterSQLite(':memory:')
    await runMigrations(fakeExpoDb(sqlite))
    seedProject(sqlite, 'p1', 7000)

    // Would throw "duplicate column name: sort_order" if v2 replayed.
    const didMigrate = await runMigrations(fakeExpoDb(sqlite))

    expect(didMigrate).toBe(false)
    expect(schemaVersion(sqlite)).toBe('4')

    // The v2 backfill must not have re-run over the existing row.
    const row = sqlite.prepare(`SELECT sort_order FROM projects WHERE id = 'p1'`).get() as {
      sort_order: number
    }
    expect(row.sort_order).toBe(7000)

    const users = sqlite.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }
    expect(users.n).toBe(1)
  })

  it('leaves the version at 4 even if the runner dies before its own bump', async () => {
    // Simulates the crash window: the migration SQL committed (including its
    // own version bump), the runner's follow-up write never happened. The next
    // launch must not replay v2.
    const sqlite = new BetterSQLite(':memory:')
    for (const m of migrations) sqlite.exec(m.sql)

    expect(schemaVersion(sqlite)).toBe('4')

    const didMigrate = await runMigrations(fakeExpoDb(sqlite))
    expect(didMigrate).toBe(false)
  })
})
