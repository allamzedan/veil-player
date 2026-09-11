import { useSyncExternalStore } from 'react'
import { getLanguage, subscribeLanguageChanges } from '../i18n'

export function useLanguage() {
  return useSyncExternalStore(subscribeLanguageChanges, getLanguage, () => 'en')
}
