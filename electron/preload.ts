import { contextBridge, ipcRenderer } from 'electron'
import type { YouTubeMetadataLookupResult } from '../src/types/youtubeMetadata'
import type { NativeConfirmOptions } from '../src/types/nativeDialog'
import type {
  PersistedRecentHistory,
  PersistedRecentVeil,
  PersistedRecentVideo
} from './lib/recentHistoryStore'
import type { SessionRecoverySnapshot } from './lib/sessionRecoveryStore'

export interface TrackJsonSaveOptions {
  saveAs?: boolean
  filePath?: string | null
}

export interface TrackJsonIpcResult {
  ok: boolean
  canceled: boolean
  error?: string
  json?: string | null
  filePath?: string | null
}

export type StartupAction =
  | 'openVideo'
  | 'loadVeil'
  | 'openYouTube'
  | 'settings'
  | { type: 'openVideoPath'; filePath: string }
  | { type: 'loadVeilPath'; filePath: string; openEditModeAfterLoad?: boolean }
  | { type: 'openYouTubeUrl'; url: string }
  | { type: 'recentFileMissing'; kind: 'video' | 'veil'; filePath: string }

interface RecentHistoryApi {
  readRecentHistory: () => Promise<PersistedRecentHistory>
  clearRecentHistory: () => Promise<PersistedRecentHistory>
  onRecentHistoryChanged: (callback: (history: PersistedRecentHistory) => void) => () => void
}

export interface VeilApi extends RecentHistoryApi {
  openVideoDialog: () => Promise<{
    canceled: boolean
    mediaUrl: string | null
    name: string | null
    size: number | null
    filePath?: string | null
  }>
  openVideoPath: (filePath: string) => Promise<{
    canceled: boolean
    mediaUrl: string | null
    name: string | null
    size: number | null
    filePath: string | null
  }>
  releasePrivilegedMedia: (mediaId: string) => Promise<{ ok: boolean }>
  saveTrackJson: (trackJson: string, options?: TrackJsonSaveOptions) => Promise<TrackJsonIpcResult>
  exportBookmarkCsv: (csv: string, defaultFileName: string) => Promise<TrackJsonIpcResult>
  loadTrackJson: () => Promise<TrackJsonIpcResult>
  loadTrackJsonFromPath: (filePath: string) => Promise<TrackJsonIpcResult>
  openExternalUrl: (url: string) => Promise<{ ok: boolean; error?: string }>
  getYouTubeMetadata: (videoId: string) => Promise<YouTubeMetadataLookupResult>
  findMatchingVeils: (videoPath: string) => Promise<string[]>
  debugMatchingVeil: (videoPath: string) => Promise<{
    candidates: string[]
    exists: boolean[]
    error: string | null
  }>
  openDevTools: () => Promise<{ ok: boolean }>
  onStartupAction: (callback: (action: StartupAction) => void) => () => void
  onCloseRequested: (callback: () => void) => () => void
  confirmDialog: (options: NativeConfirmOptions) => boolean
  confirmClose: () => Promise<void>
  minimize: () => Promise<void>
  toggleMaximize: () => Promise<{ maximized: boolean }>
  isMaximized: () => Promise<boolean>
  requestClose: () => Promise<void>
  onMaximizedChanged: (callback: (maximized: boolean) => void) => () => void
  applyLayoutPreset: (
    preset: 'audio-watch' | 'video-default'
  ) => Promise<{ ok: boolean; applied?: boolean; preset?: string; error?: string }>
  recordRecentVideo: (entry: PersistedRecentVideo) => Promise<PersistedRecentHistory>
  recordRecentVeil: (entry: PersistedRecentVeil) => Promise<PersistedRecentHistory>
  relocateRecentVideo: (
    previousFilePath: string,
    entry: PersistedRecentVideo
  ) => Promise<PersistedRecentHistory>
  relocateRecentVeil: (
    previousFilePath: string,
    entry: PersistedRecentVeil
  ) => Promise<PersistedRecentHistory>
  removeRecentVideo: (identity: string) => Promise<PersistedRecentHistory>
  removeRecentVeil: (filePath: string) => Promise<PersistedRecentHistory>
  updateRecentVideoDuration: (name: string, durationSeconds: number) => Promise<PersistedRecentHistory>
  updateRecentYouTubeTitle: (videoId: string, title: string) => Promise<PersistedRecentHistory>
  recentPathExists: (filePath: string) => Promise<boolean>
  readSessionRecovery: () => Promise<SessionRecoverySnapshot | null>
  writeSessionRecovery: (snapshot: SessionRecoverySnapshot) => Promise<boolean>
  clearSessionRecovery: () => Promise<boolean>
  readContentReviewCustomTerms: () => Promise<string[]>
  writeContentReviewCustomTerms: (customTerms: string[]) => Promise<string[]>
}

export interface VeilLauncherApi extends RecentHistoryApi {
  openVideo: () => Promise<void>
  loadVeil: () => Promise<void>
  openYouTube: () => Promise<void>
  openHome: () => Promise<void>
  openSettings: () => Promise<void>
  openReleaseNotes: () => Promise<void>
  openRecentVideo: (filePath: string) => Promise<void>
  openRecentVeil: (filePath: string) => Promise<void>
  openRecentYouTube: (url: string) => Promise<void>
  minimize: () => Promise<void>
}

const startupListeners = new Set<(action: StartupAction) => void>()
let queuedStartupAction: StartupAction | null = null

ipcRenderer.on('startup:action', (_event, action: StartupAction) => {
  queuedStartupAction = action
  for (const listener of startupListeners) listener(action)
})

function onRecentHistoryChanged(
  callback: (history: PersistedRecentHistory) => void
): () => void {
  const listener = (_event: unknown, history: PersistedRecentHistory): void => callback(history)
  ipcRenderer.on('recentHistory:changed', listener)
  return () => ipcRenderer.removeListener('recentHistory:changed', listener)
}

const veilApi: VeilApi = {
  openVideoDialog: () => ipcRenderer.invoke('dialog:openVideo'),
  openVideoPath: (filePath) => ipcRenderer.invoke('dialog:openVideoPath', filePath),
  releasePrivilegedMedia: (mediaId) => ipcRenderer.invoke('media:release', mediaId),
  saveTrackJson: (trackJson, options) => ipcRenderer.invoke('track:saveJson', trackJson, options),
  exportBookmarkCsv: (csv, defaultFileName) => ipcRenderer.invoke('bookmark:exportCsv', csv, defaultFileName),
  loadTrackJson: () => ipcRenderer.invoke('track:loadJson'),
  loadTrackJsonFromPath: (filePath) => ipcRenderer.invoke('track:loadJsonFromPath', filePath),
  openExternalUrl: (url) => ipcRenderer.invoke('shell:openExternal', url),
  getYouTubeMetadata: (videoId) => ipcRenderer.invoke('youtube:getMetadata', videoId),
  findMatchingVeils: (videoPath) => ipcRenderer.invoke('veil:findMatchingVeils', videoPath),
  debugMatchingVeil: (videoPath) => ipcRenderer.invoke('veil:debugMatchingVeil', videoPath),
  openDevTools: () => ipcRenderer.invoke('app:openDevTools'),
  onStartupAction: (callback) => {
    startupListeners.add(callback)
    if (queuedStartupAction) {
      const action = queuedStartupAction
      queuedStartupAction = null
      callback(action)
    }
    return () => {
      startupListeners.delete(callback)
    }
  },
  onCloseRequested: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('app:close-requested', listener)
    return () => ipcRenderer.removeListener('app:close-requested', listener)
  },
  confirmDialog: (options) => ipcRenderer.sendSync('dialog:confirm', options) === true,
  confirmClose: () => ipcRenderer.invoke('app:confirm-close'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  requestClose: () => ipcRenderer.invoke('window:requestClose'),
  applyLayoutPreset: (preset) => ipcRenderer.invoke('window:applyLayoutPreset', preset),
  onMaximizedChanged: (callback) => {
    const listener = (_event: unknown, maximized: boolean): void => callback(maximized)
    ipcRenderer.on('window:maximized-changed', listener)
    return () => ipcRenderer.removeListener('window:maximized-changed', listener)
  },
  recordRecentVideo: (entry) => ipcRenderer.invoke('recentHistory:recordVideo', entry),
  recordRecentVeil: (entry) => ipcRenderer.invoke('recentHistory:recordVeil', entry),
  relocateRecentVideo: (previousFilePath, entry) =>
    ipcRenderer.invoke('recentHistory:relocateVideo', previousFilePath, entry),
  relocateRecentVeil: (previousFilePath, entry) =>
    ipcRenderer.invoke('recentHistory:relocateVeil', previousFilePath, entry),
  removeRecentVideo: (identity) => ipcRenderer.invoke('recentHistory:removeVideo', identity),
  removeRecentVeil: (filePath) => ipcRenderer.invoke('recentHistory:removeVeil', filePath),
  updateRecentVideoDuration: (name, durationSeconds) =>
    ipcRenderer.invoke('recentHistory:updateVideoDuration', name, durationSeconds),
  updateRecentYouTubeTitle: (videoId, title) =>
    ipcRenderer.invoke('recentHistory:updateYouTubeTitle', videoId, title),
  readRecentHistory: () => ipcRenderer.invoke('recentHistory:read'),
  clearRecentHistory: () => ipcRenderer.invoke('recentHistory:clear'),
  recentPathExists: (filePath) => ipcRenderer.invoke('recentHistory:pathExists', filePath),
  onRecentHistoryChanged,
  readSessionRecovery: () => ipcRenderer.invoke('sessionRecovery:read'),
  writeSessionRecovery: (snapshot) => ipcRenderer.invoke('sessionRecovery:write', snapshot),
  clearSessionRecovery: () => ipcRenderer.invoke('sessionRecovery:clear'),
  readContentReviewCustomTerms: () => ipcRenderer.invoke('contentReviewPreferences:readCustomTerms'),
  writeContentReviewCustomTerms: (customTerms) => ipcRenderer.invoke('contentReviewPreferences:writeCustomTerms', customTerms),
}

const veilLauncherApi: VeilLauncherApi = {
  openVideo: () => ipcRenderer.invoke('launcher:openVideo'),
  loadVeil: () => ipcRenderer.invoke('launcher:loadVeil'),
  openYouTube: () => ipcRenderer.invoke('launcher:openYouTube'),
  openHome: () => ipcRenderer.invoke('launcher:openHome'),
  openSettings: () => ipcRenderer.invoke('launcher:openSettings'),
  openReleaseNotes: () => ipcRenderer.invoke('launcher:openReleaseNotes'),
  openRecentVideo: (filePath) => ipcRenderer.invoke('launcher:openVideoPath', filePath),
  openRecentVeil: (filePath) => ipcRenderer.invoke('launcher:loadVeilPath', filePath),
  openRecentYouTube: (url) => ipcRenderer.invoke('launcher:openYouTubeUrl', url),
  readRecentHistory: () => ipcRenderer.invoke('recentHistory:read'),
  clearRecentHistory: () => ipcRenderer.invoke('recentHistory:clear'),
  onRecentHistoryChanged,
  minimize: () => ipcRenderer.invoke('launcher:minimize')
}

contextBridge.exposeInMainWorld('veil', veilApi)
contextBridge.exposeInMainWorld('veilLauncher', veilLauncherApi)
