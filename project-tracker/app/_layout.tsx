import React from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SecureStore from 'expo-secure-store'
import { sqlite } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { useSyncStore } from '../src/store/syncStore'
import { useLockStore } from '../src/store/lockStore'
import { startSyncLoop, stopSyncLoop } from '../src/sync/service'
import { apiBootstrap } from '../src/sync/api'
import { API_BASE_URL, BOOTSTRAP_DISPLAY_NAME, SECURE_KEYS } from '../src/sync/config'
import { isPinSet } from '../src/auth/pinStorage'
import { LockScreen } from '../src/components/LockScreen'

const AUTO_LOCK_THRESHOLD_MS = 60_000

async function initSync(): Promise<void> {
  const store = useSyncStore.getState()

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

  const lastSyncedStr = await SecureStore.getItemAsync(SECURE_KEYS.LAST_SYNCED_AT)
  if (lastSyncedStr) {
    store.setLastSyncedAt(new Date(lastSyncedStr))
  }

  startSyncLoop()
}

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = React.useState(false)
  const isLocked = useLockStore(s => s.isLocked)
  const { setLocked } = useLockStore()
  const backgroundTimeRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    runMigrations(sqlite)
      .then(async () => {
        // PIN-Check VOR dem Freigeben der UI, damit kein Flash entsteht
        const pinEnabled = await isPinSet()
        if (pinEnabled) setLocked(true)
        setIsDbReady(true)
        void initSync()
      })
      .catch((e) => {
        console.error('Migration failed', e)
        setIsDbReady(true)
      })

    return () => stopSyncLoop()
  }, [setLocked])

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now()
      } else if (nextState === 'active') {
        if (backgroundTimeRef.current !== null) {
          const elapsed = Date.now() - backgroundTimeRef.current
          if (elapsed > AUTO_LOCK_THRESHOLD_MS) {
            void isPinSet().then(pinEnabled => {
              if (pinEnabled) setLocked(true)
            })
          }
          backgroundTimeRef.current = null
        }
      }
    })
    return () => sub.remove()
  }, [setLocked])

  if (!isDbReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {isLocked ? (
        <LockScreen onUnlock={() => setLocked(false)} />
      ) : (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="projects/new" options={{ title: 'Neues Projekt', presentation: 'modal' }} />
          <Stack.Screen name="projects/[id]" options={{ title: 'Projekt-Detail' }} />
          <Stack.Screen name="projects/[id]/edit" options={{ title: 'Projekt bearbeiten' }} />
          <Stack.Screen name="customers/index" options={{ title: 'Kunden' }} />
          <Stack.Screen name="customers/new" options={{ title: 'Neuer Kunde', presentation: 'modal' }} />
          <Stack.Screen name="order-types/index" options={{ title: 'Auftragsarten' }} />
          <Stack.Screen name="time-entries/[id]/edit" options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }} />
          <Stack.Screen name="export/index" options={{ title: 'Export', presentation: 'modal' }} />
          <Stack.Screen name="pin-setup/index" options={{ title: 'PIN einrichten', presentation: 'modal' }} />
        </Stack>
      )}
    </GestureHandlerRootView>
  )
}
