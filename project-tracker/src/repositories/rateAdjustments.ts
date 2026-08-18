import * as schema from '@projekt-tracker/schema'
import { and, eq, isNull } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'

type AnyDb = BetterSQLite3Database<typeof schema> | ExpoSQLiteDatabase<typeof schema>

/**
 * Retroactively overwrite the frozen snapshot of every active time entry of a
 * project (ADR-015). Skips soft-deleted entries and other users' rows.
 */
export function applyRateToProjectEntries(
  db: AnyDb,
  userId: string,
  projectId: string,
  data: { rateSnapshotCents: number | null; pricingModeSnapshot: 'hourly' | 'fixed' },
): void {
  ;(db as BetterSQLite3Database<typeof schema>)
    .update(schema.timeEntries)
    .set({
      rateSnapshotCents: data.rateSnapshotCents,
      pricingModeSnapshot: data.pricingModeSnapshot,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.timeEntries.userId, userId),
        eq(schema.timeEntries.projectId, projectId),
        isNull(schema.timeEntries.deletedAt),
      ),
    )
    .run()
}

/** Overwrite the frozen hourly-rate snapshot of a single time entry (ADR-015). */
export function applyRateToTimeEntry(
  db: AnyDb,
  userId: string,
  entryId: string,
  rateSnapshotCents: number,
): void {
  ;(db as BetterSQLite3Database<typeof schema>)
    .update(schema.timeEntries)
    .set({ rateSnapshotCents, updatedAt: new Date() })
    .where(and(eq(schema.timeEntries.id, entryId), eq(schema.timeEntries.userId, userId)))
    .run()
}
