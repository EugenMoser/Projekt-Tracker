/**
 * Farbrollen der App. Namen beschreiben die Rolle, nicht das Aussehen
 * (Spec E2), Werte sind sechsstelliges Hex in Großbuchstaben (Spec E7).
 *
 * Nicht hier hinein gehören Farben, die zu Daten des Nutzers gehören:
 * die Projektfarben-Presets im ColorPicker und alles, was aus einer
 * gewählten Projektfarbe berechnet wird (siehe src/utils/color.ts).
 */
export const colors = {
  // Marke und Interaktion
  primary: '#4A90D9',
  primaryDark: '#1A5FAD',
  primaryDisabled: '#A8C8EE',
  primarySubtle: '#EDF4FD',
  primarySelected: '#D0E8FF',

  // Text
  textPrimary: '#000000',
  textSecondary: '#666666',
  textMuted: '#888888',
  textPlaceholder: '#999999',
  textDisabled: '#AAAAAA',
  textOnPrimary: '#FFFFFF',

  // Flächen und Ränder
  surface: '#FFFFFF',
  surfaceMuted: '#EEEEEE',
  surfacePressed: '#E5E5EA',
  surfaceInverse: '#1A1A1A',
  background: '#F2F2F7',
  border: '#DDDDDD',
  borderStrong: '#BDBDBD',
  borderSubtle: '#F0F0F5',
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',

  // Status
  danger: '#E74C3C',
  success: '#27AE60',
  warningSurface: '#FFF8E7',
  warningAccent: '#F0D070',
  warningText: '#7A6000',
  buttonDisabled: '#C7C7CC',
} as const
