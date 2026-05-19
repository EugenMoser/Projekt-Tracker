import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'error'

interface SyncState {
  status: SyncStatus
  lastError: string | null
  lastSyncedAt: Date | null
  consecutiveErrors: number
  token: string | null
  setStatus: (s: SyncStatus, error?: string) => void
  setLastSyncedAt: (d: Date) => void
  setToken: (t: string | null) => void
  incrementErrors: () => void
  resetErrors: () => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastError: null,
  lastSyncedAt: null,
  consecutiveErrors: 0,
  token: null,
  setStatus: (s, error) => set({ status: s, lastError: error ?? null }),
  setLastSyncedAt: (d) => set({ lastSyncedAt: d }),
  setToken: (t) => set({ token: t }),
  incrementErrors: () => set((s) => ({ consecutiveErrors: s.consecutiveErrors + 1 })),
  resetErrors: () => set({ consecutiveErrors: 0 }),
}))
