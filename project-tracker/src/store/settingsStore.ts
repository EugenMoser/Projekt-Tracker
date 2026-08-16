import { create } from 'zustand'

interface SettingsState {
  use12HourFormat: boolean
  setUse12HourFormat: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  use12HourFormat: false,
  setUse12HourFormat: (enabled) => set({ use12HourFormat: enabled }),
}))
