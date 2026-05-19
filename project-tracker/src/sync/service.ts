import { AppState, type AppStateStatus } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { db } from '../db/client'
import { useSyncStore } from '../store/syncStore'
import { API_BASE_URL, LOCAL_USER_ID, SYNC_INTERVAL_MS, SECURE_KEYS } from './config'
import { apiPush, apiPull } from './api'
import { collectPushPayload, applyPull } from './syncRepository'

const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]

let nextSyncTimeout: ReturnType<typeof setTimeout> | null = null
let appStateSubscription: { remove: () => void } | null = null
let isSyncing = false

function scheduleNextSync(delayMs: number): void {
  if (nextSyncTimeout) clearTimeout(nextSyncTimeout)
  nextSyncTimeout = setTimeout(() => { void runSync() }, delayMs)
}

export async function runSync(): Promise<void> {
  if (isSyncing) return
  if (nextSyncTimeout) { clearTimeout(nextSyncTimeout); nextSyncTimeout = null }

  const store = useSyncStore.getState()
  const token = store.token
  if (!token) return

  isSyncing = true
  store.setStatus('syncing')

  try {
    const since = store.lastSyncedAt

    const payload = collectPushPayload(db, LOCAL_USER_ID, since)
    const { serverTime } = await apiPush(API_BASE_URL, token, payload)

    const pullSince = since ? since.toISOString() : null
    const pullData = await apiPull(API_BASE_URL, token, pullSince)

    applyPull(db, pullData)

    const newLastSynced = new Date(serverTime)
    store.setLastSyncedAt(newLastSynced)
    store.resetErrors()
    store.setStatus('idle')

    await SecureStore.setItemAsync(SECURE_KEYS.LAST_SYNCED_AT, serverTime)

    scheduleNextSync(SYNC_INTERVAL_MS)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const currentErrors = store.consecutiveErrors
    store.incrementErrors()
    store.setStatus('error', msg)

    const delay = BACKOFF_DELAYS[Math.min(currentErrors, BACKOFF_DELAYS.length - 1)]
    scheduleNextSync(delay)
  } finally {
    isSyncing = false
  }
}

function handleAppStateChange(nextState: AppStateStatus): void {
  if (nextState === 'active') {
    void runSync()
  }
}

export function startSyncLoop(): void {
  void runSync()
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange)
}

export function stopSyncLoop(): void {
  if (nextSyncTimeout) { clearTimeout(nextSyncTimeout); nextSyncTimeout = null }
  if (appStateSubscription) { appStateSubscription.remove(); appStateSubscription = null }
  isSyncing = false
}
