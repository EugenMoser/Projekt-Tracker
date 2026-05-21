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
