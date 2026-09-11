import { ipcMain } from 'electron'
import { ContentReviewPreferencesStore } from '../lib/contentReviewPreferencesStore'

export function registerContentReviewPreferencesHandlers(
  store: ContentReviewPreferencesStore
): void {
  ipcMain.handle('contentReviewPreferences:readCustomTerms', () => store.read())
  ipcMain.handle('contentReviewPreferences:writeCustomTerms', (_event, value: unknown) =>
    store.write(value))
}
