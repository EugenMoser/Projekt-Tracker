import { describe, expect, it } from '@jest/globals'

import { keyBetween, SORT_STEP } from '../utils/sortOrder'

describe('keyBetween', () => {
  it('returns the first step when the list is empty', () => {
    expect(keyBetween(null, null)).toBe(SORT_STEP)
  })

  it('places an item before the current first one', () => {
    expect(keyBetween(null, 1000)).toBe(0)
  })

  it('keeps going below zero when dragged to the front repeatedly', () => {
    expect(keyBetween(null, 0)).toBe(-1000)
    expect(keyBetween(null, -1000)).toBe(-2000)
  })

  it('places an item after the current last one', () => {
    expect(keyBetween(3000, null)).toBe(4000)
  })

  it('returns the midpoint between two neighbours', () => {
    expect(keyBetween(1000, 2000)).toBe(1500)
  })

  it('rounds the midpoint down and still lands strictly between', () => {
    const key = keyBetween(1000, 1003)
    expect(key).toBe(1001)
    expect(key!).toBeGreaterThan(1000)
    expect(key!).toBeLessThan(1003)
  })

  it('works with negative neighbours', () => {
    expect(keyBetween(-2000, -1000)).toBe(-1500)
  })

  it('returns null when no integer fits between the neighbours', () => {
    expect(keyBetween(1000, 1001)).toBeNull()
  })

  it('returns null when both neighbours have the same key', () => {
    expect(keyBetween(1000, 1000)).toBeNull()
  })

  it('returns null when the neighbours are inverted', () => {
    expect(keyBetween(2000, 1000)).toBeNull()
  })
})
