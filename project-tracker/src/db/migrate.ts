import type * as SQLite from 'expo-sqlite'
import { migrations } from '@projekt-tracker/schema'

/**
 * Applies every pending migration. Returns `true` when at least one ran, so the
 * caller can react to a schema that just changed (see `app/_layout.tsx`).
 */
export async function runMigrations(sqlite: SQLite.SQLiteDatabase): Promise<boolean> {
  await sqlite.execAsync(
    `CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`
  )

  const row = await sqlite.getFirstAsync<{ value: string }>(
    `SELECT value FROM _meta WHERE key = 'schema_version'`
  )
  const currentVersion = row ? parseInt(row.value, 10) : 0
  let didMigrate = false

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await sqlite.execAsync(migration.sql)
      // Migrations from v2 on bump schema_version inside their own transaction;
      // this write repeats that value and covers the ones that do not.
      await sqlite.runAsync(
        `INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)`,
        [String(migration.version)]
      )
      didMigrate = true
    }
  }

  await sqlite.runAsync(
    `INSERT OR IGNORE INTO users (id, display_name, tier, created_at, updated_at) VALUES (?, 'Owner', 'pro', ?, ?)`,
    ['00000000-0000-0000-0000-000000000001', Date.now(), Date.now()]
  )

  return didMigrate
}
