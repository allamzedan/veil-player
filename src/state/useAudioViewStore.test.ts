import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAudioViewStore } from './useAudioViewStore'

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

describe('useAudioViewStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
    useAudioViewStore.setState({
      audioViewMode: 'compact',
      preEditAudioViewMode: null
    })
  })

  it('expands and compacts workspace preference', () => {
    useAudioViewStore.getState().expandWorkspace()
    expect(useAudioViewStore.getState().audioViewMode).toBe('workspace')
    useAudioViewStore.getState().compactView()
    expect(useAudioViewStore.getState().audioViewMode).toBe('compact')
  })

  it('enters edit from compact and returns on done', () => {
    useAudioViewStore.getState().enterAudioEdit()
    expect(useAudioViewStore.getState().audioViewMode).toBe('workspace')
    expect(useAudioViewStore.getState().preEditAudioViewMode).toBe('compact')

    useAudioViewStore.getState().exitAudioEdit()
    expect(useAudioViewStore.getState().audioViewMode).toBe('compact')
    expect(useAudioViewStore.getState().preEditAudioViewMode).toBeNull()
  })

  it('stays in workspace after edit when already expanded', () => {
    useAudioViewStore.getState().expandWorkspace()
    useAudioViewStore.getState().enterAudioEdit()
    useAudioViewStore.getState().exitAudioEdit()
    expect(useAudioViewStore.getState().audioViewMode).toBe('workspace')
  })
})
