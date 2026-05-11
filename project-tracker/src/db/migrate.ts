import type * as SQLite from 'expo-sqlite'
import { migrations } from '@projekt-tracker/schema'

export async function runMigrations(sqlite: SQLite.SQLiteDatabase): Promise<void> {
  await sqlite.execAsync(
    `CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`
  )

  const row = await sqlite.getFirstAsync<{ value: string }>(
    `SELECT value FROM _meta WHERE key = 'schema_version'`
  )
  const currentVersion = row ? parseInt(row.value, 10) : 0

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await sqlite.execAsync(migration.sql)
      await sqlite.runAsync(
        `INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)`,
        [String(migration.version)]
      )
    }
  }
}
