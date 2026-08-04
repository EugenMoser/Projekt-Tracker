import { create } from 'zustand'

const LOCKOUT_STEPS_MS = [30_000, 60_000, 300_000, 900_000]
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5

interface LockState {
  isLocked: boolean
  failedAttempts: number
  lockoutUntil: number | null
  setLocked: (locked: boolean) => void
  recordFailedAttempt: () => { lockoutMs: number | null }
  resetAttempts: () => void
}

export const useLockStore = create<LockState>((set, get) => ({
  isLocked: false,
  failedAttempts: 0,
  lockoutUntil: null,

  setLocked: (locked) => set({ isLocked: locked }),

  recordFailedAttempt: () => {
    const { failedAttempts } = get()
    const next = failedAttempts + 1
    if (next >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
      const stepIndex = Math.min(
        next - MAX_ATTEMPTS_BEFORE_LOCKOUT,
        LOCKOUT_STEPS_MS.length - 1
      )
      const lockoutMs = LOCKOUT_STEPS_MS[stepIndex]!
      set({ failedAttempts: next, lockoutUntil: Date.now() + lockoutMs })
      return { lockoutMs }
    }
    set({ failedAttempts: next, lockoutUntil: null })
    return { lockoutMs: null }
  },

  resetAttempts: () => set({ failedAttempts: 0, lockoutUntil: null }),
}))
