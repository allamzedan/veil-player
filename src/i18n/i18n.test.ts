import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyDocumentLanguage,
  getLanguage,
  initI18n,
  LANGUAGE_STORAGE_KEY,
  setLanguage,
  supportedLanguages,
  t,
  type LanguageCode
} from './index'
import ar from './ar'
import de from './de'
import en from './en'
import es from './es'
import fr from './fr'
import ja from './ja'
import tr from './tr'
import zh from './zh'

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
  const locales = { ar, de, es, fr, ja, tr, zh }

  it('keeps every supported locale complete and non-empty', () => {
    const sourceKeys = Object.keys(en).sort()
    for (const [code, dictionary] of Object.entries(locales)) {
      expect(Object.keys(dictionary).sort(), code).toEqual(sourceKeys)
      expect(Object.entries(dictionary).filter(([, value]) => typeof value !== 'string' || value.trim() === ''), code).toEqual([])
    }
  })

  it('preserves interpolation placeholder names in every locale', () => {
    for (const [code, dictionary] of Object.entries(locales)) {
      const placeholderMismatches = Object.keys(en).filter((key) => {
        const sourceTokens = Array.from(en[key as keyof typeof en].matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g), (match) => match[1]).sort()
        const translatedTokens = Array.from((dictionary[key] ?? '').matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g), (match) => match[1]).sort()
        return sourceTokens.join(',') !== translatedTokens.join(',')
      })
      expect(placeholderMismatches, code).toEqual([])
    }
  })

  it('keeps language metadata aligned with locale files', () => {
    expect(new Set(supportedLanguages.map(({ code }) => code))).toEqual(new Set(['en', ...Object.keys(locales)]))
    expect(supportedLanguages.every(({ label, nativeLabel }) => label.trim() !== '' && nativeLabel.trim() !== '')).toBe(true)
  })

  it('does not leave English sentences in translated locales', () => {
    const intentionallyFixed = new Set([
      'provider.youtube',
      'subtitles.regionCover',
      'launcher.version',
      'launcher.actionsCount',
      'timeline.barTitle',
      'youtube.sourceDisclosure',
      'youtube.sourceDisclosureLocal'
    ])
    for (const [code, dictionary] of Object.entries(locales)) {
      const copied = Object.keys(en).filter((key) =>
        !intentionallyFixed.has(key) &&
        dictionary[key] === en[key as keyof typeof en] &&
        en[key as keyof typeof en].length >= 12 &&
        /\s/.test(en[key as keyof typeof en])
      )
      expect(copied, code).toEqual([])
    }
  })

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

  it('falls back safely when the stored locale is invalid', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'not-a-locale')
    initI18n()
    expect(getLanguage()).toBe('en')
    setLanguage('not-a-locale' as LanguageCode)
    expect(getLanguage()).toBe('en')
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
