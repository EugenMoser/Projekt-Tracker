import { create } from 'zustand'

interface TimerState {
  activeProjectId: string | null
  startedAt: Date | null
  pendingStopProjectId: string | null
  setActive: (projectId: string, startedAt: Date) => void
  clearActive: () => void
  setPendingStop: (projectId: string | null) => void
}

export const useTimerStore = create<TimerState>((set) => ({
  activeProjectId: null,
  startedAt: null,
  pendingStopProjectId: null,
  setActive: (projectId, startedAt) => set({ activeProjectId: projectId, startedAt }),
  clearActive: () => set({ activeProjectId: null, startedAt: null }),
  setPendingStop: (projectId) => set({ pendingStopProjectId: projectId }),
}))
