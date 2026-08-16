import * as SecureStore from 'expo-secure-store'

const KEY = 'pt_use_12h_format'

export async function isUse12HourFormat(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEY)
  return val === '1'
}

export async function setUse12HourFormat(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY, enabled ? '1' : '0')
}
