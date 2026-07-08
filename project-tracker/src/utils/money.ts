type AmountEntry = { durationSeconds: number; rateSnapshotCents: number | null }

/**
 * Amount in cents for a set of hourly time entries, rounded ONCE over the sum —
 * mirrors the Excel export's SQL `ROUND(SUM(rate_snapshot_cents * duration_seconds) / 3600)`
 * so the app's totals always match the generated invoice. Entries with a null
 * rate snapshot contribute 0.
 */
export function taskAmountCents(entries: AmountEntry[]): number {
  const rateSecondsSum = entries.reduce(
    (sum, e) => sum + e.durationSeconds * (e.rateSnapshotCents ?? 0),
    0,
  )
  return Math.round(rateSecondsSum / 3600)
}
