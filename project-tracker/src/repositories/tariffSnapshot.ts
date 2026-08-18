import * as schema from '@projekt-tracker/schema'
import { and, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'

type AnyDb = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>

interface SnapshotParams {
  projectId: string
  userId: string
}

interface TariffSnapshot {
  rateSnapshotCents: number | null
  pricingModeSnapshot: string
}

export function buildTimeEntrySnapshot(
  db: AnyDb,
  { projectId, userId }: SnapshotParams,
): TariffSnapshot {
  // ExpoSQLiteDatabase shares the sync .get() surface; revisit if async Expo driver is adopted
  const project = (db as BetterSQLite3Database<typeof schema>)
    .select({
      pricingMode: schema.projects.pricingMode,
      hourlyRateCents: schema.projects.hourlyRateCents,
    })
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)))
    .get()

  if (!project) throw new Error('Project not found')

  return {
    pricingModeSnapshot: project.pricingMode,
    rateSnapshotCents: project.pricingMode === 'hourly' ? project.hourlyRateCents : null,
  }
}
