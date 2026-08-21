/**
 * Abstände und Eckenrundungen als feste Skalenstufen.
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
} as const

export const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,

  /**
   * Kreis oder Pille. React Native kappt `borderRadius` auf die Hälfte der
   * kürzeren Kante, deshalb rendert 999 identisch zu der halben Kantenlänge,
   * die vorher an diesen Stellen stand (Spec E4) — und bleibt rund, wenn das
   * Element später seine Größe ändert.
   */
  full: 999,
} as const
