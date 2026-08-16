import { jest, describe, it, expect, beforeEach } from '@jest/globals'

const secureStore: Record<string, string> = {}

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(secureStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, val: string) => {
    secureStore[key] = val
    return Promise.resolve()
  }),
}))

import { isUse12HourFormat, setUse12HourFormat } from '../timeFormat'

beforeEach(() => {
  Object.keys(secureStore).forEach(k => delete secureStore[k])
  jest.clearAllMocks()
  const SecureStore = require('expo-secure-store') as {
    getItemAsync: jest.Mock<(key: string) => Promise<string | null>>
    setItemAsync: jest.Mock<(key: string, val: string) => Promise<void>>
  }
  SecureStore.getItemAsync.mockImplementation((key: string) =>
    Promise.resolve(secureStore[key] ?? null)
  )
  SecureStore.setItemAsync.mockImplementation((key: string, val: string) => {
    secureStore[key] = val
    return Promise.resolve()
  })
})

describe('timeFormat', () => {
  it('isUse12HourFormat defaults to false (24h)', async () => {
    expect(await isUse12HourFormat()).toBe(false)
  })

  it('setUse12HourFormat / isUse12HourFormat round-trip', async () => {
    await setUse12HourFormat(true)
    expect(await isUse12HourFormat()).toBe(true)
    await setUse12HourFormat(false)
    expect(await isUse12HourFormat()).toBe(false)
  })
})
