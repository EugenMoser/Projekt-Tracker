import React from 'react'

import { Stack } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { AppState, SafeAreaView, StyleSheet, Text, View, type AppStateStatus } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { isPinSet } from '../src/auth/pinStorage'
import { LockScreen } from '../src/components/LockScreen'
import { sqlite } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { isUse12HourFormat } from '../src/settings/timeFormat'
import { useLockStore } from '../src/store/lockStore'
import { useSettingsStore } from '../src/store/settingsStore'
import { useSyncStore } from '../src/store/syncStore'
import { apiBootstrap } from '../src/sync/api'
import { API_BASE_URL, BOOTSTRAP_DISPLAY_NAME, SECURE_KEYS } from '../src/sync/config'
import { startSyncLoop, stopSyncLoop } from '../src/sync/service'
import { colors, fontSize, fontWeight, space } from '../src/theme'

const AUTO_LOCK_THRESHOLD_MS = 60_000

/**
 * @param forceFullSync drop the stored sync cursor so the next push is a full
 *   one. Set after a migration ran: a migration can rewrite existing rows
 *   without touching their `updated_at` (the v2 sort_order backfill does), and
 *   the incremental `updatedAt > since` filter would never pick those up.
 */
async function initSync(forceFullSync: boolean): Promise<void> {
  const store = useSyncStore.getState()

  // Before the bootstrap, so an offline start does not carry the stale cursor
  // into the next launch (where nothing would migrate any more).
  if (forceFullSync) {
    await SecureStore.deleteItemAsync(SECURE_KEYS.LAST_SYNCED_AT)
  }

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

  if (!forceFullSync) {
    const lastSyncedStr = await SecureStore.getItemAsync(SECURE_KEYS.LAST_SYNCED_AT)
    if (lastSyncedStr) {
      store.setLastSyncedAt(new Date(lastSyncedStr))
    }
  }

  startSyncLoop()
}

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = React.useState(false)
  const [migrationFailed, setMigrationFailed] = React.useState(false)
  const isLocked = useLockStore((s) => s.isLocked)
  const { setLocked } = useLockStore()
  const backgroundTimeRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    runMigrations(sqlite)
      .then(async (didMigrate) => {
        // PIN-Check VOR dem Freigeben der UI, damit kein Flash entsteht
        const pinEnabled = await isPinSet()
        if (pinEnabled) setLocked(true)
        setIsDbReady(true)
        void isUse12HourFormat().then((enabled) => {
          useSettingsStore.getState().setUse12HourFormat(enabled)
        })
        // A migration may rewrite rows without bumping their updated_at (the v2
        // sort_order backfill does exactly that on purpose). The incremental
        // push filter would never see those changes, so force one full sync.
        void initSync(didMigrate)
      })
      .catch((e) => {
        console.error('Migration failed', e)
        // Do NOT boot on. A migration that failed after BEGIN leaves an open
        // transaction on the singleton connection; every write of this session
        // would silently be rolled back when the connection closes.
        setMigrationFailed(true)
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
            void isPinSet().then((pinEnabled) => {
              if (pinEnabled) setLocked(true)
            })
          }
          backgroundTimeRef.current = null
        }
      }
    })
    return () => sub.remove()
  }, [setLocked])

  if (migrationFailed) return <MigrationErrorScreen />
  if (!isDbReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {isLocked ? (
        <LockScreen onUnlock={() => setLocked(false)} />
      ) : (
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="projects/new-from-template" options={{ title: 'Neues Projekt' }} />
          <Stack.Screen
            name="projects/new"
            options={{ title: 'Neues Projekt', presentation: 'modal' }}
          />
          <Stack.Screen name="projects/[id]" options={{ title: 'Projekt-Detail' }} />
          <Stack.Screen name="projects/[id]/edit" options={{ title: 'Projekt bearbeiten' }} />
          <Stack.Screen
            name="customers/new"
            options={{ title: 'Neuer Kunde', presentation: 'modal' }}
          />
          <Stack.Screen
            name="customers/[id]/edit"
            options={{ title: 'Kunde bearbeiten', presentation: 'modal' }}
          />
          <Stack.Screen name="order-types/index" options={{ title: 'Auftragsarten' }} />
          <Stack.Screen
            name="archived-projects/index"
            options={{ title: 'Archivierte Projekte' }}
          />
          <Stack.Screen name="project-templates/index" options={{ title: 'Projekt-Vorlagen' }} />
          <Stack.Screen
            name="project-templates/new"
            options={{ title: 'Neue Vorlage', presentation: 'modal' }}
          />
          <Stack.Screen
            name="project-templates/[id]/edit"
            options={{ title: 'Vorlage bearbeiten', presentation: 'modal' }}
          />
          <Stack.Screen
            name="time-entries/new"
            options={{ title: 'Zeiteintrag anlegen', presentation: 'modal' }}
          />
          <Stack.Screen
            name="time-entries/[id]/edit"
            options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }}
          />
          <Stack.Screen name="export/index" options={{ title: 'Export', presentation: 'modal' }} />
          <Stack.Screen
            name="pin-setup/index"
            options={{ title: 'PIN einrichten', presentation: 'modal' }}
          />
        </Stack>
      )}
    </GestureHandlerRootView>
  )
}

/**
 * Dead end on purpose: no retry, no reset. Anything that could repair the
 * schema automatically could just as well drop data, and the data on disk is
 * still intact at this point.
 */
function MigrationErrorScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Datenbank konnte nicht aktualisiert werden</Text>
        <Text style={styles.body}>
          Bitte starte die App neu. Deine Daten sind unverändert — es wurde nichts gespeichert und
          nichts gelöscht.
        </Text>
        <Text style={styles.body}>
          Bleibt der Fehler bestehen, hilft ein Neustart des Geräts oder ein Update der App.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  title: {
    fontSize: fontSize.headline,
    fontWeight: fontWeight.semibold,
    marginBottom: space.lg,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.bodyLarge,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: space.md,
    lineHeight: 22,
  },
})
