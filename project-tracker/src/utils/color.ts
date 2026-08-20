/**
 * Picks black or white text for a given hex background color using the
 * WCAG relative-luminance formula (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance):
 * each sRGB channel is linearized, then combined with the standard
 * luminance-perception weights (0.2126 R + 0.7152 G + 0.0722 B). Luminance
 * ranges from 0 (black) to 1 (white); above the 0.5 midpoint the background
 * reads as "light" and gets black text, otherwise white text.
 */
export function getContrastTextColor(hexColor: string): '#000000' | '#FFFFFF' {
  const { r, g, b } = hexToRgb(hexColor)
  return relativeLuminance(r, g, b) > 0.5 ? '#000000' : '#FFFFFF'
}

/**
 * Mixes a hex color towards white and returns the result as `#RRGGBB`.
 * `amount` is the share of white, from 0 (color unchanged) to 1 (pure white).
 * Used for surfaces that need a washed-out variant of an arbitrary user-picked
 * color — a progress-bar track behind a bar in the project color, for instance —
 * where a fixed grey would clash with anything but the blue preset.
 */
export function lighten(hexColor: string, amount: number): string {
  const { r, g, b } = hexToRgb(hexColor)
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)
  return `#${[mix(r), mix(g), mix(b)].map(toHexPair).join('')}`
}

function toHexPair(channel: number): string {
  return channel.toString(16).padStart(2, '0').toUpperCase()
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  const value = parseInt(full, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rLin, gLin, bLin] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}
