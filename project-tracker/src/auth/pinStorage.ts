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

// expo-crypto only exposes SHA-256; PBKDF2/Argon2 unavailable in Expo SDK — offline brute-force risk if device is compromised
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
