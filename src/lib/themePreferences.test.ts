import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_VERSION } from './appVersion'
import { SUPPORTED_TRACK_VERSION } from '../types/track'
import en from '../i18n/en'
import { THEME_PREFERENCE_KEY, readThemePreference, resolveTheme, writeThemePreference } from './themePreferences'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear() { values.clear() },
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
    key(index) { return Array.from(values.keys())[index] ?? null }
  }
}

describe('themePreferences', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
    const matchMedia = (query: string) => ({ matches: query.includes('dark'), media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false } })
    vi.stubGlobal('matchMedia', matchMedia)
    vi.stubGlobal('window', { matchMedia, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true } })
  })

  it('defaults to Dark when absent or invalid', () => {
    expect(readThemePreference()).toBe('dark')
    localStorage.setItem(THEME_PREFERENCE_KEY, 'classic')
    expect(readThemePreference()).toBe('dark')
  })

  it('persists explicit Light and Dark choices', () => {
    writeThemePreference('light')
    expect(readThemePreference()).toBe('light')
    writeThemePreference('dark')
    expect(readThemePreference()).toBe('dark')
  })

  it('resolves System against the operating-system color scheme', () => {
    expect(resolveTheme('system')).toBe('dark')
  })

  it('resolves System to Light when the operating system is light', () => {
    const lightMatchMedia = () => ({ matches: false })
    vi.stubGlobal('matchMedia', lightMatchMedia)
    vi.stubGlobal('window', { matchMedia: lightMatchMedia, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true } })
    expect(resolveTheme('system')).toBe('light')
  })

  it('explicit Light ignores a dark operating-system scheme', () => {
    expect(resolveTheme('light')).toBe('light')
  })

  it('explicit Dark ignores a light operating-system scheme', () => {
    const lightMatchMedia = () => ({ matches: false })
    vi.stubGlobal('matchMedia', lightMatchMedia)
    vi.stubGlobal('window', { matchMedia: lightMatchMedia, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true } })
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('keeps old legacy interface preferences safe and does not change app or schema versions', () => {
    localStorage.setItem('veil:uiRefreshV1', '0')
    expect(readThemePreference()).toBe('dark')
    expect(APP_VERSION).toBe('0.8.0-rc.2')
    expect(SUPPORTED_TRACK_VERSION).toBe('1.6.0')
  })
  it('persists an explicit System choice without changing it to Dark', () => {
    writeThemePreference('system')
    expect(readThemePreference()).toBe('system')
  })

  it('legacy preferences do not override an existing explicit theme', () => {
    localStorage.setItem('veil:uiRefreshV1', '0')
    for (const preference of ['light', 'dark', 'system'] as const) {
      writeThemePreference(preference)
      expect(readThemePreference()).toBe(preference)
    }
  })

  it('keeps the agreed Appearance wording', () => {
    expect(en['settings.themeDark']).toBe('Dark')
    expect(en['settings.themeDarkDescription']).toBe('Always use the dark VEIL interface.')
    expect(en['settings.themeLight']).toBe('Light')
    expect(en['settings.themeLightDescription']).toBe('Always use the light VEIL interface.')
    expect(en['settings.themeSystem']).toBe('System')
    expect(en['settings.themeSystemDescription']).toBe('Follow your operating system appearance.')
  })
})
