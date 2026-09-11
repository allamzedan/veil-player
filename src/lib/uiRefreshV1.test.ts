import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readUiRefreshV1, UI_REFRESH_V1_KEY, writeUiRefreshV1 } from './uiRefreshV1'

function createStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    }
  }
}

describe('uiRefreshV1', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
  })

  it('defaults to true when the preference key is missing', () => {
    expect(localStorage.getItem(UI_REFRESH_V1_KEY)).toBeNull()
    expect(readUiRefreshV1()).toBe(true)
  })

  it('returns true when stored value is "1"', () => {
    localStorage.setItem(UI_REFRESH_V1_KEY, '1')
    expect(readUiRefreshV1()).toBe(true)
  })

  it('returns false when stored value is "0"', () => {
    localStorage.setItem(UI_REFRESH_V1_KEY, '0')
    expect(readUiRefreshV1()).toBe(true)
  })

  it('defaults to true for invalid stored values', () => {
    localStorage.setItem(UI_REFRESH_V1_KEY, 'true')
    expect(readUiRefreshV1()).toBe(true)
    localStorage.setItem(UI_REFRESH_V1_KEY, 'yes')
    expect(readUiRefreshV1()).toBe(true)
  })

  it('defaults to true when localStorage read fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage unavailable')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0
    })
    expect(readUiRefreshV1()).toBe(true)
  })

  it('writes "1" when enabling and "0" when disabling', () => {
    writeUiRefreshV1(true)
    expect(localStorage.getItem(UI_REFRESH_V1_KEY)).toBe('1')
    expect(readUiRefreshV1()).toBe(true)
    writeUiRefreshV1(false)
    expect(localStorage.getItem(UI_REFRESH_V1_KEY)).toBe('0')
    expect(readUiRefreshV1()).toBe(true)
  })
})
