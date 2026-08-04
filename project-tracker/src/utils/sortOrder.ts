/**
 * Sparse ordering keys for user-arranged lists.
 *
 * Rows carry an integer key with wide gaps between neighbours, so moving one
 * item rewrites exactly one row instead of renumbering the whole list. That
 * matters here because sync is row-level last-write-wins: renumbering every
 * row on each drop would push the entire project list and let a reorder on
 * one device clobber an edit made on another.
 */
export const SORT_STEP = 1000

/**
 * Key that sorts strictly between `prev` and `next`. A `null` neighbour means
 * the edge of the list.
 *
 * Returns `null` when no integer fits between the two — the caller has to
 * renumber and try again. Keys may go negative; they are ordinals, not counts.
 */
export function keyBetween(prev: number | null, next: number | null): number | null {
  if (prev === null && next === null) return SORT_STEP
  if (prev === null) return next! - SORT_STEP
  if (next === null) return prev + SORT_STEP
  if (next - prev <= 1) return null
  return Math.floor((prev + next) / 2)
}
