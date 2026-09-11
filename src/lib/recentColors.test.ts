import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addRecentMaskColor,
  getDefaultMaskColor,
  getRecentMaskColors,
  normalizeMaskColor
} from './recentColors'

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    }
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('normalizeMaskColor', () => {
  it('normalizes 6-digit hex to lowercase', () => {
    expect(normalizeMaskColor('#FF00AA')).toBe('#ff00aa')
  })

  it('expands 3-digit hex', () => {
    expect(normalizeMaskColor('#f0a')).toBe('#ff00aa')
  })
})

describe('recent mask colors', () => {
  it('returns fallback when empty', () => {
    expect(getDefaultMaskColor()).toBe('#000000')
    expect(getRecentMaskColors()).toEqual([])
  })

  it('stores most recent first without duplicates', () => {
    addRecentMaskColor('#111111')
    addRecentMaskColor('#222222')
    addRecentMaskColor('#111111')

    expect(getRecentMaskColors()).toEqual(['#111111', '#222222'])
    expect(getDefaultMaskColor()).toBe('#111111')
  })

  it('caps at six colors', () => {
    for (let index = 1; index <= 8; index += 1) {
      const channel = index.toString(16).padStart(2, '0')
      addRecentMaskColor(`#${channel}${channel}${channel}`)
    }

    expect(getRecentMaskColors()).toHaveLength(6)
    expect(getRecentMaskColors()[0]).toBe('#080808')
  })
})
