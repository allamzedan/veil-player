/**
 * Reduced one-row menu configuration for Audio Watch Mode.
 * Video / edit-mode menus are unchanged and built elsewhere.
 */

export const AUDIO_WATCH_MENU_SECTION_IDS = [
  'file',
  'playback',
  'track',
  'view',
  'help'
] as const

export type AudioWatchMenuSectionId = (typeof AUDIO_WATCH_MENU_SECTION_IDS)[number]

/** Items intentionally omitted from Audio Watch menus. */
export const AUDIO_WATCH_HIDDEN_ITEM_IDS = [
  'addMask',
  'fullscreen',
  'revealMasks',
  'exportTrack',
  'manualTrackBuilder',
  'clearTrack',
  'groups',
  'anchors',
  'offsetShift',
  'importSrt',
  'smartReplay',
  'fixedReplay',
  'watchMode',
  'editMode',
  'toggleSidebar',
  'toggleTimeline',
  'checkForUpdates'
] as const

export function isAudioWatchMenuSectionId(id: string): boolean {
  return (AUDIO_WATCH_MENU_SECTION_IDS as readonly string[]).includes(id)
}

export function isAudioWatchHiddenItemId(id: string): boolean {
  return (AUDIO_WATCH_HIDDEN_ITEM_IDS as readonly string[]).includes(id)
}

export function filterAudioWatchMenuItemIds(itemIds: string[]): string[] {
  return itemIds.filter((id) => !isAudioWatchHiddenItemId(id))
}

/** Expected top-level menus for Audio Watch (no Edit menu). */
export function getAudioWatchMenuSectionIds(): readonly AudioWatchMenuSectionId[] {
  return AUDIO_WATCH_MENU_SECTION_IDS
}

export function audioWatchTitleBarHidesEditAndClose(): boolean {
  return true
}

export function audioWatchTitleBarHidesFilename(): boolean {
  return true
}
