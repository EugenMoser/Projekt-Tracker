import { colors, fontSize, fontWeight, radius, space } from '../theme'

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
    // tinting the card surface must not tint the text on primary buttons, and
    // a lighter grab handle must not lighten every disabled button with it.
    expect(duplicates).toEqual([
      '#000000: shadow, textPrimary',
      '#C7C7CC: buttonDisabled, sheetHandle',
      '#FFFFFF: surface, textInverse',
    ])
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

describe('spacing', () => {
  it('uses positive integers for every space and radius value', () => {
    const offenders = [...Object.entries(space), ...Object.entries(radius)].filter(
      ([, value]) => !Number.isInteger(value) || value <= 0,
    )
    expect(offenders).toEqual([])
  })

  it('keeps the sixteen space values the migration was value-true to', () => {
    // Spec E2: the migration renamed spacings, it did not change any. Pinning
    // the set is what makes that promise fail loudly instead of on a device —
    // a layout shift is invisible to every other test in this suite.
    expect([...Object.values(space)].sort((a, b) => a - b)).toEqual([
      1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 34, 40, 48, 96,
    ])
  })

  it('pins every radius value, including the 999 that stands for a circle', () => {
    // Eight values are value-true carry-overs. 999 is the exception the spec
    // allows (E4): React Native clamps borderRadius to half the shorter edge,
    // so it renders identically to the 22 / 28 / 40 it replaces on the seven
    // circles and pills it stands for.
    expect([...Object.values(radius)].sort((a, b) => a - b)).toEqual([
      2, 4, 5, 6, 8, 10, 12, 14, 999,
    ])
  })

  it('names off-scale values after their number, so the debt stays visible', () => {
    // Spec E5: these eight disappear when the scale is cleaned up. A t-shirt
    // name (mdPlus) would let them pass as scale members, which they are not.
    const offScale = Object.keys({ ...space, ...radius }).filter((name) => /^[sr]\d+$/.test(name))
    expect(offScale.sort()).toEqual(['r10', 'r14', 'r5', 'r6', 's10', 's14', 's20', 's6'])
  })
})
