import { toDateStr } from '../utils/time'

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
