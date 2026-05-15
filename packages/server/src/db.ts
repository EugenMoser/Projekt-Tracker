import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import * as schema from '@projekt-tracker/schema/pg'
import { env } from './env.js'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const queryClient = postgres(env.DATABASE_URL)
export const db = drizzle(queryClient, { schema })

export type Db = typeof db

export async function runMigrations(): Promise<void> {
  const migrationsFolder = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'migrations'
  )
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 })
  try {
    await migrate(drizzle(migrationClient), { migrationsFolder })
  } finally {
    await migrationClient.end()
  }
}
