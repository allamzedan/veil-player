export type SeekDebugSource =
  | 'seekbar'
  | 'timeline'
  | 'manualSeek'
  | 'skip'
  | 'loop'
  | 'replay'
  | 'loadmetadata'
  | 'openVideo'
  | 'reset'
  | 'other'

export interface SeekDebugState {
  videoCurrentTime: number | null
  displayTime: number | null
  duration: number | null
  paused: boolean | null
  readyState: number | null
  networkState: number | null
  errorCode: number | null
  errorMessage: string | null
  srcKind: 'file' | 'blob' | 'veil-media' | 'other' | null
  seekableLength: number | null
  seekableRanges: Array<{ start: number; end: number }>
  targetWithinSeekableRange: boolean | null
  requestedSeekTarget: number | null
  pendingSeekTarget: number | null
  seekAttemptAt: string | null
  lastSeekedEventResult: string | null
  lastManualSeekTarget: number | null
  lastSeekSource: string | null
  lastSeekAt: string | null
  lastSeekedEventTime: number | null
  skipLatchState: string
  loopState: string
  lastCurrentTimeSetter: string | null
  events: string[]
}

export interface MatchingDebugState {
  videoFilePath: string | null
  videoMetadataLoaded: boolean
  candidatePaths: string[]
  candidateExists: boolean[]
  matchingCheckTriggeredAt: string | null
  matchingCheckReason: string | null
  matchingDialogOpen: boolean
  matchingError: string | null
}

const seekState: SeekDebugState = {
  videoCurrentTime: null,
  displayTime: null,
  duration: null,
  paused: null,
  readyState: null,
  networkState: null,
  errorCode: null,
  errorMessage: null,
  srcKind: null,
  seekableLength: null,
  seekableRanges: [],
  targetWithinSeekableRange: null,
  requestedSeekTarget: null,
  pendingSeekTarget: null,
  seekAttemptAt: null,
  lastSeekedEventResult: null,
  lastManualSeekTarget: null,
  lastSeekSource: null,
  lastSeekAt: null,
  lastSeekedEventTime: null,
  skipLatchState: 'unknown',
  loopState: 'unknown',
  lastCurrentTimeSetter: null,
  events: []
}

const matchingState: MatchingDebugState = {
  videoFilePath: null,
  videoMetadataLoaded: false,
  candidatePaths: [],
  candidateExists: [],
  matchingCheckTriggeredAt: null,
  matchingCheckReason: null,
  matchingDialogOpen: false,
  matchingError: null
}

let version = 0
const listeners = new Set<() => void>()

function nowLabel(): string {
  return new Date().toISOString()
}

function enabled(key: string): boolean {
  if (!import.meta.env.DEV) {
    return false
  }

  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function emit(): void {
  version += 1
  for (const listener of listeners) {
    listener()
  }
}

function pushSeekEvent(message: string): void {
  seekState.events = [`${nowLabel()} ${message}`, ...seekState.events].slice(0, 12)
}

export function isSeekDebugEnabled(): boolean {
  return enabled('veil:debugSeek')
}

export function isMatchingDebugEnabled(): boolean {
  return enabled('veil:debugMatching')
}

export function isAnyDebugEnabled(): boolean {
  return isSeekDebugEnabled() || isMatchingDebugEnabled()
}

export function clearDebugFlags(): void {
  try {
    window.localStorage.removeItem('veil:debugSeek')
    window.localStorage.removeItem('veil:debugMatching')
  } catch {
    // ignore
  }
}

let cachedSnapshotVersion = -1
let cachedSnapshot: {
  version: number
  seek: SeekDebugState
  matching: MatchingDebugState
} | null = null

export function subscribeDebugState(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getDebugSnapshot(): {
  version: number
  seek: SeekDebugState
  matching: MatchingDebugState
} {
  if (cachedSnapshot && cachedSnapshotVersion === version) {
    return cachedSnapshot
  }

  cachedSnapshotVersion = version
  cachedSnapshot = {
    version,
    seek: {
      ...seekState,
      seekableRanges: seekState.seekableRanges.map((range) => ({ ...range })),
      events: [...seekState.events]
    },
    matching: {
      ...matchingState,
      candidatePaths: [...matchingState.candidatePaths],
      candidateExists: [...matchingState.candidateExists]
    }
  }
  return cachedSnapshot
}

export function updateSeekDebug(patch: Partial<SeekDebugState>): void {
  Object.assign(seekState, patch)
  emit()
}

export function markSeekDebugEvent(message: string): void {
  pushSeekEvent(message)
  emit()
}

export function setCurrentTimeDebug(
  video: HTMLVideoElement,
  source: SeekDebugSource,
  value: number
): void {
  video.currentTime = value
  seekState.lastCurrentTimeSetter = `${source}: ${value.toFixed(3)}`
  seekState.videoCurrentTime = Number.isFinite(video.currentTime) ? video.currentTime : null
  pushSeekEvent(`set currentTime source=${source} value=${value.toFixed(3)} actual=${seekState.videoCurrentTime ?? 'n/a'}`)
  emit()
}

export function recordManualSeekDebug(source: SeekDebugSource, value: number): void {
  seekState.lastManualSeekTarget = value
  seekState.lastSeekSource = source
  seekState.lastSeekAt = nowLabel()
  pushSeekEvent(`manual seek source=${source} target=${value.toFixed(3)}`)
  emit()
}

export function updateMatchingDebug(patch: Partial<MatchingDebugState>): void {
  Object.assign(matchingState, patch)
  emit()
}
