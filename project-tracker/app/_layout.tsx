import React from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SecureStore from 'expo-secure-store'
import { sqlite } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { useSyncStore } from '../src/store/syncStore'
import { startSyncLoop, stopSyncLoop } from '../src/sync/service'
import { apiBootstrap } from '../src/sync/api'
import { API_BASE_URL, BOOTSTRAP_DISPLAY_NAME, SECURE_KEYS } from '../src/sync/config'

async function initSync(): Promise<void> {
  const store = useSyncStore.getState()

  // Load or create JWT token
  let token = await SecureStore.getItemAsync(SECURE_KEYS.TOKEN)
  if (!token) {
    try {
      const result = await apiBootstrap(API_BASE_URL, BOOTSTRAP_DISPLAY_NAME)
      token = result.token
      await SecureStore.setItemAsync(SECURE_KEYS.TOKEN, token)
      await SecureStore.setItemAsync(SECURE_KEYS.USER_ID, result.userId)
    } catch (e) {
      console.warn('[sync] Bootstrap failed, working offline:', e)
      return
    }
  }
  store.setToken(token)

  // Restore lastSyncedAt
  const lastSyncedStr = await SecureStore.getItemAsync(SECURE_KEYS.LAST_SYNCED_AT)
  if (lastSyncedStr) {
    store.setLastSyncedAt(new Date(lastSyncedStr))
  }

  startSyncLoop()
}

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = React.useState(false)

  React.useEffect(() => {
    runMigrations(sqlite)
      .then(() => {
        setIsDbReady(true)
        void initSync()
      })
      .catch((e) => {
        console.error('Migration failed', e)
        setIsDbReady(true)
      })

    return () => stopSyncLoop()
  }, [])

  if (!isDbReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="projects/new" options={{ title: 'Neues Projekt', presentation: 'modal' }} />
        <Stack.Screen name="projects/[id]" options={{ title: 'Projekt-Detail' }} />
        <Stack.Screen name="customers" options={{ title: 'Kunden' }} />
        <Stack.Screen name="customers/new" options={{ title: 'Neuer Kunde', presentation: 'modal' }} />
        <Stack.Screen name="order-types" options={{ title: 'Auftragsarten' }} />
        <Stack.Screen name="time-entries/[id]/edit" options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }} />
        <Stack.Screen name="export/index" options={{ title: 'Export', presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
