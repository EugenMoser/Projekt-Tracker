import { getContrastTextColor, lighten } from '../utils/color'

describe('getContrastTextColor', () => {
  // The 6 ColorPicker presets (src/components/ColorPicker.tsx)
  it('returns white text for the blue preset (#4A90D9)', () => {
    expect(getContrastTextColor('#4A90D9')).toBe('#FFFFFF')
  })

  it('returns white text for the green preset (#27AE60)', () => {
    expect(getContrastTextColor('#27AE60')).toBe('#FFFFFF')
  })

  it('returns white text for the orange preset (#E67E22)', () => {
    expect(getContrastTextColor('#E67E22')).toBe('#FFFFFF')
  })

  it('returns white text for the purple preset (#8E44AD)', () => {
    expect(getContrastTextColor('#8E44AD')).toBe('#FFFFFF')
  })

  it('returns white text for the red preset (#E74C3C)', () => {
    expect(getContrastTextColor('#E74C3C')).toBe('#FFFFFF')
  })

  it('returns black text for the yellow preset (#F1C40F) — bright enough to need dark text', () => {
    expect(getContrastTextColor('#F1C40F')).toBe('#000000')
  })

  // Extremes
  it('returns black text for pure white background', () => {
    expect(getContrastTextColor('#FFFFFF')).toBe('#000000')
  })

  it('returns white text for pure black background', () => {
    expect(getContrastTextColor('#000000')).toBe('#FFFFFF')
  })

  it('returns black text for a light pastel (#FDF6E3)', () => {
    expect(getContrastTextColor('#FDF6E3')).toBe('#000000')
  })

  it('is case-insensitive for hex input', () => {
    expect(getContrastTextColor('#f1c40f')).toBe('#000000')
    expect(getContrastTextColor('#4a90d9')).toBe('#FFFFFF')
  })
})

describe('lighten', () => {
  it('returns the input color unchanged at amount 0', () => {
    expect(lighten('#4A90D9', 0)).toBe('#4A90D9')
  })

  it('returns white at amount 1', () => {
    expect(lighten('#4A90D9', 1)).toBe('#FFFFFF')
  })

  it('mixes each channel halfway towards white at amount 0.5', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080')
  })

  // The progress-bar track uses this ratio (TaskAccordionCard), which lands
  // close to the previously hardcoded track color #E9EEF4 for the blue preset.
  it('produces a pale tint of the blue preset at amount 0.88', () => {
    expect(lighten('#4A90D9', 0.88)).toBe('#E9F2FA')
  })

  it('produces a pale tint of the yellow preset at amount 0.88', () => {
    expect(lighten('#F1C40F', 0.88)).toBe('#FDF8E2')
  })

  it('keeps white white at any amount', () => {
    expect(lighten('#FFFFFF', 0.88)).toBe('#FFFFFF')
  })

  it('expands three-digit hex shorthand', () => {
    expect(lighten('#000', 0.5)).toBe('#808080')
  })

  it('is case-insensitive for hex input', () => {
    expect(lighten('#4a90d9', 0.88)).toBe('#E9F2FA')
  })
})
