import { formatHoursMinutes, parseTimeStr, toDateStr } from '../utils/time'

describe('toDateStr', () => {
  it('matches the local calendar date shortly after local midnight', () => {
    // Regression: a naive `toISOString().slice(0, 10)` implementation would
    // convert to UTC first and return the PREVIOUS day here in any timezone
    // ahead of UTC (e.g. CET/CEST).
    const d = new Date(2026, 0, 15, 0, 30) // Jan 15, 00:30 local time
    expect(toDateStr(d)).toBe('2026-01-15')
  })

  it('matches the local calendar date at a normal midday time', () => {
    const d = new Date(2026, 0, 15, 12, 0)
    expect(toDateStr(d)).toBe('2026-01-15')
  })

  it('matches the local calendar date shortly before local midnight', () => {
    const d = new Date(2026, 0, 15, 23, 59)
    expect(toDateStr(d)).toBe('2026-01-15')
  })
})

describe('parseTimeStr', () => {
  it('parses an HH:MM string into hours and minutes', () => {
    expect(parseTimeStr('09:05')).toEqual({ hours: 9, minutes: 5 })
  })

  it('parses midnight', () => {
    expect(parseTimeStr('00:00')).toEqual({ hours: 0, minutes: 0 })
  })
})

describe('formatHoursMinutes', () => {
  it('zero-pads single-digit hours and minutes', () => {
    expect(formatHoursMinutes(9, 5)).toBe('09:05')
  })

  it('leaves double-digit values unpadded', () => {
    expect(formatHoursMinutes(23, 59)).toBe('23:59')
  })
})
