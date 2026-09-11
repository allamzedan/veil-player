import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_PREFERENCE_KEY = 'veil:theme'
export const THEME_PREFERENCE_EVENT = 'veil:theme-preference'

const listeners = new Set<() => void>()
let systemMediaQuery: MediaQueryList | null = null
let mediaQueryBound = false

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_PREFERENCE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Use the safe default when storage is unavailable.
  }
  return 'dark'
}

export function resolveTheme(preference: ThemePreference = readThemePreference()): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference
  return systemPrefersDark() ? 'dark' : 'light'
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function applyTheme(preference: ThemePreference = readThemePreference()): ResolvedTheme {
  const resolved = resolveTheme(preference)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }
  notify()
  return resolved
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_PREFERENCE_KEY, preference)
  } catch {
    // Keep the in-memory/document theme usable when persistence is unavailable.
  }
  applyTheme(preference)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(THEME_PREFERENCE_EVENT))
}

export function subscribeThemePreferences(onChange: () => void): () => void {
  listeners.add(onChange)
  const handler = (): void => {
    applyTheme()
    onChange()
  }
  window.addEventListener(THEME_PREFERENCE_EVENT, handler)
  window.addEventListener('storage', handler)
  if (!mediaQueryBound && typeof window.matchMedia === 'function') {
    systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemMediaQuery.addEventListener?.('change', handler)
    mediaQueryBound = true
  }
  return () => {
    listeners.delete(onChange)
    window.removeEventListener(THEME_PREFERENCE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function initTheme(): void {
  applyTheme()
  if (!mediaQueryBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => { applyTheme() }
    systemMediaQuery.addEventListener?.('change', handler)
    mediaQueryBound = true
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeThemePreferences, readThemePreference, () => 'system')
}
