import { describe, it, expect, beforeEach } from '@jest/globals'
import { useLockStore } from '../lockStore'

const INITIAL = {
  isLocked: false as boolean,
  failedAttempts: 0,
  lockoutUntil: null as number | null,
}

beforeEach(() => {
  useLockStore.setState(INITIAL)
})

describe('lockStore', () => {
  it('starts unlocked with 0 failed attempts', () => {
    const s = useLockStore.getState()
    expect(s.isLocked).toBe(false)
    expect(s.failedAttempts).toBe(0)
    expect(s.lockoutUntil).toBeNull()
  })

  it('setLocked(true) locks the app', () => {
    useLockStore.getState().setLocked(true)
    expect(useLockStore.getState().isLocked).toBe(true)
  })

  it('setLocked(false) unlocks the app', () => {
    useLockStore.setState({ isLocked: true })
    useLockStore.getState().setLocked(false)
    expect(useLockStore.getState().isLocked).toBe(false)
  })

  it('first 4 failed attempts return no lockout', () => {
    for (let i = 0; i < 4; i++) {
      const { lockoutMs } = useLockStore.getState().recordFailedAttempt()
      expect(lockoutMs).toBeNull()
    }
    expect(useLockStore.getState().failedAttempts).toBe(4)
    expect(useLockStore.getState().lockoutUntil).toBeNull()
  })

  it('5th attempt triggers first lockout step (30 s)', () => {
    useLockStore.setState({ failedAttempts: 4 })
    const before = Date.now()
    const { lockoutMs } = useLockStore.getState().recordFailedAttempt()
    expect(lockoutMs).toBe(30_000)
    const { lockoutUntil } = useLockStore.getState()
    expect(lockoutUntil).toBeGreaterThanOrEqual(before + 30_000)
  })

  it('6th attempt escalates to 60 s', () => {
    useLockStore.setState({ failedAttempts: 5 })
    const { lockoutMs } = useLockStore.getState().recordFailedAttempt()
    expect(lockoutMs).toBe(60_000)
  })

  it('7th attempt escalates to 300 s', () => {
    useLockStore.setState({ failedAttempts: 6 })
    const { lockoutMs } = useLockStore.getState().recordFailedAttempt()
    expect(lockoutMs).toBe(300_000)
  })

  it('8th+ attempt caps at 900 s', () => {
    useLockStore.setState({ failedAttempts: 7 })
    const { lockoutMs } = useLockStore.getState().recordFailedAttempt()
    expect(lockoutMs).toBe(900_000)
    // Even further attempts stay at 900 s
    useLockStore.setState({ failedAttempts: 20 })
    const { lockoutMs: ms2 } = useLockStore.getState().recordFailedAttempt()
    expect(ms2).toBe(900_000)
  })

  it('resetAttempts clears all lockout state', () => {
    useLockStore.setState({ failedAttempts: 5, lockoutUntil: Date.now() + 30_000 })
    useLockStore.getState().resetAttempts()
    const s = useLockStore.getState()
    expect(s.failedAttempts).toBe(0)
    expect(s.lockoutUntil).toBeNull()
  })
})
