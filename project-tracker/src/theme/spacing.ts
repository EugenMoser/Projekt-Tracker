/**
 * Abstände und Eckenrundungen, wertetreu aus dem Bestand übernommen
 * (Spec E2): keine Stelle ändert bei der Umstellung ihren Zahlenwert.
 *
 * Benannt wird nach Skalenstufe, nicht nach Rolle. Das weicht bewusst von
 * ADR-019 ab, wo Farbtokens nach ihrer Rolle heißen: eine Rollen-Benennung
 * für Abstände (`screenPadding`, `cardGap`) verlangt, für jede der 257
 * Stellen zu entscheiden, was sie bedeutet — genau die Inventurarbeit, die
 * als eigener Schritt ausgelagert wurde. Begründung in Spec E3.
 */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,

  /**
   * Bodenfreiheit für den Home-Indicator in Bottom-Sheets. An vier Stellen
   * von Hand gesetzt, statt aus der Safe Area gelesen — der Token macht das
   * auffindbar, ersetzt es aber nicht (Spec „Nicht in diesem Schritt").
   */
  sheetBottom: 34,

  /** Scroll-Polster, damit der FAB die letzte Listenzeile nicht verdeckt. */
  fabClearance: 96,

  /** Trennlinie zwischen zwei Flächen. */
  hairline: 1,

  // Schuldscheine: Werte neben der Skala. Sie verschwinden, wenn die Skala
  // aufgeräumt wird (Folge-Item in TODO.md). Bis dahin sollen sie an jeder
  // Aufrufstelle als das erkennbar sein, was sie sind.
  s6: 6,
  s10: 10,
  s14: 14,
  s20: 20,
} as const

export const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,

  /**
   * Kreis oder Pille. React Native kappt `borderRadius` auf die Hälfte der
   * kürzeren Kante, deshalb rendert 999 identisch zu der halben Kantenlänge,
   * die vorher an diesen Stellen stand (Spec E4) — und bleibt rund, wenn das
   * Element später seine Größe ändert.
   */
  full: 999,

  // Schuldscheine, siehe `space`. r5 und r6 stehen an vier Stellen für einen
  // Unterschied von einem Pixel und sind der offensichtlichste Kandidat für
  // die spätere Zusammenlegung.
  r5: 5,
  r6: 6,
  r10: 10,
  r14: 14,
} as const
