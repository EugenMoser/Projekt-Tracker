import { colors, fontSize, fontWeight } from '../theme'

const SIX_DIGIT_UPPERCASE_HEX = /^#[0-9A-F]{6}$/

describe('colors', () => {
  it('writes every color as six-digit uppercase hex', () => {
    const offenders = Object.entries(colors)
      .filter(([name]) => name !== 'overlay')
      .filter(([, value]) => !SIX_DIGIT_UPPERCASE_HEX.test(value))
    expect(offenders).toEqual([])
  })

  it('writes translucent colors as rgba(), never as hex with an alpha channel', () => {
    // Hex with alpha means #RRGGBBAA in JS but #AARRGGBB in Android XML —
    // the same eight characters, two different colors. See spec E7.
    expect(colors.overlay).toMatch(/^rgba\(/)
  })

  it('shares a value only where two roles are deliberately the same color', () => {
    const byValue = new Map<string, string[]>()
    for (const [name, value] of Object.entries(colors)) {
      byValue.set(value, [...(byValue.get(value) ?? []), name])
    }
    const duplicates = [...byValue.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([value, names]) => `${value}: ${[...names].sort().join(', ')}`)
      .sort()

    // Each pair is coincidence, not a shared role — which is exactly why they
    // are separate tokens. Making text a softer black must not soften shadows,
    // and tinting the card surface must not tint the text on primary buttons.
    expect(duplicates).toEqual(['#000000: shadow, textPrimary', '#FFFFFF: surface, textOnPrimary'])
  })
})

describe('typography', () => {
  it('uses positive integers for every font size', () => {
    const offenders = Object.entries(fontSize).filter(
      ([, value]) => !Number.isInteger(value) || value <= 0,
    )
    expect(offenders).toEqual([])
  })

  it('uses the four weights React Native accepts as strings', () => {
    expect(Object.values(fontWeight)).toEqual(['400', '500', '600', '700'])
  })

  it('keeps the thirteen sizes the migration was value-true to', () => {
    // Spec E5: the migration renamed sizes, it did not change any. Pinning the
    // set is what makes that promise fail loudly instead of on a device.
    expect([...Object.values(fontSize)].sort((a, b) => a - b)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28,
    ])
  })
})
