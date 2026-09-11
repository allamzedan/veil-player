import ar from './ar'
import de from './de'
import en from './en'
import es from './es'
import fr from './fr'
import ja from './ja'
import tr from './tr'
import zh from './zh'
import type { TranslationKey } from './en'

export type { TranslationKey }

export type LanguageCode = 'en' | 'ar' | 'es' | 'fr' | 'de' | 'tr' | 'zh' | 'ja'

export interface SupportedLanguage {
  code: LanguageCode
  label: string
  nativeLabel: string
}

export const LANGUAGE_STORAGE_KEY = 'veil:language'

export const supportedLanguages: SupportedLanguage[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'zh', label: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' }
]

function mergeWithEnglish(overrides: Record<string, string>): Record<string, string> {
  return { ...en, ...overrides }
}

const dictionaries: Record<LanguageCode, Record<string, string>> = {
  en,
  ar: mergeWithEnglish(ar),
  es: mergeWithEnglish(es),
  fr: mergeWithEnglish(fr),
  de: mergeWithEnglish(de),
  tr: mergeWithEnglish(tr),
  zh: mergeWithEnglish(zh),
  ja: mergeWithEnglish(ja)
}

const warnedMissing = new Set<string>()

const LANGUAGE_CODES = new Set<LanguageCode>(supportedLanguages.map((entry) => entry.code))

const listeners = new Set<() => void>()

function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGE_CODES.has(value as LanguageCode)
}

function readStoredLanguage(): LanguageCode {
  if (typeof localStorage === 'undefined') {
    return 'en'
  }

  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored && isLanguageCode(stored)) {
      return stored
    }
  } catch {
    // Storage can be unavailable or corrupt during first-run startup.
  }

  return 'en'
}

let currentLanguage: LanguageCode = readStoredLanguage()

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function applyDocumentLanguage(language: LanguageCode): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

export function getLanguage(): LanguageCode {
  return currentLanguage
}

export function setLanguage(language: LanguageCode): void {
  if (!isLanguageCode(language)) {
    return
  }

  currentLanguage = language
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Keep the validated in-memory preference when persistence is unavailable.
    }
  }
  applyDocumentLanguage(language)
  notifyListeners()
}

export function subscribeLanguageChanges(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function initI18n(): void {
  currentLanguage = readStoredLanguage()
  applyDocumentLanguage(currentLanguage)
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template
  }

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

export function t(key: TranslationKey | string, params?: Record<string, string | number>): string {
  const language = getLanguage()
  const fallback = dictionaries.en[key]
  const primary = language === 'en' ? fallback : dictionaries[language]?.[key]

  if (import.meta.env.DEV && language !== 'en' && primary === undefined && fallback !== undefined) {
    const warnKey = `${language}:${key}`
    if (!warnedMissing.has(warnKey)) {
      warnedMissing.add(warnKey)
      console.warn(`[i18n] Missing translation for ${language}: ${key}`)
    }
  }

  const template = primary ?? fallback
  if (!template) {
    if (import.meta.env.DEV) {
      const warnKey = `missing:${key}`
      if (!warnedMissing.has(warnKey)) {
        warnedMissing.add(warnKey)
        console.warn(`[i18n] Unknown translation key: ${key}`)
      }
    }
    return fallback ?? ''
  }

  return interpolate(template, params)
}

if (typeof document !== 'undefined') {
  initI18n()
}
