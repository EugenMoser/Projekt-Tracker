import { taskAmountCents } from '../utils/money'

describe('taskAmountCents', () => {
  it('rounds once over the sum (matches export ROUND(SUM(rate*dur)/3600))', () => {
    // two 1-min entries at 80,00 €/h -> ROUND(8000*120/3600) = 267 cents, not 266
    expect(taskAmountCents([
      { durationSeconds: 60, rateSnapshotCents: 8000 },
      { durationSeconds: 60, rateSnapshotCents: 8000 },
    ])).toBe(267)
  })
  it('returns 0 for no entries', () => {
    expect(taskAmountCents([])).toBe(0)
  })
  it('treats a null rate snapshot as 0 contribution', () => {
    expect(taskAmountCents([
      { durationSeconds: 3600, rateSnapshotCents: null },
      { durationSeconds: 3600, rateSnapshotCents: 5000 },
    ])).toBe(5000)
  })
  it('computes a full hour exactly', () => {
    expect(taskAmountCents([{ durationSeconds: 3600, rateSnapshotCents: 8000 }])).toBe(8000)
  })
})
