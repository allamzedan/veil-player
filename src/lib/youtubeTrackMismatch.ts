import type { MediaSource, YouTubeMediaSource } from '../types/mediaSource'
import { isYouTubeMediaSource, youtubeSourcesMatch } from '../types/mediaSource'
import type { VeilTrack } from '../types/track'
import type { VeilTrackStorePayload } from './trackSerialization'

export type PendingYouTubeMismatchPhase =
  | 'awaiting-decision'
  | 'opening-target'
  | 'awaiting-ready'
  | 'target-error'

export interface PendingYouTubeMismatchError {
  code?: number | string
  message: string
}

/** Pending YouTube VEIL held until Cancel/Close or successful exact-target Ready. */
export interface PendingYouTubeMismatch {
  track: VeilTrack
  payload: VeilTrackStorePayload
  trackVideoId: string
  currentVideoId: string
  /** Path adopted only after successful exact-target Ready. */
  trackFilePath: string | null
  phase: PendingYouTubeMismatchPhase
  /** Monotonic request generation — stale Ready/error for older IDs are ignored. */
  requestId: number
  /**
   * YouTube player load generation captured when this request opened/retried the target.
   * Lifecycle-only; must match store `youtubeLoadGeneration` for Ready/Error/timeout.
   */
  loadGeneration: number
  error?: PendingYouTubeMismatchError
}

export type YouTubeTrackLoadDecision =
  | { action: 'apply' }
  | { action: 'mismatch'; trackVideoId: string; currentVideoId: string }

/** Decide whether an incoming YouTube VEIL may apply immediately or needs a mismatch dialog. */
export function decideYouTubeTrackLoad(
  currentMediaSource: MediaSource | null | undefined,
  incoming: Pick<YouTubeMediaSource, 'provider' | 'videoId'>
): YouTubeTrackLoadDecision {
  if (
    currentMediaSource &&
    isYouTubeMediaSource(currentMediaSource) &&
    !youtubeSourcesMatch(currentMediaSource, incoming)
  ) {
    return {
      action: 'mismatch',
      trackVideoId: incoming.videoId,
      currentVideoId: currentMediaSource.videoId
    }
  }
  return { action: 'apply' }
}

export function createPendingYouTubeMismatch(input: {
  track: VeilTrack
  payload: VeilTrackStorePayload
  trackVideoId: string
  currentVideoId: string
  trackFilePath?: string | null
}): PendingYouTubeMismatch {
  return {
    track: input.track,
    payload: input.payload,
    trackVideoId: input.trackVideoId,
    currentVideoId: input.currentVideoId,
    trackFilePath: input.trackFilePath ?? null,
    phase: 'awaiting-decision',
    requestId: 0,
    loadGeneration: 0
  }
}

/** Whether Open Matching / Retry may start a new target-open request. */
export function canBeginOpenMatchingTarget(
  pending: PendingYouTubeMismatch | null
): pending is PendingYouTubeMismatch {
  if (!pending) {
    return false
  }
  return pending.phase === 'awaiting-decision' || pending.phase === 'target-error'
}

/** Start / retry opening exact target B — does not apply payload or path. */
export function beginOpenMatchingTarget(
  pending: PendingYouTubeMismatch,
  requestId: number,
  loadGeneration: number
): PendingYouTubeMismatch {
  return {
    ...pending,
    phase: 'opening-target',
    requestId,
    loadGeneration,
    error: undefined
  }
}

export function markAwaitingYouTubeReady(
  pending: PendingYouTubeMismatch,
  requestId: number
): PendingYouTubeMismatch | null {
  if (pending.requestId !== requestId) {
    return null
  }
  if (pending.phase !== 'opening-target' && pending.phase !== 'awaiting-ready') {
    return null
  }
  return {
    ...pending,
    phase: 'awaiting-ready',
    requestId,
    error: undefined
  }
}

export function isStaleMismatchRequest(
  pending: PendingYouTubeMismatch | null,
  requestId: number,
  loadGeneration?: number
): boolean {
  if (!pending || pending.requestId !== requestId) {
    return true
  }
  if (typeof loadGeneration === 'number' && pending.loadGeneration !== loadGeneration) {
    return true
  }
  return false
}

/**
 * Exact-target Ready gate: identity must match pending trackVideoId, requestId, and load generation.
 * Does not mutate pending — caller applies payload only when this returns true.
 */
export function canApplyPendingOnYouTubeReady(
  pending: PendingYouTubeMismatch | null,
  activeSource: MediaSource | null | undefined,
  readyVideoId: string,
  requestId: number,
  loadGeneration?: number
): boolean {
  if (!pending || pending.requestId !== requestId) {
    return false
  }
  if (typeof loadGeneration === 'number' && pending.loadGeneration !== loadGeneration) {
    return false
  }
  if (pending.phase !== 'awaiting-ready' && pending.phase !== 'opening-target') {
    return false
  }
  if (readyVideoId !== pending.trackVideoId) {
    return false
  }
  if (!activeSource || !isYouTubeMediaSource(activeSource)) {
    return false
  }
  if (activeSource.provider !== 'youtube' || activeSource.videoId !== pending.trackVideoId) {
    return false
  }
  return true
}

export function transitionToTargetError(
  pending: PendingYouTubeMismatch,
  requestId: number,
  error: PendingYouTubeMismatchError,
  loadGeneration?: number
): PendingYouTubeMismatch | null {
  if (pending.requestId !== requestId) {
    return null
  }
  if (typeof loadGeneration === 'number' && pending.loadGeneration !== loadGeneration) {
    return null
  }
  if (
    pending.phase !== 'opening-target' &&
    pending.phase !== 'awaiting-ready' &&
    pending.phase !== 'target-error'
  ) {
    return null
  }
  return {
    ...pending,
    phase: 'target-error',
    error
  }
}

/**
 * If the active source no longer matches the continuation target while a load is
 * in flight (or in error), the pending import is superseded and should clear.
 */
export function isPendingYouTubeMismatchSuperseded(
  pending: PendingYouTubeMismatch | null,
  activeSource: MediaSource | null | undefined
): boolean {
  if (!pending) {
    return false
  }
  if (pending.phase === 'awaiting-decision') {
    return false
  }
  if (!activeSource) {
    // Media closed while opening/awaiting/erroring — pending continuation is abandoned.
    return pending.phase === 'opening-target' || pending.phase === 'awaiting-ready'
  }
  if (!isYouTubeMediaSource(activeSource)) {
    return true
  }
  return activeSource.videoId !== pending.trackVideoId
}

export type YouTubeMismatchDialogView =
  | { open: false }
  | {
      open: true
      phase: PendingYouTubeMismatchPhase
      trackVideoId: string
      currentVideoId: string
      errorMessage: string | null
      canonicalUrl: string | null
    }

/** Map pending mismatch state to dialog view model. */
export function youtubeMismatchDialogModel(
  pending: PendingYouTubeMismatch | null
): YouTubeMismatchDialogView {
  if (!pending) {
    return { open: false }
  }
  const media = pending.track.media
  const canonicalUrl =
    media && media.kind === 'youtube'
      ? media.canonicalUrl || `https://www.youtube.com/watch?v=${media.videoId}`
      : `https://www.youtube.com/watch?v=${pending.trackVideoId}`
  return {
    open: true,
    phase: pending.phase,
    trackVideoId: pending.trackVideoId,
    currentVideoId: pending.currentVideoId,
    errorMessage: pending.error?.message ?? null,
    canonicalUrl
  }
}

/** @deprecated Prefer youtubeMismatchDialogModel; kept for earlier test naming. */
export function youtubeMismatchDialogProps(
  pending: PendingYouTubeMismatch | null
): YouTubeMismatchDialogView {
  return youtubeMismatchDialogModel(pending)
}

export const YOUTUBE_MISMATCH_READY_TIMEOUT_MS = 45000

/**
 * YouTube may emit onReady and then onError for unavailable/private/embed-disabled
 * targets. Defer payload/path apply until this settle window completes without error.
 */
export const YOUTUBE_MISMATCH_READY_SETTLE_MS = 1500

export const YOUTUBE_MISMATCH_TIMEOUT_MESSAGE =
  'The matching YouTube video did not become ready in time.'
