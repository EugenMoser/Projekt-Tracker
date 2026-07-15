import { getContrastTextColor } from '../utils/color'

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
