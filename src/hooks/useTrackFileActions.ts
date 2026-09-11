import { useCallback, useEffect, useRef, useState } from 'react'
import { compareTrackVideoToCurrent, type TrackVideoSnapshot } from '../lib/fingerprint'
import { readBookmarksForSave, sessionBookmarksToAnchors } from '../lib/sessionBookmarks'
import { mergeAnchorsForSave } from '../lib/trackAnchors'
import { buildTrackManifest, type TrackManifest } from '../lib/trackManifest'
import {
  buildCandidateAnchorsFromCues,
  classifyMismatches,
  suggestOffsetFromAnchors,
  type ClassifiedMismatches
} from '../lib/trackMatching'
import type { ManualTrackBuilderBatch } from '../lib/manualTrackBuilder'
import {
  buildVeilTrackFromStore,
  isYouTubeBoundTrack,
  parseAndDeserializeTrackJson,
  youtubeMediaSourceFromTrack
} from '../lib/trackSerialization'
import { buildVeilTrackFromManualBuilderBatch } from '../lib/unboundTrack'
import { recordRecentVeilFromTrack } from '../lib/recentVeils'
import type { VeilTrackStorePayload } from '../lib/trackSerialization'
import {
  getTotalTrackItemCount,
  LARGE_TRACK_ITEM_WARNING
} from '../lib/trackItems'
import { warnDurationOverflowFromStore } from '../lib/trackDurationCheck'
import { suggestTrackFilename } from '../lib/trackFilenames'
import { downloadTextFile, hasVeilTrackIpc } from '../lib/veilEnv'
import { runOpenTrackDialog } from '../lib/nativeOpenDialogGuard'
import { userMessages } from '../lib/userMessages'
import { t } from '../i18n'
import { confirmNative } from '../lib/nativeConfirm'
import { pushErrorToast, pushSuccessToast, pushWarningToast } from '../state/useToastStore'
import { useVeilStore } from '../state/useVeilStore'
import type { VeilTrack } from '../types/track'
import { EMPTY_TRACK_METADATA } from '../types/track'
import {
  beginOpenMatchingTarget,
  canApplyPendingOnYouTubeReady,
  canBeginOpenMatchingTarget,
  createPendingYouTubeMismatch,
  decideYouTubeTrackLoad,
  isPendingYouTubeMismatchSuperseded,
  isStaleMismatchRequest,
  markAwaitingYouTubeReady,
  transitionToTargetError,
  YOUTUBE_MISMATCH_READY_SETTLE_MS,
  YOUTUBE_MISMATCH_READY_TIMEOUT_MS,
  YOUTUBE_MISMATCH_TIMEOUT_MESSAGE,
  type PendingYouTubeMismatch
} from '../lib/youtubeTrackMismatch'
import { isYouTubeMediaSource } from '../types/mediaSource'
import { isValidLocatedTrackMedia } from '../lib/missingTrackMedia'
import { inferMediaKindFromFileName } from '../lib/mediaKind'
import { parseVeilApprovedMediaId } from '../lib/veilMediaUrl'

export type SaveTrackResult = 'saved' | 'canceled' | 'failed'
export type LoadTrackResult = 'loaded' | 'canceled' | 'failed'

export interface SaveTrackOptions {
  saveAs?: boolean
}

export interface LoadTrackFromJsonOptions {
  /** Absolute path for the incoming VEIL — applied only after a successful load/confirm. */
  trackFilePath?: string | null
}

interface PendingImport {
  track: VeilTrack
  payload: VeilTrackStorePayload
  manifest: TrackManifest
  classified: ClassifiedMismatches
  suggestedOffset: number | null
}

interface UseTrackFileActionsOptions {
  onAfterTrackMutation?: () => void
  onStatus?: (message: string | null) => void
}

export function useTrackFileActions(options: UseTrackFileActionsOptions = {}) {
  const { onAfterTrackMutation, onStatus } = options
  const useNativeTrackDialogs = hasVeilTrackIpc()
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [pendingMissingMedia, setPendingMissingMedia] = useState<TrackVideoSnapshot | null>(null)
  const [missingMediaPending, setMissingMediaPending] = useState(false)
  const [pendingYouTubeMismatch, setPendingYouTubeMismatch] =
    useState<PendingYouTubeMismatch | null>(null)
  const pendingYouTubeMismatchRef = useRef<PendingYouTubeMismatch | null>(null)
  const mismatchRequestSeqRef = useRef(0)
  const mismatchReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mismatchReadySettleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    pendingYouTubeMismatchRef.current = pendingYouTubeMismatch
  }, [pendingYouTubeMismatch])

  const clearMismatchReadyTimeout = useCallback((): void => {
    if (mismatchReadyTimeoutRef.current !== null) {
      clearTimeout(mismatchReadyTimeoutRef.current)
      mismatchReadyTimeoutRef.current = null
    }
  }, [])

  const clearMismatchReadySettle = useCallback((): void => {
    if (mismatchReadySettleRef.current !== null) {
      clearTimeout(mismatchReadySettleRef.current)
      mismatchReadySettleRef.current = null
    }
  }, [])

  const clearMismatchTimers = useCallback((): void => {
    clearMismatchReadyTimeout()
    clearMismatchReadySettle()
  }, [clearMismatchReadySettle, clearMismatchReadyTimeout])

  useEffect(() => {
    return () => {
      clearMismatchTimers()
    }
  }, [clearMismatchTimers])

  const warnLargeTrackIfNeeded = useCallback((payload: VeilTrackStorePayload): void => {
    const total = getTotalTrackItemCount(payload)
    if (total > LARGE_TRACK_ITEM_WARNING) {
      pushWarningToast(
        `Track has ${total} items. Performance may degrade with very large tracks.`
      )
    }
  }, [])

  const applyPayloadWithGuards = useCallback(
    (payload: VeilTrackStorePayload, offsetOverride?: number): void => {
      const applyLoadedTrackPayload = useVeilStore.getState().applyLoadedTrackPayload
      const validateAndFixSelection = useVeilStore.getState().validateAndFixSelection

      applyLoadedTrackPayload(
        payload,
        offsetOverride !== undefined ? { globalOffsetSeconds: offsetOverride } : undefined
      )

      validateAndFixSelection()
      warnLargeTrackIfNeeded(payload)
      warnDurationOverflowFromStore()
      onAfterTrackMutation?.()

      const parts: string[] = []
      if (payload.masks.length > 0) {
        parts.push(`${payload.masks.length} mask(s)`)
      }
      if (payload.mutes.length > 0) {
        parts.push(`${payload.mutes.length} mute(s)`)
      }
      if (payload.skips.length > 0) {
        parts.push(`${payload.skips.length} skip(s)`)
      }
      onStatus?.(`Track loaded (${parts.length > 0 ? parts.join(', ') : 'empty'}).`)
      pushSuccessToast(userMessages.trackLoaded)
    },
    [onAfterTrackMutation, onStatus, warnLargeTrackIfNeeded]
  )

  const applyYouTubeTrackLoad = useCallback(
    (track: VeilTrack, payload: VeilTrackStorePayload): void => {
      const youtubeSource = youtubeMediaSourceFromTrack(track)
      if (youtubeSource) {
        useVeilStore.getState().openYouTubeMedia(youtubeSource)
      }
      applyPayloadWithGuards(payload)
      useVeilStore.getState().markTrackClean()
      const filePath = useVeilStore.getState().trackFilePath
      if (filePath) {
        recordRecentVeilFromTrack(track, filePath)
      }
    },
    [applyPayloadWithGuards]
  )

  /** Apply pending payload/path after exact-target Ready — never opens media. */
  const applyPendingYouTubePayload = useCallback(
    (pending: PendingYouTubeMismatch): void => {
      if (pending.trackFilePath) {
        useVeilStore.getState().setTrackFilePath(pending.trackFilePath)
      }
      applyPayloadWithGuards(pending.payload)
      useVeilStore.getState().markTrackClean()
      const filePath = useVeilStore.getState().trackFilePath
      if (filePath) {
        recordRecentVeilFromTrack(pending.track, filePath)
      }
    },
    [applyPayloadWithGuards]
  )

  const confirmPendingImport = useCallback(
    (options: { applyOffset: boolean; importMeta: boolean }): void => {
      if (!pendingImport) {
        return
      }

      const { payload, suggestedOffset } = pendingImport
      const finalPayload: VeilTrackStorePayload = {
        ...payload,
        trackMetadata: options.importMeta ? payload.trackMetadata : { ...EMPTY_TRACK_METADATA },
        groups: options.importMeta ? payload.groups : [],
        anchors: options.importMeta ? payload.anchors : []
      }

      const offset =
        options.applyOffset && suggestedOffset !== null
          ? payload.globalOffsetSeconds + suggestedOffset
          : payload.globalOffsetSeconds

      try {
        applyPayloadWithGuards(finalPayload, offset)
        useVeilStore.getState().markTrackClean()
        const filePath = useVeilStore.getState().trackFilePath
        if (filePath) {
          recordRecentVeilFromTrack(pendingImport.track, filePath)
        }
        setPendingImport(null)
      } catch (error) {
        console.error('[veil] Failed to apply loaded track', error)
        const message = userMessages.loadFailed
        onStatus?.(message)
        pushErrorToast(message)
      }
    },
    [applyPayloadWithGuards, onStatus, pendingImport]
  )

  const cancelPendingImport = useCallback((): void => {
    setPendingImport(null)
    onStatus?.('Load canceled.')
  }, [onStatus])

  const scheduleMismatchReadyTimeout = useCallback(
    (requestId: number, loadGeneration: number): void => {
      clearMismatchReadyTimeout()
      mismatchReadyTimeoutRef.current = setTimeout(() => {
        const pending = pendingYouTubeMismatchRef.current
        if (isStaleMismatchRequest(pending, requestId, loadGeneration) || !pending) {
          return
        }
        if (useVeilStore.getState().youtubeLoadGeneration !== loadGeneration) {
          return
        }
        clearMismatchReadySettle()
        const next = transitionToTargetError(
          pending,
          requestId,
          {
            code: 'ready_timeout',
            message: YOUTUBE_MISMATCH_TIMEOUT_MESSAGE
          },
          loadGeneration
        )
        if (next) {
          pendingYouTubeMismatchRef.current = next
          setPendingYouTubeMismatch(next)
          onStatus?.(YOUTUBE_MISMATCH_TIMEOUT_MESSAGE)
        }
      }, YOUTUBE_MISMATCH_READY_TIMEOUT_MS)
    },
    [clearMismatchReadySettle, clearMismatchReadyTimeout, onStatus]
  )

  /**
   * Phase 1: open exact matching YouTube source only.
   * Payload, path, and clean state wait for Phase 2 Ready settle.
   * Always force-reloads the YouTube adapter so same-video Retry remounts.
   */
  const openMatchingYouTubeVideo = useCallback((): void => {
    const pending = pendingYouTubeMismatchRef.current
    if (!canBeginOpenMatchingTarget(pending)) {
      return
    }
    const youtubeSource = youtubeMediaSourceFromTrack(pending.track)
    if (!youtubeSource) {
      onStatus?.(userMessages.invalidTrackPayload)
      pushErrorToast(userMessages.invalidTrackPayload)
      return
    }

    const requestId = mismatchRequestSeqRef.current + 1
    mismatchRequestSeqRef.current = requestId
    clearMismatchTimers()

    // Claim the request synchronously so a second Retry click cannot start a parallel load.
    const claimed = beginOpenMatchingTarget(pending, requestId, pending.loadGeneration)
    pendingYouTubeMismatchRef.current = claimed
    setPendingYouTubeMismatch(claimed)

    try {
      useVeilStore.getState().openYouTubeMedia(youtubeSource, { reload: true })
    } catch (error) {
      console.error('[veil] Failed to open matching YouTube source', error)
      const failed = transitionToTargetError(claimed, requestId, {
        code: 'open_failed',
        message: userMessages.loadFailed
      })
      if (failed) {
        pendingYouTubeMismatchRef.current = failed
        setPendingYouTubeMismatch(failed)
      }
      onStatus?.(userMessages.loadFailed)
      pushErrorToast(userMessages.loadFailed)
      return
    }

    const loadGeneration = useVeilStore.getState().youtubeLoadGeneration
    const opening = beginOpenMatchingTarget(
      pendingYouTubeMismatchRef.current ?? claimed,
      requestId,
      loadGeneration
    )
    pendingYouTubeMismatchRef.current = opening
    setPendingYouTubeMismatch(opening)

    const awaiting = markAwaitingYouTubeReady(opening, requestId)
    if (awaiting) {
      pendingYouTubeMismatchRef.current = awaiting
      setPendingYouTubeMismatch(awaiting)
    }
    scheduleMismatchReadyTimeout(requestId, loadGeneration)
  }, [clearMismatchTimers, onStatus, scheduleMismatchReadyTimeout])

  /** @deprecated Prefer openMatchingYouTubeVideo — retained as the Open Matching entrypoint name. */
  const confirmYouTubeMismatch = openMatchingYouTubeVideo

  const retryYouTubeMismatch = openMatchingYouTubeVideo

  /**
   * Escape / Cancel before Ready: aborts continuation and does not apply payload/path.
   * If target B is already loading, destroy it via normal clearVideo.
   * Escape while awaiting-decision: Cancel keeps A open (no clearVideo).
   */
  const cancelYouTubeMismatch = useCallback((): void => {
    const pending = pendingYouTubeMismatchRef.current
    clearMismatchTimers()
    pendingYouTubeMismatchRef.current = null
    setPendingYouTubeMismatch(null)
    onStatus?.('Load canceled.')
    if (
      pending &&
      (pending.phase === 'opening-target' ||
        pending.phase === 'awaiting-ready' ||
        pending.phase === 'target-error')
    ) {
      const source = useVeilStore.getState().mediaSource
      if (
        source &&
        isYouTubeMediaSource(source) &&
        source.videoId === pending.trackVideoId
      ) {
        // Cancel/Close of target continuation: drop errored/incomplete B.
        useVeilStore.getState().clearVideo()
      }
    }
  }, [clearMismatchTimers, onStatus])

  /** Close on target-error — explicit discard; same cleanup as cancel during load. */
  const closeYouTubeMismatch = cancelYouTubeMismatch

  const openPendingYouTubeOnYouTube = useCallback((): void => {
    const pending = pendingYouTubeMismatchRef.current
    if (!pending) {
      return
    }
    const source = youtubeMediaSourceFromTrack(pending.track)
    const url =
      source?.canonicalUrl || `https://www.youtube.com/watch?v=${pending.trackVideoId}`
    void window.veil?.openExternalUrl?.(url)
  }, [])

  /**
   * Phase 2 gate: exact Ready arms a settle timer. Apply only if no Error arrives
   * during YOUTUBE_MISMATCH_READY_SETTLE_MS (YouTube often Ready→Error on unavailable).
   */
  const notifyYouTubeReadyForMismatch = useCallback(
    (readyVideoId: string, loadGeneration: number): boolean => {
      const pending = pendingYouTubeMismatchRef.current
      if (!pending) {
        return false
      }
      const requestId = pending.requestId
      const store = useVeilStore.getState()
      if (store.youtubeLoadGeneration !== loadGeneration) {
        return false
      }
      const activeSource = store.mediaSource
      if (
        !canApplyPendingOnYouTubeReady(
          pending,
          activeSource,
          readyVideoId,
          requestId,
          loadGeneration
        )
      ) {
        return false
      }

      clearMismatchReadyTimeout()
      clearMismatchReadySettle()
      mismatchReadySettleRef.current = setTimeout(() => {
        const current = pendingYouTubeMismatchRef.current
        const stateNow = useVeilStore.getState()
        if (stateNow.youtubeLoadGeneration !== loadGeneration) {
          return
        }
        if (
          !canApplyPendingOnYouTubeReady(
            current,
            stateNow.mediaSource,
            readyVideoId,
            requestId,
            loadGeneration
          )
        ) {
          return
        }
        try {
          applyPendingYouTubePayload(current!)
          pendingYouTubeMismatchRef.current = null
          setPendingYouTubeMismatch(null)
        } catch (error) {
          console.error('[veil] Failed to apply YouTube VEIL after Ready settle', error)
          const failed = transitionToTargetError(
            current!,
            requestId,
            {
              code: 'apply_failed',
              message: userMessages.loadFailed
            },
            loadGeneration
          )
          if (failed) {
            pendingYouTubeMismatchRef.current = failed
            setPendingYouTubeMismatch(failed)
          }
          onStatus?.(userMessages.loadFailed)
          pushErrorToast(userMessages.loadFailed)
        }
      }, YOUTUBE_MISMATCH_READY_SETTLE_MS)
      return true
    },
    [
      applyPendingYouTubePayload,
      clearMismatchReadySettle,
      clearMismatchReadyTimeout,
      onStatus
    ]
  )

  /**
   * Target failure before apply settle completes. Keeps pending recoverable.
   * Returns true when the mismatch dialog owns the error (suppress generic playback modal).
   */
  const notifyYouTubeErrorForMismatch = useCallback(
    (
      error: { code?: number | string; message: string },
      errorVideoId?: string | null,
      loadGeneration?: number
    ): boolean => {
      const pending = pendingYouTubeMismatchRef.current
      if (!pending) {
        return false
      }
      if (
        pending.phase !== 'opening-target' &&
        pending.phase !== 'awaiting-ready' &&
        pending.phase !== 'target-error'
      ) {
        return false
      }
      if (
        typeof errorVideoId === 'string' &&
        errorVideoId.length > 0 &&
        errorVideoId !== pending.trackVideoId
      ) {
        return false
      }
      const requestId = pending.requestId
      const generation =
        typeof loadGeneration === 'number' ? loadGeneration : pending.loadGeneration
      if (isStaleMismatchRequest(pending, requestId, generation)) {
        return false
      }
      if (useVeilStore.getState().youtubeLoadGeneration !== generation) {
        return false
      }
      // Cancel deferred apply from a premature Ready.
      clearMismatchTimers()
      const next = transitionToTargetError(
        pending,
        requestId,
        {
          code: error.code,
          message: error.message || userMessages.loadFailed
        },
        generation
      )
      if (next) {
        pendingYouTubeMismatchRef.current = next
        setPendingYouTubeMismatch(next)
        onStatus?.(next.error?.message ?? userMessages.loadFailed)
        return true
      }
      return false
    },
    [clearMismatchTimers, onStatus]
  )

  // Supersede pending continuation when media leaves the target (or closes mid-load).
  useEffect(() => {
    return useVeilStore.subscribe((state) => {
      const pending = pendingYouTubeMismatchRef.current
      if (!pending) {
        return
      }
      if (!isPendingYouTubeMismatchSuperseded(pending, state.mediaSource)) {
        return
      }
      // opening-target briefly coexists with previous source A until openYouTubeMedia commits.
      if (pending.phase === 'opening-target') {
        const src = state.mediaSource
        if (
          src &&
          isYouTubeMediaSource(src) &&
          src.videoId === pending.currentVideoId
        ) {
          return
        }
      }
      clearMismatchTimers()
      pendingYouTubeMismatchRef.current = null
      setPendingYouTubeMismatch(null)
      onStatus?.('Load canceled.')
    })
  }, [clearMismatchTimers, onStatus])

  const loadTrackFromJsonText = useCallback(
    async (
      jsonText: string,
      options: LoadTrackFromJsonOptions = {}
    ): Promise<LoadTrackResult> => {
      const parsed = parseAndDeserializeTrackJson(jsonText)
      if (!parsed.ok) {
        onStatus?.(parsed.message)
        pushErrorToast(parsed.message)
        return 'failed'
      }
      if (!parsed.payload) {
        onStatus?.(userMessages.invalidTrackPayload)
        pushErrorToast(userMessages.invalidTrackPayload)
        return 'failed'
      }

      const incomingTrackFilePath =
        typeof options.trackFilePath === 'string' && options.trackFilePath.length > 0
          ? options.trackFilePath
          : null

      const currentState = useVeilStore.getState()
      const currentMetadata = currentState.videoMetadata
      const currentFileName = currentState.videoFileName
      const currentVideoSrc = currentState.videoSrc
      const currentMediaSource = currentState.mediaSource
      const manifest = buildTrackManifest(parsed.track)

      if (isYouTubeBoundTrack(parsed.track)) {
        const youtubeSource = youtubeMediaSourceFromTrack(parsed.track)
        if (!youtubeSource) {
          onStatus?.(userMessages.invalidTrackPayload)
          pushErrorToast(userMessages.invalidTrackPayload)
          return 'failed'
        }

        const decision = decideYouTubeTrackLoad(currentMediaSource, youtubeSource)
        if (decision.action === 'mismatch') {
          setPendingYouTubeMismatch(
            createPendingYouTubeMismatch({
              track: parsed.track,
              payload: parsed.payload,
              trackVideoId: decision.trackVideoId,
              currentVideoId: decision.currentVideoId,
              trackFilePath: incomingTrackFilePath
            })
          )
          return 'loaded'
        }

        if (incomingTrackFilePath) {
          useVeilStore.getState().setTrackFilePath(incomingTrackFilePath)
        }
        applyYouTubeTrackLoad(parsed.track, parsed.payload)
        return 'loaded'
      }

      if (incomingTrackFilePath) {
        useVeilStore.getState().setTrackFilePath(incomingTrackFilePath)
      }

      let classified = classifyMismatches([])
      if (currentVideoSrc && currentMetadata && currentFileName && parsed.track.video) {
        const mismatches = compareTrackVideoToCurrent(
          parsed.track.video,
          currentFileName,
          currentMetadata
        )
        classified = classifyMismatches(mismatches)
      }

      const trackAnchors = parsed.track.anchors ?? []
      const sessionCues = useVeilStore.getState().subtitleCues
      const candidateAnchors =
        sessionCues.length > 0 ? buildCandidateAnchorsFromCues(sessionCues) : []
      const suggestedOffset = suggestOffsetFromAnchors(
        trackAnchors,
        candidateAnchors,
        parsed.track.video?.duration ?? 0
      )

      if (!currentVideoSrc || !currentMetadata || !currentFileName) {
        if (parsed.track.video) {
          useVeilStore.setState({
            videoFileName: parsed.track.video.name,
            videoMetadata: {
              name: parsed.track.video.name,
              duration: parsed.track.video.duration,
              fileSize: parsed.track.video.fileSize,
              width: parsed.track.video.resolution.width,
              height: parsed.track.video.resolution.height
            }
          })
        }
        applyPayloadWithGuards(parsed.payload)
        useVeilStore.getState().markTrackClean()
        const filePath = useVeilStore.getState().trackFilePath
        if (parsed.track.video?.binding !== 'unbound' && parsed.track.video) {
          setPendingMissingMedia(parsed.track.video)
        }
        if (filePath) {
          recordRecentVeilFromTrack(parsed.track, filePath)
        }
        return 'loaded'
      }

      setPendingImport({
        track: parsed.track,
        payload: parsed.payload,
        manifest,
        classified,
        suggestedOffset
      })
      return 'loaded'
    },
    [applyPayloadWithGuards, applyYouTubeTrackLoad, onStatus]
  )

  const saveManualBuilderTrack = useCallback(
    async (batch: ManualTrackBuilderBatch): Promise<SaveTrackResult> => {
      const track = buildVeilTrackFromManualBuilderBatch(batch)
      const json = JSON.stringify(track, null, 2)

      if (useNativeTrackDialogs) {
        const result = await window.veil!.saveTrackJson(json, { saveAs: true })

        if (result.canceled) {
          onStatus?.(null)
          return 'canceled'
        }

        if (!result.ok) {
          const message = result.error ?? userMessages.saveFailed
          onStatus?.(message)
          pushErrorToast(message)
          return 'failed'
        }

        if (result.filePath) {
          recordRecentVeilFromTrack(track, result.filePath)
        }
        onStatus?.('Track saved.')
        pushSuccessToast(t('toast.manualTrackSaved'))
        return 'saved'
      }

      downloadTextFile(json, 'track.veil')
      onStatus?.('Track downloaded (browser fallback). Use npm run dev for native save dialog.')
      pushSuccessToast(t('toast.manualTrackDownloaded'))
      return 'saved'
    },
    [onStatus, useNativeTrackDialogs]
  )

  const saveTrack = useCallback(
    async (options: SaveTrackOptions = {}): Promise<SaveTrackResult> => {
      const saveAs = options.saveAs === true
      const state = useVeilStore.getState()
      const sessionBookmarks = readBookmarksForSave(
        state.videoFileName,
        state.videoMetadata?.duration ?? 0
      )
      let manualAnchors = state.anchors.filter((anchor) => anchor.kind !== 'cue')
      if (sessionBookmarks.length > 0) {
        const exportBookmarks = confirmNative(
          t('dialog.exportBookmarks'), `Also save ${sessionBookmarks.length} session bookmark(s) as track anchors?`
        )
        if (exportBookmarks) {
          manualAnchors = [...manualAnchors, ...sessionBookmarksToAnchors(sessionBookmarks)]
        }
      }
      const anchorsForSave = mergeAnchorsForSave(manualAnchors, state.subtitleCues)

      const track = buildVeilTrackFromStore({
        masks: state.masks,
        mutes: state.mutes,
        skips: state.skips,
        bookmarks: state.bookmarks,
        preservedUnsupportedItems: state.preservedUnsupportedItems,
    preservedUnknownItems: state.preservedUnknownItems,
    preservedUnknownRootFields: state.preservedUnknownRootFields,
        globalOffsetSeconds: state.globalOffsetSeconds,
        trackMetadata: state.trackMetadata,
        groups: state.groups,
        anchors: anchorsForSave,
        subtitleCoverMode: state.subtitleCoverMode,
        regionCoverRect: state.regionCoverRect,
        videoMetadata: state.videoMetadata,
        videoFileName: state.videoFileName,
        mediaSource: state.mediaSource
      })

      if (!track) {
        onStatus?.(userMessages.saveNeedsVideo)
        pushErrorToast(userMessages.saveNeedsVideo)
        return 'failed'
      }

      const json = JSON.stringify(track, null, 2)
      const suggestedPath = suggestTrackFilename(state.videoFileName, state.trackFilePath)

      if (useNativeTrackDialogs) {
        const result = await window.veil!.saveTrackJson(json, {
          saveAs,
          filePath: saveAs ? suggestedPath : state.trackFilePath
        })

        if (result.canceled) {
          onStatus?.(null)
          return 'canceled'
        }

        if (!result.ok) {
          const message = result.error ?? userMessages.saveFailed
          onStatus?.(message)
          pushErrorToast(message)
          return 'failed'
        }

        if (result.filePath) {
          useVeilStore.getState().setTrackFilePath(result.filePath)
          recordRecentVeilFromTrack(track, result.filePath)
        }
        useVeilStore.setState({ anchors: anchorsForSave })
        useVeilStore.getState().markTrackClean()
        onStatus?.('Track saved.')
        pushSuccessToast(userMessages.trackSaved)
        return 'saved'
      }

      downloadTextFile(json, suggestedPath.split(/[/\\]/).pop() ?? 'track.veil')
      useVeilStore.setState({ anchors: anchorsForSave })
      useVeilStore.getState().markTrackClean()
      onStatus?.('Track downloaded (browser fallback). Use npm run dev for native save dialog.')
      pushSuccessToast(userMessages.trackDownloaded)
      return 'saved'
    },
    [onStatus, useNativeTrackDialogs]
  )

  const saveTrackAs = useCallback(async (): Promise<SaveTrackResult> => {
    return saveTrack({ saveAs: true })
  }, [saveTrack])

  const pickAndLoadTrack = useCallback(async (): Promise<LoadTrackResult> => {
    if (useNativeTrackDialogs) {
      const result = await runOpenTrackDialog(() => window.veil!.loadTrackJson())

      if (!result) {
        onStatus?.(null)
        return 'canceled'
      }

      if (result.canceled) {
        onStatus?.(null)
        return 'canceled'
      }

      if (!result.ok || result.json === null || result.json === undefined) {
        const message = result.error ?? userMessages.loadFailed
        onStatus?.(message)
        pushErrorToast(message)
        return 'failed'
      }

      return loadTrackFromJsonText(result.json, {
        trackFilePath: result.filePath ?? null
      })
    }

    return 'canceled'
  }, [loadTrackFromJsonText, onStatus, useNativeTrackDialogs])

  const loadTrackFromPath = useCallback(
    async (filePath: string): Promise<LoadTrackResult> => {
      if (!useNativeTrackDialogs) {
        return 'failed'
      }

      const result = await window.veil!.loadTrackJsonFromPath(filePath)

      if (!result.ok || result.json === null || result.json === undefined) {
        onStatus?.(result.error ?? userMessages.loadFailed)
        pushErrorToast(result.error ?? userMessages.loadFailed)
        return 'failed'
      }

      return loadTrackFromJsonText(result.json, { trackFilePath: filePath })
    },
    [loadTrackFromJsonText, onStatus, useNativeTrackDialogs]
  )

  const continueWithoutMissingMedia = useCallback((): void => {
    setPendingMissingMedia(null)
  }, [])

  const locateMissingMedia = useCallback(async (): Promise<void> => {
    const expected = pendingMissingMedia
    const api = window.veil
    if (!expected || !api || missingMediaPending) return

    setMissingMediaPending(true)
    try {
      const candidate = await api.openVideoDialog()
      if (candidate.canceled) return

      if (!isValidLocatedTrackMedia(expected, candidate)) {
        const mediaId = parseVeilApprovedMediaId(candidate.mediaUrl)
        if (mediaId !== null) {
          await api.releasePrivilegedMedia(mediaId)
        }
        pushErrorToast('The selected file does not match the media referenced by this VEIL.')
        return
      }

      const mediaKind = inferMediaKindFromFileName(candidate.name!)
      if (!mediaKind) {
        const mediaId = parseVeilApprovedMediaId(candidate.mediaUrl)
        if (mediaId !== null) {
          await api.releasePrivilegedMedia(mediaId)
        }
        pushErrorToast(userMessages.invalidMedia)
        return
      }

      const state = useVeilStore.getState()
      state.setVideoSource(
        candidate.mediaUrl!,
        candidate.name!,
        'protocol',
        candidate.size,
        candidate.filePath!,
        mediaKind
      )
      useVeilStore.getState().setVideoMetadata({
        name: candidate.name!,
        duration: expected.duration,
        fileSize: candidate.size,
        width: expected.resolution.width,
        height: expected.resolution.height
      })
      setPendingMissingMedia(null)
    } catch {
      pushErrorToast(userMessages.openVideoFailed)
    } finally {
      setMissingMediaPending(false)
    }
  }, [missingMediaPending, pendingMissingMedia])


  return {
    saveTrack,
    saveTrackAs,
    saveManualBuilderTrack,
    loadTrackFromJsonText,
    loadTrackFromPath,
    pickAndLoadTrack,
    useNativeTrackDialogs,
    pendingImport,
    confirmPendingImport,
    cancelPendingImport,
    pendingYouTubeMismatch,
    confirmYouTubeMismatch,
    openMatchingYouTubeVideo,
    retryYouTubeMismatch,
    cancelYouTubeMismatch,
    closeYouTubeMismatch,
    openPendingYouTubeOnYouTube,
    notifyYouTubeReadyForMismatch,
    notifyYouTubeErrorForMismatch,
    pendingMissingMedia,
    missingMediaPending,
    locateMissingMedia,
    continueWithoutMissingMedia,
  }
}
