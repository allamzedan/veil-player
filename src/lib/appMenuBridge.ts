import type { RecentOpenTarget } from './recentHistory'

export interface AppMenuActions {
  openVideo?: () => void
  openYouTube?: () => void
  loadTrack?: () => void
  compareImportSidecar?: () => void
  saveTrack?: () => void
  saveAndCloseTrack?: () => void
  saveTrackAs?: () => void
  closeTrack?: () => void
  closeVideo?: () => void
  exitApp?: () => void
  undo?: () => void
  redo?: () => void
  deleteSelected?: () => void
  setStart?: () => void
  setEnd?: () => void
  togglePlayPause?: () => void
  seekBack10?: () => void
  seekForward10?: () => void
  quickReplay?: () => void
  speedDown?: () => void
  speedUp?: () => void
  toggleFullscreen?: () => void
  addMask?: () => void
  addMute?: () => void
  addSkip?: () => void
  addBookmark?: () => void
  importSrt?: () => void
  clearTrack?: () => void
  openManualTrackBuilder?: () => void
  openShortcutHelp?: () => void
  openAbout?: () => void
  openSettings?: () => void
  toggleStatusBar?: () => void
  toggleSidebar?: () => void
  toggleTimeline?: () => void
  setPlayerModeWatch?: () => void
  setPlayerModeEdit?: () => void
  togglePlayerMode?: () => void
  prevSubtitleCue?: () => void
  nextSubtitleCue?: () => void
  repeatSubtitleCue?: () => void
  toggleItemLocked?: () => void
  smartReplay?: () => void
  checkForUpdates?: () => void
  openTrackExport?: () => void
}

let menuActions: Partial<AppMenuActions> = {}
let openRecentTargetAction: ((target: RecentOpenTarget) => void) | undefined

export function registerAppMenuActions(
  patch: Partial<AppMenuActions> & { openRecentTarget?: (target: RecentOpenTarget) => void }
): void {
  const { openRecentTarget, ...rest } = patch
  menuActions = { ...menuActions, ...rest }
  if (openRecentTarget) {
    openRecentTargetAction = openRecentTarget
  }
}

export function clearAppMenuActions(keys: (keyof AppMenuActions)[]): void {
  const next = { ...menuActions }
  for (const key of keys) {
    delete next[key]
  }
  menuActions = next
}

export function getAppMenuActions(): Partial<AppMenuActions> {
  return menuActions
}

export function runAppMenuAction(
  key: keyof AppMenuActions,
  fallback?: () => void
): void {
  const action = menuActions[key]
  if (action) {
    action()
    return
  }
  fallback?.()
}

export function runOpenRecentTarget(target: RecentOpenTarget): void {
  openRecentTargetAction?.(target)
}
