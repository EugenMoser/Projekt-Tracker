import type { TextStyle } from 'react-native'

/**
 * Schriftgrößen, wertetreu aus dem Bestand übernommen (Spec E5): keine
 * Größe ändert sich bei der Umstellung.
 *
 * `micro`, `bodyXl` und `headline` sind Schuldscheine — sie existieren
 * nur, weil je ein bis zwei Stellen aus der Reihe fallen. In einer
 * aufgeräumten Skala fielen sie weg.
 */
export const fontSize = {
  micro: 10,
  caption: 11,
  captionLarge: 12,
  label: 13,
  bodySmall: 14,
  body: 15,
  bodyLarge: 16,
  bodyXl: 17,
  title: 18,
  titleLarge: 20,
  headline: 22,
  keypad: 24,
  display: 28,
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>
