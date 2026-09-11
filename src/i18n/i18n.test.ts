import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyDocumentLanguage,
  getLanguage,
  initI18n,
  LANGUAGE_STORAGE_KEY,
  setLanguage,
  t
} from './index'

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

describe('i18n', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
    vi.stubGlobal('document', {
      documentElement: {
        lang: 'en',
        dir: 'ltr'
      }
    })
    initI18n()
    applyDocumentLanguage('en')
  })

  it('defaults to English', () => {
    expect(getLanguage()).toBe('en')
    expect(t('menu.file')).toBe('File')
  })

  it('persists language selection', () => {
    setLanguage('es')
    expect(getLanguage()).toBe('es')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es')
    initI18n()
    expect(getLanguage()).toBe('es')
  })

  it('falls back to English for missing keys', () => {
    setLanguage('es')
    expect(t('menu.file')).toBe('Archivo')
    expect(t('nonexistent.key' as 'menu.file')).toBe('')
  })

  it('applies RTL for Arabic', () => {
    setLanguage('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
    setLanguage('en')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('interpolates parameters', () => {
    expect(t('toast.importedItems', { count: 3 })).toBe('Imported 3 items.')
    expect(t('toast.subtitleLoaded')).toBe('Subtitle loaded.')
    setLanguage('fr')
    expect(t('toast.importedItems', { count: 2 })).toContain('2')
  })
})
