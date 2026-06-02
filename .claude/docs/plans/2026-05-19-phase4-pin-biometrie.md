# Phase 4: App-PIN & Biometrie — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App-weiter PIN-Schutz mit optionaler Biometrie (Face ID / Touch ID), Auto-Lock nach 60 s Hintergrund, Schutz gegen Brute-Force durch eskalierendes Lockout.

**Architecture:** PIN wird als SHA-256(salt + pin) in `expo-secure-store` gespeichert — nie im Klartext. Der Zustand "gesperrt / entsperrt" lebt in einem Zustand-Store (`lockStore`). `_layout.tsx` rendert entweder `<LockScreen>` oder den normalen App-Stack. Der AppState-Listener setzt die Sperre nach > 60 s im Hintergrund.

**Tech Stack:** `expo-crypto` (SHA-256, Zufalls-Salt), `expo-secure-store` (bereits installiert), `expo-local-authentication` (Biometrie), Zustand, Jest (jest-expo preset), React Native AppState

---

## Datei-Übersicht

| Datei | Aktion | Zweck |
|---|---|---|
| `project-tracker/app.json` | Modify | `expo-local-authentication` Plugin + Face-ID-Strings hinzufügen |
| `project-tracker/src/auth/pinStorage.ts` | Create | Hash/Verify/Save/Clear-PIN, Biometrie-Flag |
| `project-tracker/src/auth/__tests__/pinStorage.test.ts` | Create | Jest-Tests mit gemockten expo-Natives |
| `project-tracker/src/store/lockStore.ts` | Create | Zustand: isLocked, failedAttempts, lockoutUntil, Escalation |
| `project-tracker/src/store/__tests__/lockStore.test.ts` | Create | Jest-Tests (reine JS-Logik, kein Mock nötig) |
| `project-tracker/src/components/LockScreen.tsx` | Create | Numerisches Keypad, PIN-Dots, Biometrie-Button, Countdown |
| `project-tracker/app/_layout.tsx` | Modify | PIN-Check beim Start, AppState-Auto-Lock, bedingte Render |
| `project-tracker/app/pin-setup/index.tsx` | Create | PIN einrichten / ändern (Setup-Flow mit Bestätigungsschritt) |
| `project-tracker/app/(tabs)/settings.tsx` | Modify | PIN-Sektion: einrichten / ändern / deaktivieren / Biometrie-Toggle |

---

## Task 1: expo-crypto und expo-local-authentication installieren

**Files:**
- Modify: `project-tracker/app.json`

- [ ] **Step 1: Pakete installieren**

Aus dem Verzeichnis `project-tracker/` ausführen:

```bash
npx expo install expo-crypto expo-local-authentication
```

Erwartete Ausgabe: Kein Fehler, beide Pakete erscheinen in `package.json`.

- [ ] **Step 2: Plugin in app.json eintragen**

In `project-tracker/app.json`, den `"plugins"`-Array um den Eintrag für `expo-local-authentication` erweitern:

```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    {
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 200,
      "resizeMode": "contain",
      "backgroundColor": "#ffffff",
      "dark": { "backgroundColor": "#000000" }
    }
  ],
  "expo-secure-store",
  [
    "expo-local-authentication",
    {
      "faceIDPermission": "$(PRODUCT_NAME) verwendet Face ID, um die App zu entsperren."
    }
  ]
]
```

- [ ] **Step 3: TypeScript-Compiler-Check**

```bash
cd project-tracker && npx tsc --noEmit
```

Erwartete Ausgabe: Keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add project-tracker/package.json project-tracker/app.json
git commit -m "feat(auth): install expo-crypto and expo-local-authentication"
```

---

## Task 2: pinStorage.ts (TDD)

**Files:**
- Create: `project-tracker/src/auth/pinStorage.ts`
- Create: `project-tracker/src/auth/__tests__/pinStorage.test.ts`

- [ ] **Step 1: Verzeichnisse anlegen**

```bash
mkdir -p project-tracker/src/auth/__tests__
```

- [ ] **Step 2: Failing tests schreiben**

`project-tracker/src/auth/__tests__/pinStorage.test.ts`:

```typescript
import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// In-memory store für SecureStore-Mock
const secureStore: Record<string, string> = {}

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(secureStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, val: string) => {
    secureStore[key] = val
    return Promise.resolve()
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete secureStore[key]
    return Promise.resolve()
  }),
}))

const MOCK_SALT_BYTES = new Uint8Array(32).fill(0xab)
const MOCK_SALT_HEX = 'ab'.repeat(32)
const MOCK_HASH = 'sha256mock_hash_value'

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(() => Promise.resolve(MOCK_SALT_BYTES)),
  digestStringAsync: jest.fn(() => Promise.resolve(MOCK_HASH)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
}))

import {
  savePin,
  verifyPin,
  isPinSet,
  clearPin,
  setBiometryEnabled,
  isBiometryEnabled,
} from '../pinStorage'

beforeEach(() => {
  // SecureStore zurücksetzen
  Object.keys(secureStore).forEach(k => delete secureStore[k])
  jest.clearAllMocks()
  // Mock neu registrieren nach clearAllMocks
  const SecureStore = require('expo-secure-store') as {
    getItemAsync: jest.Mock
    setItemAsync: jest.Mock
    deleteItemAsync: jest.Mock
  }
  SecureStore.getItemAsync.mockImplementation((key: string) =>
    Promise.resolve(secureStore[key] ?? null)
  )
  SecureStore.setItemAsync.mockImplementation((key: string, val: string) => {
    secureStore[key] = val
    return Promise.resolve()
  })
  SecureStore.deleteItemAsync.mockImplementation((key: string) => {
    delete secureStore[key]
    return Promise.resolve()
  })
  const Crypto = require('expo-crypto') as { getRandomBytesAsync: jest.Mock; digestStringAsync: jest.Mock }
  Crypto.getRandomBytesAsync.mockResolvedValue(MOCK_SALT_BYTES)
  Crypto.digestStringAsync.mockResolvedValue(MOCK_HASH)
})

describe('pinStorage', () => {
  it('isPinSet returns false when no PIN stored', async () => {
    expect(await isPinSet()).toBe(false)
  })

  it('savePin stores hash and salt — never plaintext', async () => {
    await savePin('1234')
    const storedValues = Object.values(secureStore)
    expect(storedValues).not.toContain('1234')
    expect(storedValues).toContain(MOCK_HASH)
    expect(storedValues).toContain(MOCK_SALT_HEX)
  })

  it('isPinSet returns true after savePin', async () => {
    await savePin('1234')
    expect(await isPinSet()).toBe(true)
  })

  it('verifyPin returns true for correct PIN', async () => {
    await savePin('1234')
    // digestStringAsync beim verify gibt denselben MOCK_HASH zurück
    expect(await verifyPin('1234')).toBe(true)
  })

  it('verifyPin returns false for wrong PIN (different hash)', async () => {
    await savePin('1234')
    const Crypto = require('expo-crypto') as { digestStringAsync: jest.Mock }
    Crypto.digestStringAsync.mockResolvedValueOnce('different_hash')
    expect(await verifyPin('9999')).toBe(false)
  })

  it('verifyPin returns false when no PIN set', async () => {
    expect(await verifyPin('1234')).toBe(false)
  })

  it('clearPin removes all PIN entries', async () => {
    await savePin('1234')
    await clearPin()
    expect(await isPinSet()).toBe(false)
    expect(Object.keys(secureStore).filter(k => k.startsWith('pt_pin'))).toHaveLength(0)
  })

  it('isBiometryEnabled returns false by default', async () => {
    expect(await isBiometryEnabled()).toBe(false)
  })

  it('setBiometryEnabled / isBiometryEnabled round-trip', async () => {
    await setBiometryEnabled(true)
    expect(await isBiometryEnabled()).toBe(true)
    await setBiometryEnabled(false)
    expect(await isBiometryEnabled()).toBe(false)
  })
})
```

- [ ] **Step 3: Tests fehlschlagen lassen**

```bash
cd project-tracker && npx jest src/auth/__tests__/pinStorage.test.ts --passWithNoTests
```

Erwartete Ausgabe: `Cannot find module '../pinStorage'` o.ä.

- [ ] **Step 4: pinStorage.ts implementieren**

`project-tracker/src/auth/pinStorage.ts`:

```typescript
import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'

const KEYS = {
  PIN_HASH: 'pt_pin_hash',
  PIN_SALT: 'pt_pin_salt',
  BIOMETRY_ENABLED: 'pt_biometry_enabled',
} as const

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + pin,
    { encoding: Crypto.CryptoEncoding.HEX }
  )
}

export async function savePin(pin: string): Promise<void> {
  const saltBytes = await Crypto.getRandomBytesAsync(32)
  const salt = bytesToHex(saltBytes)
  const hash = await hashPin(pin, salt)
  await SecureStore.setItemAsync(KEYS.PIN_HASH, hash)
  await SecureStore.setItemAsync(KEYS.PIN_SALT, salt)
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [hash, salt] = await Promise.all([
    SecureStore.getItemAsync(KEYS.PIN_HASH),
    SecureStore.getItemAsync(KEYS.PIN_SALT),
  ])
  if (!hash || !salt) return false
  const candidate = await hashPin(pin, salt)
  return candidate === hash
}

export async function isPinSet(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(KEYS.PIN_HASH)
  return hash !== null
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.PIN_HASH)
  await SecureStore.deleteItemAsync(KEYS.PIN_SALT)
}

export async function setBiometryEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.BIOMETRY_ENABLED, enabled ? '1' : '0')
}

export async function isBiometryEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEYS.BIOMETRY_ENABLED)
  return val === '1'
}
```

- [ ] **Step 5: Tests grün**

```bash
cd project-tracker && npx jest src/auth/__tests__/pinStorage.test.ts
```

Erwartete Ausgabe: `9 tests passed`.

- [ ] **Step 6: TypeScript-Check**

```bash
cd project-tracker && npx tsc --noEmit
```

Erwartete Ausgabe: Keine Fehler.

- [ ] **Step 7: Commit**

```bash
git add project-tracker/src/auth/
git commit -m "feat(auth): pinStorage — SHA-256+salt hash, verify, biometry flag (TDD)"
```

---

## Task 3: lockStore.ts (TDD)

**Files:**
- Create: `project-tracker/src/store/lockStore.ts`
- Create: `project-tracker/src/store/__tests__/lockStore.test.ts`

- [ ] **Step 1: Verzeichnis anlegen**

```bash
mkdir -p project-tracker/src/store/__tests__
```

- [ ] **Step 2: Failing tests schreiben**

`project-tracker/src/store/__tests__/lockStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals'
import { useLockStore } from '../lockStore'

const INITIAL: Parameters<typeof useLockStore.setState>[0] = {
  isLocked: false,
  failedAttempts: 0,
  lockoutUntil: null,
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
```

- [ ] **Step 3: Tests fehlschlagen lassen**

```bash
cd project-tracker && npx jest src/store/__tests__/lockStore.test.ts --passWithNoTests
```

Erwartete Ausgabe: `Cannot find module '../lockStore'`.

- [ ] **Step 4: lockStore.ts implementieren**

`project-tracker/src/store/lockStore.ts`:

```typescript
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
```

- [ ] **Step 5: Tests grün**

```bash
cd project-tracker && npx jest src/store/__tests__/lockStore.test.ts
```

Erwartete Ausgabe: `9 tests passed`.

- [ ] **Step 6: Commit**

```bash
git add project-tracker/src/store/lockStore.ts project-tracker/src/store/__tests__/lockStore.test.ts
git commit -m "feat(auth): lockStore — isLocked, failed-attempt escalation, Zustand (TDD)"
```

---

## Task 4: LockScreen.tsx

**Files:**
- Create: `project-tracker/src/components/LockScreen.tsx`

- [ ] **Step 1: LockScreen.tsx erstellen**

`project-tracker/src/components/LockScreen.tsx`:

```typescript
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { verifyPin, isBiometryEnabled } from '../auth/pinStorage'
import { useLockStore } from '../store/lockStore'

interface Props {
  onUnlock: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function LockScreen({ onUnlock }: Props) {
  const [digits, setDigits] = useState('')
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const { lockoutUntil, recordFailedAttempt, resetAttempts } = useLockStore()

  useEffect(() => {
    if (!lockoutUntil) { setLockoutRemaining(0); return }
    const update = () => {
      const remaining = Math.max(0, lockoutUntil - Date.now())
      setLockoutRemaining(Math.ceil(remaining / 1000))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [lockoutUntil])

  const tryBiometry = useCallback(async () => {
    const enabled = await isBiometryEnabled()
    if (!enabled) return
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    const isEnrolled = await LocalAuthentication.isEnrolledAsync()
    if (!hasHardware || !isEnrolled) return
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'App entsperren',
      cancelLabel: 'PIN verwenden',
    })
    if (result.success) {
      resetAttempts()
      onUnlock()
    }
  }, [onUnlock, resetAttempts])

  useEffect(() => { void tryBiometry() }, [tryBiometry])

  const handleKey = (key: string) => {
    if (lockoutRemaining > 0) return
    if (key === '⌫') {
      setDigits(d => d.slice(0, -1))
      return
    }
    if (digits.length >= 6) return
    setDigits(d => d + key)
  }

  const handleConfirm = async () => {
    if (digits.length < 4 || lockoutRemaining > 0) return
    const ok = await verifyPin(digits)
    if (ok) {
      resetAttempts()
      onUnlock()
    } else {
      setDigits('')
      const { lockoutMs } = recordFailedAttempt()
      if (lockoutMs) {
        Alert.alert(
          'Zu viele Fehlversuche',
          `Bitte warte ${Math.ceil(lockoutMs / 1000)} Sekunden.`
        )
      }
    }
  }

  const dotRow = '●'.repeat(digits.length).padEnd(6, '○')

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>PIN eingeben</Text>
        <Text style={styles.dots} accessibilityLabel={`${digits.length} Stellen eingegeben`}>
          {dotRow}
        </Text>
        {lockoutRemaining > 0 && (
          <Text style={styles.lockout}>
            Gesperrt — noch {lockoutRemaining} s
          </Text>
        )}
        <View style={styles.grid}>
          {KEYS.map((key, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.key,
                key === '' && styles.keyInvisible,
                pressed && key !== '' && styles.keyPressed,
              ]}
              onPress={() => key && handleKey(key)}
              accessibilityLabel={key === '⌫' ? 'Löschen' : key || undefined}
              accessibilityRole={key ? 'button' : undefined}
              disabled={!key}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.confirm, (digits.length < 4 || lockoutRemaining > 0) && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={digits.length < 4 || lockoutRemaining > 0}
          accessibilityRole="button"
          accessibilityLabel="Bestätigen"
        >
          <Text style={styles.confirmText}>Bestätigen</Text>
        </Pressable>
        <Pressable
          onPress={tryBiometry}
          style={styles.biometry}
          accessibilityRole="button"
          accessibilityLabel="Biometrie verwenden"
        >
          <Text style={styles.biometryText}>Biometrie</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 24 },
  dots: { fontSize: 28, letterSpacing: 12, marginBottom: 16 },
  lockout: { color: '#FF3B30', fontSize: 14, marginBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 264,
    marginBottom: 24,
  },
  key: {
    width: 80,
    height: 80,
    margin: 4,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyInvisible: { backgroundColor: 'transparent' },
  keyPressed: { backgroundColor: '#E5E5EA' },
  keyText: { fontSize: 24, fontWeight: '400' },
  confirm: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 48,
    paddingVertical: 14,
    marginBottom: 16,
  },
  confirmDisabled: { backgroundColor: '#C7C7CC' },
  confirmText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  biometry: { padding: 12 },
  biometryText: { color: '#007AFF', fontSize: 16 },
})
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd project-tracker && npx tsc --noEmit
```

Erwartete Ausgabe: Keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add project-tracker/src/components/LockScreen.tsx
git commit -m "feat(auth): LockScreen component — keypad, PIN dots, biometry, lockout countdown"
```

---

## Task 5: _layout.tsx — PIN-Init und AppState-Auto-Lock

**Files:**
- Modify: `project-tracker/app/_layout.tsx`

Der vollständige neue Inhalt von `project-tracker/app/_layout.tsx`:

- [ ] **Step 1: _layout.tsx aktualisieren**

Ersetze den gesamten Inhalt von `project-tracker/app/_layout.tsx` durch:

```typescript
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
          <Stack.Screen name="customers" options={{ title: 'Kunden' }} />
          <Stack.Screen name="customers/new" options={{ title: 'Neuer Kunde', presentation: 'modal' }} />
          <Stack.Screen name="order-types" options={{ title: 'Auftragsarten' }} />
          <Stack.Screen name="time-entries/[id]/edit" options={{ title: 'Zeiteintrag bearbeiten', presentation: 'modal' }} />
          <Stack.Screen name="export/index" options={{ title: 'Export', presentation: 'modal' }} />
          <Stack.Screen name="pin-setup/index" options={{ title: 'PIN einrichten', presentation: 'modal' }} />
        </Stack>
      )}
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd project-tracker && npx tsc --noEmit
```

Erwartete Ausgabe: Keine Fehler.

- [ ] **Step 3: Manueller Test — kein PIN gesetzt**

```bash
cd project-tracker && npx expo start --ios
```

Erwartete Ausgabe: App startet normal, kein LockScreen.

- [ ] **Step 4: Commit**

```bash
git add project-tracker/app/_layout.tsx
git commit -m "feat(auth): wire PIN lock in _layout — init check, AppState auto-lock after 60s"
```

---

## Task 6: pin-setup/index.tsx

**Files:**
- Create: `project-tracker/app/pin-setup/index.tsx`

Dieser Screen hat zwei Modi:
- `mode=setup` (default): PIN einrichten — Schritt 1: eingeben, Schritt 2: bestätigen
- `mode=change`: PIN ändern — Schritt 0: aktuellen PIN prüfen, Schritt 1: neuen PIN eingeben, Schritt 2: bestätigen

- [ ] **Step 1: Verzeichnis anlegen**

```bash
mkdir -p project-tracker/app/pin-setup
```

- [ ] **Step 2: pin-setup/index.tsx erstellen**

`project-tracker/app/pin-setup/index.tsx`:

```typescript
import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { savePin, verifyPin } from '../../src/auth/pinStorage'

type Step = 'verify-current' | 'enter' | 'confirm'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

const STEP_TITLES: Record<Step, string> = {
  'verify-current': 'Aktuellen PIN eingeben',
  enter: 'Neuen PIN eingeben',
  confirm: 'PIN bestätigen',
}

export default function PinSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const isChange = mode === 'change'

  const [step, setStep] = useState<Step>(isChange ? 'verify-current' : 'enter')
  const [digits, setDigits] = useState('')
  const [newPin, setNewPin] = useState('')

  const handleKey = (key: string) => {
    if (key === '⌫') { setDigits(d => d.slice(0, -1)); return }
    if (digits.length >= 6) return
    setDigits(d => d + key)
  }

  const handleConfirm = async () => {
    if (digits.length < 4) return

    if (step === 'verify-current') {
      const ok = await verifyPin(digits)
      if (!ok) {
        Alert.alert('Falscher PIN', 'Bitte versuche es erneut.')
        setDigits('')
        return
      }
      setStep('enter')
      setDigits('')
      return
    }

    if (step === 'enter') {
      setNewPin(digits)
      setStep('confirm')
      setDigits('')
      return
    }

    // step === 'confirm'
    if (digits !== newPin) {
      Alert.alert('PINs stimmen nicht überein', 'Bitte nochmals eingeben.')
      setStep('enter')
      setDigits('')
      setNewPin('')
      return
    }

    await savePin(digits)
    Alert.alert('PIN gespeichert', '', [{ text: 'OK', onPress: () => router.back() }])
  }

  const dotRow = '●'.repeat(digits.length).padEnd(6, '○')

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{STEP_TITLES[step]}</Text>
        <Text style={styles.subtitle}>
          {step === 'enter' ? '4–6 Stellen' : step === 'confirm' ? 'Wiederholen' : ''}
        </Text>
        <Text style={styles.dots} accessibilityLabel={`${digits.length} Stellen`}>
          {dotRow}
        </Text>
        <View style={styles.grid}>
          {KEYS.map((key, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.key,
                key === '' && styles.keyInvisible,
                pressed && key !== '' && styles.keyPressed,
              ]}
              onPress={() => key && handleKey(key)}
              accessibilityLabel={key === '⌫' ? 'Löschen' : key || undefined}
              accessibilityRole={key ? 'button' : undefined}
              disabled={!key}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.confirm, digits.length < 4 && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={digits.length < 4}
          accessibilityRole="button"
          accessibilityLabel="Weiter"
        >
          <Text style={styles.confirmText}>
            {step === 'confirm' ? 'Speichern' : 'Weiter'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8E8E93', marginBottom: 20 },
  dots: { fontSize: 28, letterSpacing: 12, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 264, marginBottom: 24 },
  key: {
    width: 80, height: 80, margin: 4, borderRadius: 40,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },
  keyInvisible: { backgroundColor: 'transparent' },
  keyPressed: { backgroundColor: '#E5E5EA' },
  keyText: { fontSize: 24, fontWeight: '400' },
  confirm: {
    backgroundColor: '#007AFF', borderRadius: 12,
    paddingHorizontal: 48, paddingVertical: 14,
  },
  confirmDisabled: { backgroundColor: '#C7C7CC' },
  confirmText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
})
```

- [ ] **Step 3: TypeScript-Check**

```bash
cd project-tracker && npx tsc --noEmit
```

Erwartete Ausgabe: Keine Fehler.

- [ ] **Step 4: Manueller Test Setup-Flow**

```bash
cd project-tracker && npx expo start --ios
```

Ablauf:
1. Settings → "PIN einrichten" → `pin-setup` Screen öffnet sich
2. 4-stelligen PIN eingeben → "Weiter"
3. Bestätigen mit gleichem PIN → "Speichern" → Alert "PIN gespeichert"
4. App neu starten → LockScreen erscheint
5. PIN eingeben → App entsperrt

- [ ] **Step 5: Manueller Test Change-Flow**

1. Settings → "PIN ändern" → Screen öffnet mit "Aktuellen PIN eingeben"
2. Richtigen PIN → "Weiter" → "Neuen PIN eingeben"
3. Neuen PIN + Bestätigung → "Speichern"
4. App neu starten → neuer PIN funktioniert

- [ ] **Step 6: Commit**

```bash
git add project-tracker/app/pin-setup/
git commit -m "feat(auth): pin-setup screen — setup and change flow with 4-6 digit PIN"
```

---

## Task 7: Settings — PIN-Sektion

**Files:**
- Modify: `project-tracker/app/(tabs)/settings.tsx`

- [ ] **Step 1: settings.tsx aktualisieren**

Ersetze den gesamten Inhalt von `project-tracker/app/(tabs)/settings.tsx` durch:

```typescript
import React, { useState, useCallback } from 'react'
import { View, Pressable, Text, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import * as LocalAuthentication from 'expo-local-authentication'
import { SyncIndicator } from '../../src/components/SyncIndicator'
import {
  isPinSet,
  clearPin,
  isBiometryEnabled,
  setBiometryEnabled,
} from '../../src/auth/pinStorage'
import { useLockStore } from '../../src/store/lockStore'

export default function SettingsScreen() {
  const [pinEnabled, setPinEnabled] = useState(false)
  const [biometrySupported, setBiometrySupported] = useState(false)
  const [biometryEnabled, setBiometryEnabledState] = useState(false)
  const { resetAttempts } = useLockStore()

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const [pinSet, bioEnabled, hasHardware, isEnrolled] = await Promise.all([
          isPinSet(),
          isBiometryEnabled(),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ])
        setPinEnabled(pinSet)
        setBiometryEnabledState(bioEnabled)
        setBiometrySupported(hasHardware && isEnrolled)
      })()
    }, [])
  )

  const handleDisablePin = () => {
    Alert.alert(
      'PIN deaktivieren',
      'Die App ist danach nicht mehr durch einen PIN geschützt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Deaktivieren',
          style: 'destructive',
          onPress: async () => {
            await clearPin()
            await setBiometryEnabled(false)
            resetAttempts()
            setPinEnabled(false)
            setBiometryEnabledState(false)
          },
        },
      ]
    )
  }

  const handleBiometryToggle = async () => {
    const next = !biometryEnabled
    await setBiometryEnabled(next)
    setBiometryEnabledState(next)
  }

  return (
    <View style={styles.container}>
      <View style={styles.syncSection}>
        <SyncIndicator />
      </View>

      {/* PIN-Sektion */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Sicherheit</Text>
        <Pressable
          style={styles.row}
          onPress={() =>
            router.push(
              pinEnabled
                ? ('/pin-setup/index?mode=change' as any)
                : ('/pin-setup/index' as any)
            )
          }
          accessibilityRole="button"
          accessibilityLabel={pinEnabled ? 'PIN ändern' : 'PIN einrichten'}
        >
          <Text style={styles.label}>{pinEnabled ? 'PIN ändern' : 'PIN einrichten'}</Text>
          <Text>›</Text>
        </Pressable>
        {pinEnabled && (
          <Pressable
            style={styles.row}
            onPress={handleDisablePin}
            accessibilityRole="button"
            accessibilityLabel="PIN deaktivieren"
          >
            <Text style={[styles.label, styles.destructive]}>PIN deaktivieren</Text>
          </Pressable>
        )}
        {pinEnabled && biometrySupported && (
          <Pressable
            style={styles.row}
            onPress={handleBiometryToggle}
            accessibilityRole="button"
            accessibilityLabel={biometryEnabled ? 'Biometrie deaktivieren' : 'Biometrie aktivieren'}
          >
            <Text style={styles.label}>
              Biometrie {biometryEnabled ? 'deaktivieren' : 'aktivieren'}
            </Text>
            <Text style={{ color: biometryEnabled ? '#34C759' : '#8E8E93' }}>
              {biometryEnabled ? 'An' : 'Aus'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Export + Verwaltung */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Daten</Text>
        <Pressable
          style={styles.row}
          onPress={() => router.push('/export' as any)}
          accessibilityRole="button"
          accessibilityLabel="Export erstellen"
        >
          <Text style={styles.label}>Export erstellen</Text>
          <Text>›</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/order-types')}>
          <Text style={styles.label}>Auftragsarten</Text>
          <Text>›</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push('/customers')}>
          <Text style={styles.label}>Kunden</Text>
          <Text>›</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  syncSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    marginBottom: 16,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 44,
  },
  label: { fontSize: 16 },
  destructive: { color: '#FF3B30' },
})
```

- [ ] **Step 2: TypeScript-Check + Tests**

```bash
cd project-tracker && npx tsc --noEmit && npx jest --passWithNoTests
```

Erwartete Ausgabe: Keine TS-Fehler, alle Tests grün.

- [ ] **Step 3: Manueller Test — vollständiger Ablauf**

```bash
cd project-tracker && npx expo start --ios
```

Prüfliste:
- [ ] Settings zeigt "PIN einrichten" (kein PIN gesetzt)
- [ ] PIN einrichten → "PIN gespeichert" → Settings zeigt "PIN ändern" + "PIN deaktivieren"
- [ ] App-Kill → Neustart → LockScreen erscheint
- [ ] Richtigen PIN → App entsperrt
- [ ] App minimieren > 60 s → vordergrund → LockScreen erscheint
- [ ] 5 falsche PINs → "Gesperrt – noch 30 s" Countdown erscheint
- [ ] Biometrie aktivieren → nächster Lock zeigt sofort Biometrie-Dialog
- [ ] PIN deaktivieren → Bestätigung → App startet ohne LockScreen

- [ ] **Step 4: Commit**

```bash
git add project-tracker/app/(tabs)/settings.tsx
git commit -m "feat(auth): settings PIN section — setup, change, disable, biometry toggle"
```

---

## Self-Review

**Spec-Abdeckung gegen TODO.md Phase 4:**

| Requirement | Task |
|---|---|
| `expo-local-authentication` integrieren | Task 1 |
| PIN-Setup-Flow (4–6 Stellen, Bestätigung) | Task 6 |
| Lock-Screen bei App-Start | Task 5 |
| Auto-Lock nach Hintergrund-Zeit > 1 min | Task 5 (AppState) |
| Settings: PIN ändern | Task 7 |
| Settings: Biometrie an/aus | Task 7 |
| Settings: PIN deaktivieren | Task 7 |
| Tests: kein Klartext-PIN persistiert | Task 2 (`savePin` → kein `'1234'` in SecureStore) |
| Tests: 5 Fehlversuche → Wartezeit | Task 3 (`lockStore.test.ts`) |

**Alle Requirements abgedeckt. Kein Placeholder.**
