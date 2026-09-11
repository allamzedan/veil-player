import { runAppMenuAction } from './appMenuBridge'

export type SettingsSection =
  | 'general'
  | 'playback'
  | 'subtitles'
  | 'contentReview'
  | 'appearance'
  | 'shortcuts'
  | 'about'

export const SETTINGS_SECTION_EVENT = 'veil:settings-section'

export function requestSettingsSection(section: SettingsSection): void {
  window.dispatchEvent(new CustomEvent<SettingsSection>(SETTINGS_SECTION_EVENT, { detail: section }))
  runAppMenuAction('openSettings')
}
