import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AUDIO_VIEW_MODE,
  readAudioViewMode,
  writeAudioViewMode
} from './audioViewPreferences'

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

describe('audioViewPreferences', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
  })

  it('defaults to compact when unset', () => {
    expect(readAudioViewMode()).toBe(DEFAULT_AUDIO_VIEW_MODE)
    expect(DEFAULT_AUDIO_VIEW_MODE).toBe('compact')
  })

  it('persists audio view mode', () => {
    writeAudioViewMode('workspace')
    expect(readAudioViewMode()).toBe('workspace')
    writeAudioViewMode('compact')
    expect(readAudioViewMode()).toBe('compact')
  })
})
