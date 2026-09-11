import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { usePlaybackLoop } from '../hooks/usePlaybackLoop'
import { t } from '../i18n'
import {
  buildContentReviewApplyPlan,
  type ContentReviewAppliedActionMap,
  type ContentReviewAppliedActionUpdates,
  type ContentReviewDecisionMap,
  type ContentReviewFinding
} from '../lib/contentReview'
import {
  captureContentReviewPlaybackOrigin,
  type ContentReviewPlaybackOrigin
} from '../lib/contentReviewPreview'
import { confirmNative } from '../lib/nativeConfirm'
import { useRenderedVideoRect } from '../hooks/useRenderedVideoRect'
import { isEditableTarget } from '../lib/keyboard'
import { isModalActive } from '../lib/isModalActive'
import {
  isInteractiveOverlayOpen,
  subscribeInteractiveOverlay
} from '../lib/interactiveOverlay'
import { shouldHideFullscreenCursor } from '../lib/fullscreenCursorLifecycle'
import { readUiRefreshV1 } from '../lib/uiRefreshV1'
import { usePlaybackActivityPreferences } from '../hooks/usePlaybackActivityPreferences'
import { afterTimingMutation } from '../lib/playbackMutation'
import {
  quickReplay,
  smartReplay,
  stepPlaybackSpeed,
  type PlaybackSpeedPreset
} from '../lib/playbackHelpers'
import {
  findActiveSubtitleMaskId,
  getNextCueIndex,
  getPreviousCueIndex,
  repeatCurrentCue,
  seekVideoToCue
} from '../lib/subtitleCueNavigation'
import { buildTrackSessionFingerprint } from '../lib/trackGroupSession'
import { readSessionLoop, writeSessionLoop, type SessionLoop } from '../lib/sessionLoop'
import {
  isMomentaryRevealActive,
  MOMENTARY_REVEAL_MS
} from '../lib/workflowSession'
import { clearAppMenuActions, registerAppMenuActions } from '../lib/appMenuBridge'
import { registerEnsureSidebarVisible } from '../lib/playerLayoutBridge'
import {
  registerUiRefreshPanelRouting,
  requestUiRefreshEditMode
} from '../lib/uiRefreshPanelBridge'
import { requestOpenSidebarPanel, type SidebarPanelId } from '../lib/sidebarPanelBridge'
import {
  preserveInspectorTabForSelection,
  type InspectorSelectionNavigationIntent
} from '../lib/inspectorSelectionNavigation'
import { useWorkflowPlayback } from '../hooks/useWorkflowPlayback'
import { incrementWorkflowMetric } from '../lib/workflowMetrics'
import { matchesBinding } from '../lib/shortcutBindings'
import { KEY_HOLD_REVEAL, KEY_MOMENTARY_REVEAL } from '../lib/shortcuts'
import { formatTime } from '../lib/time'
import { localMediaSessionTitle, shouldPublishLocalMediaSession } from '../lib/mediaSessionMetadata'
import {
  isSeekDebugEnabled,
  markSeekDebugEvent,
  recordManualSeekDebug,
  setCurrentTimeDebug,
  updateSeekDebug,
  type SeekDebugSource
} from '../lib/debugState'
import { warnDurationOverflowFromStore } from '../lib/trackDurationCheck'
import { updateRecentVideoDuration } from '../lib/sessionRecovery'
import { computeVirtualTimelineDuration } from '../lib/virtualTimeline'
import { pushWarningToast } from '../state/useToastStore'
import {
  buildLayerListRows,
  buildReconcileItems,
  isTrackItemEnabled,
  type FilterMode,
  type SelectableItemType
} from '../lib/trackItems'
import type { LayerSelectionOrigin } from '../lib/layerSelectionOrigin'
import { reconcilePlayback } from '../lib/reconciler'
import { bookmarkStorageKey, readSessionBookmarks } from '../lib/sessionBookmarks'
import { computeAspectFitContentLayout, getStageFillContentLayout } from '../lib/videoRect'
import { canRenderMaskOverlays } from '../lib/audioMode'
import { resolvePlaybackCapabilities } from '../lib/playbackCapabilities'
import {
  canCreateRangeActions,
  canEditItemType,
  filterExecutableActions
} from '../lib/authoringCapabilities'
import {
  setPlayerModeEditWithAudio,
  shouldShowAudioCompact,
  togglePlayerModeWithAudio
} from '../lib/audioWorkspace'
import {
  clampPlaybackRestoreTime,
  clearAudioPlaybackTransition,
  readAudioPlaybackTransition,
  shouldRestorePlayheadAfterRemount,
} from '../lib/audioPlaybackTransition'
import { isAudioMediaKind } from '../lib/mediaKind'
import { isDeferredSeekStillCurrent, resolveActiveLocalMediaDuration } from '../lib/localMediaSeek'
import { evaluateYouTubeDurationDrift } from '../lib/youtubeDurationDrift'
import {
  YouTubeRangePlaybackGuard,
  type YouTubeRangePlaybackResult
} from '../lib/youtubeRangePlayback'
import { inspectorDock, inspectorDockClassName } from '../lib/inspectorDock'
import { playerWorkspaceClassName } from '../lib/playerWorkspaceLayout'
import { isYouTubeMediaSource } from '../types/mediaSource'
import { userMessages } from '../lib/userMessages'
import { AUDIO_SEEK_STEP_SECONDS, seekRelative } from '../lib/relativeSeek'
import {
  isCurrentYouTubeFailureEvent,
  localPlaybackFailure,
  canCreatePlaybackPositionBookmark,
  resolveLiveTransportDuration,
  youtubePlaybackFailure,
  type PlaybackFailure
} from '../playback/playbackFailure'
import {
  openFailedYouTubeExternally as openYouTubeFailureExternally,
  retryActiveYouTubePlayback
} from '../playback/youtubePlaybackRecovery'
import {
  LocalMediaOwnership,
  type LocalMediaOwnershipCallbacks
} from '../playback/localMediaOwnership'
import { armAuthoritativeMediaAutoplay } from '../playback/localMediaAutoplay'
import {
  normalizePlaybackDuration,
  normalizePlaybackTime,
  reconcileYouTubeSeekSample,
  resolveBookmarkTimestamp,
  type PendingPlaybackSeek
} from '../playback/authoritativeTime'
import AudioPlaceholder from './AudioPlaceholder'
import AudioPlayerLayout from './player/AudioPlayerLayout'
import YouTubePlayerStage, { type YouTubePlayerStageHandle } from './YouTubePlayerStage'
import {
  resolveFullscreenLayerFilter,
  writeFullscreenLayerFilter,
  type FullscreenLayerFilter
} from '../lib/fullscreenLayerFilter'
import { useVeilStore } from '../state/useVeilStore'
import { usePlayerModeStore } from '../state/usePlayerModeStore'
import MediaPlaybackErrorDialog from './MediaPlaybackErrorDialog'
import YouTubePlaybackFailurePanel from './YouTubePlaybackFailurePanel'
import PlaybackRateControl from './PlaybackRateControl'
import { FullscreenEnterIcon, InspectorCollapseIcon, LayersIcon } from './icons'
import VolumeControl from './VolumeControl'
import { clampVolume, setVideoVolume } from '../lib/videoVolume'
import PlayerUtilityControls from './PlayerUtilityControls'
import TrackSidebarRail from './TrackSidebarRail'
import FullscreenEditOverlay, { type ActiveLayerSummary } from './FullscreenEditOverlay'
import OverlayLayer, { type MaskRenderSpec } from './OverlayLayer'
import PlaybackHUD from './PlaybackHUD'
import {
  filterMasksForPlaybackRender,
  maskNeedsPlaybackOpacityAnimation
} from '../lib/maskTransitions'
import { showPlaybackHud } from '../lib/playbackHud'
import RegionSubtitleCover from './RegionSubtitleCover'
import SubtitleTextLayer from './SubtitleTextLayer'
import { isRegionCoverMode } from '../lib/subtitleCoverDefaults'
import TimelineEditor from './TimelineEditor'
import TrackSidebar from './TrackSidebar'
import InspectorPanel from './InspectorPanel'
import ProgressBookmarkMarkers from './ProgressBookmarkMarkers'
import { updateRecentYouTubeTitle } from '../lib/sessionRecovery'
import { PlaybackSeekBar } from './PlaybackSeekBar'
import VeilCanvas from './VeilCanvas'
import TrackToolDialogs from './TrackToolDialogs'
import SubtitleSheet from './SubtitleSheet'
import ContentReviewDialog from './ContentReviewDialog'
import BookmarkActivitySurface from './BookmarkActivitySurface'
import { registerSubtitleSheetBridge } from '../lib/subtitleSheetBridge'
import { requestSettingsSection } from '../lib/settingsNavigation'
import {
  requestBookmarkToastDismissal,
  requestBookmarkToast,
  subscribeBookmarkToast
} from '../lib/bookmarkInteractionBridge'
import {
  findCrossedBookmark,
  resetBackwardCrossingEligibility
} from '../lib/bookmarkToast'
import { useTrackGroupSession } from '../hooks/useTrackGroupSession'
import { useTrackFileActionsContext } from '../hooks/TrackFileActionsProvider'
import { runAppMenuAction } from '../lib/appMenuBridge'
import { hasVeilSession } from '../lib/trackSession'
import type { ActiveTrackTool } from '../lib/trackTools'
import {
  clearExplicitLayerSelection,
  shouldClearMaskSelectionFromStage
} from '../lib/explicitLayerSelection'

const HAVE_METADATA_READY_STATE = 1
const SEEK_FAILURE_TIMEOUT_MS = 1800
const SEEK_SUCCESS_TOLERANCE_SECONDS = 0.75
const FULLSCREEN_SKIP_INSPECTION_RELEASE_SECONDS = 0.25

interface VideoPlayerProps {
  trackMutatedRef?: React.MutableRefObject<(() => void) | null>
  sidebarCollapsed: boolean
  onSidebarCollapsedChange: (collapsed: boolean) => void
  timelineVisible: boolean
  onTimelineVisibleChange: (visible: boolean) => void
  onOpenVideo?: () => void
}

interface SeekableRangeSnapshot {
  start: number
  end: number
}

function getVideoSrcKind(video: HTMLVideoElement): 'file' | 'blob' | 'veil-media' | 'other' {
  if (video.currentSrc.startsWith('file:') || video.src.startsWith('file:')) {
    return 'file'
  }
  if (video.currentSrc.startsWith('blob:') || video.src.startsWith('blob:')) {
    return 'blob'
  }
  if (video.currentSrc.startsWith('veil-media:') || video.src.startsWith('veil-media:')) {
    return 'veil-media'
  }
  return 'other'
}

function readSeekableRanges(video: HTMLVideoElement): SeekableRangeSnapshot[] {
  const ranges: SeekableRangeSnapshot[] = []
  for (let index = 0; index < video.seekable.length; index += 1) {
    try {
      ranges.push({ start: video.seekable.start(index), end: video.seekable.end(index) })
    } catch {
      break
    }
  }
  return ranges
}

function clampTargetToSeekableRange(
  target: number,
  ranges: SeekableRangeSnapshot[]
): { target: number; within: boolean } {
  if (ranges.length === 0) {
    return { target, within: false }
  }

  for (const range of ranges) {
    if (target >= range.start && target <= range.end) {
      return { target, within: true }
    }
  }

  let nearest = ranges[0].start
  let nearestDistance = Math.abs(target - nearest)
  for (const range of ranges) {
    const candidates = [range.start, range.end]
    for (const candidate of candidates) {
      const distance = Math.abs(target - candidate)
      if (distance < nearestDistance) {
        nearest = candidate
        nearestDistance = distance
      }
    }
  }

  return { target: nearest, within: false }
}

function buildMediaSeekDebug(
  video: HTMLVideoElement,
  targetWithinSeekableRange?: boolean
): {
  readyState: number
  networkState: number
  errorCode: number | null
  errorMessage: string | null
  srcKind: 'file' | 'blob' | 'veil-media' | 'other'
  seekableLength: number
  seekableRanges: SeekableRangeSnapshot[]
  targetWithinSeekableRange?: boolean
} {
  const error = video.error
  return {
    readyState: video.readyState,
    networkState: video.networkState,
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? null,
    srcKind: getVideoSrcKind(video),
    seekableLength: video.seekable.length,
    seekableRanges: readSeekableRanges(video),
    ...(typeof targetWithinSeekableRange === 'boolean' ? { targetWithinSeekableRange } : {})
  }
}

export default function VideoPlayer({
  trackMutatedRef,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  timelineVisible,
  onTimelineVisibleChange,
  onOpenVideo
}: VideoPlayerProps) {
  useLanguage()
  const playbackActivityPreferences = usePlaybackActivityPreferences()
  const videoSrc = useVeilStore((state) => state.videoSrc)
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const youtubeLoadGeneration = useVeilStore((state) => state.youtubeLoadGeneration)
  const trackFilePath = useVeilStore((state) => state.trackFilePath)
  const masks = useVeilStore((state) => state.masks)
  const globalOffsetSeconds = useVeilStore((state) => state.globalOffsetSeconds)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const anchors = useVeilStore((state) => state.anchors)
  const subtitleCues = useVeilStore((state) => state.subtitleCues)
  const videoFileName = useVeilStore((state) => state.videoFileName)
  const videoMetadata = useVeilStore((state) => state.videoMetadata)
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const isAudioMode = isAudioMediaKind(mediaKind)
  const isYouTube = Boolean(mediaSource && isYouTubeMediaSource(mediaSource))
  const youtubeSource = mediaSource && isYouTubeMediaSource(mediaSource) ? mediaSource : null

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") {
      return
    }

    const mediaSession = navigator.mediaSession
    if (!shouldPublishLocalMediaSession(videoSrc, videoFileName, isYouTube)) {
      mediaSession.metadata = null
      return
    }

    const metadata = new MediaMetadata({ title: localMediaSessionTitle(videoFileName ?? "") })
    mediaSession.metadata = metadata
    return () => {
      if (mediaSession.metadata === metadata) {
        mediaSession.metadata = null
      }
    }
  }, [isYouTube, videoFileName, videoSrc])
  const playbackCapabilities = useMemo(
    () => resolvePlaybackCapabilities(mediaSource, mediaKind),
    [mediaSource, mediaKind]
  )
  const hasPlayableMedia = Boolean(videoSrc) || isYouTube
  const toggleItemLocked = useVeilStore((state) => state.toggleItemLocked)
  const toggleItemEnabled = useVeilStore((state) => state.toggleItemEnabled)
  const subtitleCoverMode = useVeilStore((state) => state.subtitleCoverMode)
  const regionCoverRect = useVeilStore((state) => state.regionCoverRect)
  const setRegionCoverRect = useVeilStore((state) => state.setRegionCoverRect)
  const setVideoMetadata = useVeilStore((state) => state.setVideoMetadata)
  const addMask = useVeilStore((state) => state.addMask)
  const addMute = useVeilStore((state) => state.addMute)
  const addSkip = useVeilStore((state) => state.addSkip)
  const reconcileTimedItemsBatch = useVeilStore((state) => state.reconcileTimedItemsBatch)
  const addBookmark = useVeilStore((state) => state.addBookmark)
  const deleteBookmark = useVeilStore((state) => state.deleteBookmark)
  const patchBookmark = useVeilStore((state) => state.patchBookmark)
  const trackBookmarks = useVeilStore((state) => state.bookmarks)
  const addAnchorAtTime = useVeilStore((state) => state.addAnchorAtTime)
  const removeSelectedItem = useVeilStore((state) => state.removeSelectedItem)
  const setSelectedItem = useVeilStore((state) => state.setSelectedItem)
  const selectTimelineItem = useVeilStore((state) => state.selectTimelineItem)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const selectedItems = useVeilStore((state) => state.selectedItems)
  const toggleSelectedItem = useVeilStore((state) => state.toggleSelectedItem)
  const setMaskStart = useVeilStore((state) => state.setMaskStart)
  const setMaskEnd = useVeilStore((state) => state.setMaskEnd)
  const setMuteStart = useVeilStore((state) => state.setMuteStart)
  const setMuteEnd = useVeilStore((state) => state.setMuteEnd)
  const setSkipStart = useVeilStore((state) => state.setSkipStart)
  const setSkipEnd = useVeilStore((state) => state.setSkipEnd)

  const applyContentReviewToVeil = useCallback((
    reviewFindings: readonly ContentReviewFinding[],
    reviewDecisions: ContentReviewDecisionMap,
    appliedActions: ContentReviewAppliedActionMap
  ): ContentReviewAppliedActionUpdates | null => {
    const plan = buildContentReviewApplyPlan(reviewFindings, reviewDecisions, appliedActions)
    const changed = reconcileTimedItemsBatch(plan)
    return changed ? plan.appliedActionUpdates : null
  }, [reconcileTimedItemsBatch])

  const uiRefreshV1 = readUiRefreshV1()
  const playerMode = usePlayerModeStore((state) => state.playerMode)
  const togglePlayerMode = usePlayerModeStore((state) => state.togglePlayerMode)
  const hideEditorChrome = uiRefreshV1 && playerMode === 'watch'
  const refreshWatchMode = hideEditorChrome
  const showAudioCompact =
    Boolean(videoSrc) && !isYouTube && shouldShowAudioCompact(mediaKind, playerMode)
  const { notifyYouTubeReadyForMismatch, notifyYouTubeErrorForMismatch } =
    useTrackFileActionsContext()

  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeLocalMediaElement, setActiveLocalMediaElement] = useState<HTMLVideoElement | null>(null)
  const localMediaOwnershipRef = useRef<LocalMediaOwnership<HTMLVideoElement> | null>(null)
  if (!localMediaOwnershipRef.current) {
    localMediaOwnershipRef.current = new LocalMediaOwnership(videoRef)
  }
  const localMediaCallbacksRef = useRef<LocalMediaOwnershipCallbacks | null>(null)
  const bindActiveLocalMediaElement = useCallback((element: HTMLVideoElement | null): void => {
    setActiveLocalMediaElement(element)
    const callbacks = localMediaCallbacksRef.current
    if (!callbacks) return
    localMediaOwnershipRef.current?.setActiveLocalMediaElement(element, {
      onActivate: (media) => localMediaCallbacksRef.current?.onActivate(media),
      onPlay: () => localMediaCallbacksRef.current?.onPlay(),
      onPause: () => localMediaCallbacksRef.current?.onPause(),
      onSeeked: () => localMediaCallbacksRef.current?.onSeeked(),
      onTimeUpdate: () => localMediaCallbacksRef.current?.onTimeUpdate(),
      onDurationChange: () => localMediaCallbacksRef.current?.onDurationChange(),
      onEnded: () => localMediaCallbacksRef.current?.onEnded()
    })
  }, [])
  const youtubeStageRef = useRef<YouTubePlayerStageHandle | null>(null)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const [playerVolume, setPlayerVolume] = useState(1)
  const [playerMuted, setPlayerMuted] = useState(false)
  const playerVolumeRef = useRef(1)
  const playerMutedRef = useRef(false)
  const driftCheckedVideoIdRef = useRef<string | null>(null)
  const mediaErrorNotifiedForSrcRef = useRef<string | null>(null)
  const mediaAutoplaySrcRef = useRef<string | null>(null)
  const measuredVideoContentLayout = useRenderedVideoRect(
    videoRef,
    stageRef,
    uiRefreshV1
      ? `${hideEditorChrome}:${playerMode}:${sidebarCollapsed}:${timelineVisible}`
      : `${sidebarCollapsed}:${timelineVisible}`
  )
  const [placeholderContentLayout, setPlaceholderContentLayout] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const [audioContentLayout, setAudioContentLayout] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  const [reviewIsolation, setReviewIsolation] = useState(false)
  const [fullReveal, setFullReveal] = useState(false)
  const [holdReveal, setHoldReveal] = useState(false)
  const [momentaryRevealUntil, setMomentaryRevealUntil] = useState(0)
  const [autoPauseAtCueEnd, setAutoPauseAtCueEnd] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<PlaybackSpeedPreset>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenChromeVisible, setFullscreenChromeVisible] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [displayTime, setDisplayTime] = useState(0)
  const playbackTimeRef = useRef(0)
  const contentReviewPlaybackOriginRef = useRef<ContentReviewPlaybackOrigin | null>(null)

  const applyPlayerVolume = useCallback((value: number): void => {
    const next = clampVolume(value)
    playerVolumeRef.current = next
    setPlayerVolume(next)
    if (next > 0) {
      playerMutedRef.current = false
      setPlayerMuted(false)
    }

    const video = videoRef.current
    if (video) {
      setVideoVolume(video, next)
    }
  }, [])

  const applyPlayerMuted = useCallback((muted: boolean): void => {
    playerMutedRef.current = muted
    setPlayerMuted(muted)
    const video = videoRef.current
    if (video) {
      video.muted = muted
    }
  }, [])

  useEffect(() => {
    if (isYouTube) {
      return
    }
    const video = videoRef.current
    if (!video) {
      return
    }

    video.volume = playerVolumeRef.current
    video.muted = playerMutedRef.current
    const sync = (): void => {
      playerVolumeRef.current = video.volume
      playerMutedRef.current = video.muted
      setPlayerVolume(video.volume)
      setPlayerMuted(video.muted)
    }
    video.addEventListener('volumechange', sync)
    return () => video.removeEventListener('volumechange', sync)
  }, [isYouTube, videoSrc])
  const [bookmarkToastTrigger, setBookmarkToastTrigger] = useState<{
    bookmarkId: string
    sequence: number
    mode: 'activity' | 'editor'
    initiallyEditing?: boolean
  } | null>(null)
  const bookmarkToastSequenceRef = useRef(0)
  const previousBookmarkToastTimeRef = useRef(0)
  const triggeredBookmarkToastIdsRef = useRef(new Set<string>())
  const pendingYouTubeSeekRef = useRef<PendingPlaybackSeek | null>(null)
  const [youtubeReady, setYouTubeReady] = useState(false)
  const youtubeRangeGuardRef = useRef(new YouTubeRangePlaybackGuard())
  const fullscreenSkipInspectionRef = useRef<{ id: string; start: number } | null>(null)
  const [youtubeRangePlayback, setYouTubeRangePlayback] = useState<YouTubeRangePlaybackResult>({
    activeMutes: [],
    activeSkips: [],
    rangeMuted: false,
    effectiveMuted: false,
    skipTarget: null
  })
  const [isSeeking, setIsSeeking] = useState(false)
  const lastManualSeekTimeRef = useRef<number | null>(null)
  const requestedSeekTargetRef = useRef<number | null>(null)
  const pendingSeekTargetRef = useRef<number | null>(null)
  const seekAttemptAtRef = useRef<string | null>(null)
  const seekFailureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSeekFailureToastTargetRef = useRef<number | null>(null)
  const lastLoadedMediaSrcRef = useRef<string | null>(null)
  const [playbackOpacityTick, setPlaybackOpacityTick] = useState(0)
  const playbackOpacityFrameRef = useRef(0)
  const speedHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peekHudShownRef = useRef(false)
  const fullscreenHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [railActiveSection, setRailActiveSection] = useState<SidebarPanelId | null>(null)
  const [classicSidebarFallback, setClassicSidebarFallback] = useState(false)
  const [activeTrackTool, setActiveTrackTool] = useState<ActiveTrackTool | null>(null)
  const [playbackFailure, setPlaybackFailure] = useState<PlaybackFailure | null>(null)
  const [subtitleSheetOpen, setSubtitleSheetOpen] = useState(false)
  const [interactiveOverlayOpen, setInteractiveOverlayOpen] = useState(() => isInteractiveOverlayOpen())
  const subtitleSheetOpenRef = useRef(false)
  const subtitleImportTriggerRef = useRef<() => void>(() => {})
  const [layerManagerFilter, setLayerManagerFilter] = useState<FilterMode>('all')

  const applyAuthoritativeTime = useCallback((time: number, knownDuration?: number | null): void => {
    const normalized = normalizePlaybackTime(time, knownDuration)
    if (normalized === null) {
      return
    }
    playbackTimeRef.current = normalized
    setDisplayTime(normalized)
  }, [])

  const showBookmarkToast = useCallback((bookmarkId: string, initiallyEditing = false): void => {
    bookmarkToastSequenceRef.current += 1
    setBookmarkToastTrigger({
      bookmarkId,
      sequence: bookmarkToastSequenceRef.current,
      mode: initiallyEditing ? 'editor' : 'activity',
      ...(initiallyEditing ? { initiallyEditing: true } : {})
    })
  }, [])

  const dismissBookmarkToast = useCallback((): void => {
    setBookmarkToastTrigger(null)
  }, [])

  useEffect(() => {
    if (selectedItemId && selectedItemType && selectedItemType !== 'bookmark') {
      requestBookmarkToastDismissal()
    }
  }, [selectedItemId, selectedItemType])

  useEffect(() => subscribeBookmarkToast((bookmarkId) => {
    const state = useVeilStore.getState()
    const localVideoToastSupported =
      Boolean(state.videoSrc) &&
      state.mediaSource?.kind !== 'youtube' &&
      !isAudioMediaKind(state.mediaKind)
    const youtubeActivitySupported =
      state.mediaSource?.kind === 'youtube' &&
      !isAudioMediaKind(state.mediaKind)
    if (
      (localVideoToastSupported || youtubeActivitySupported) &&
      state.bookmarks.some((bookmark) => bookmark.id === bookmarkId)
    ) {
      showBookmarkToast(bookmarkId)
    }
  }), [isFullscreen, showBookmarkToast])

  const bookmarkToastSourceKey = isYouTube
    ? `youtube:${youtubeSource?.videoId ?? ''}`
    : videoSrc ?? 'none'

  useEffect(() => {
    dismissBookmarkToast()
    triggeredBookmarkToastIdsRef.current.clear()
    previousBookmarkToastTimeRef.current = playbackTimeRef.current
  }, [bookmarkToastSourceKey, dismissBookmarkToast])

  useEffect(() => {
    const previousTime = previousBookmarkToastTimeRef.current
    previousBookmarkToastTimeRef.current = displayTime
    if ((!videoSrc && !isYouTube) || isAudioMode) return

    if (displayTime < previousTime) {
      resetBackwardCrossingEligibility(
        triggeredBookmarkToastIdsRef.current,
        bookmarks,
        displayTime
      )
      return
    }

    const crossed = findCrossedBookmark({
      bookmarks,
      previousTime,
      currentTime: displayTime,
      alreadyTriggered: triggeredBookmarkToastIdsRef.current
    })
    if (crossed) {
      triggeredBookmarkToastIdsRef.current.add(crossed.id)
      showBookmarkToast(crossed.id)
    }
  }, [bookmarks, displayTime, isAudioMode, isYouTube, showBookmarkToast, videoSrc])

  useEffect(() => {
    setYouTubeReady(false)
    setPlaybackFailure(null)
    pendingYouTubeSeekRef.current = null
    if (youtubeSource) {
      applyAuthoritativeTime(0)
      setDuration(0)
      setIsPlaying(false)
    }
  }, [applyAuthoritativeTime, youtubeSource?.provider, youtubeSource?.videoId])

  useEffect(() => {
    if (!youtubeSource) return
    const videoId = youtubeSource.videoId
    const api = window.veil?.getYouTubeMetadata
    if (!api) {
      useVeilStore.getState().setYouTubeMetadataUnavailable(videoId, 'unavailable')
      return
    }
    let cancelled = false
    useVeilStore.getState().setYouTubeMetadataLoading(videoId)
    void api(videoId).then((result) => {
      const activeSource = useVeilStore.getState().mediaSource
      if (cancelled || !activeSource || !isYouTubeMediaSource(activeSource) ||
          activeSource.videoId !== videoId) return
      if (result.status === 'ready' && result.metadata) {
        useVeilStore.getState().mergeYouTubeMetadata({
          ...result.metadata,
          videoId,
          source: 'youtube-data-api',
          status: 'ready'
        })
        updateRecentYouTubeTitle(videoId, result.metadata.title)
      } else {
        useVeilStore.getState().setYouTubeMetadataUnavailable(
          videoId,
          result.status === 'error' ? 'error' : 'unavailable'
        )
      }
    }).catch(() => {
      if (!cancelled) useVeilStore.getState().setYouTubeMetadataUnavailable(videoId, 'error')
    })
    return () => { cancelled = true }
  }, [youtubeSource?.videoId])

  const groupSession = useTrackGroupSession()

  const inspectorModeActive =
    uiRefreshV1 &&
    !classicSidebarFallback &&
    (playerMode === 'edit' || isYouTube)
  const showInspectorChrome =
    inspectorModeActive &&
    !inspectorCollapsed
  const hideLegacySidebar = hideEditorChrome || inspectorModeActive || (isYouTube && uiRefreshV1)

  useEffect(() => {
    if (playerMode !== 'edit') {
      setClassicSidebarFallback(false)
      setActiveTrackTool(null)
    }
  }, [playerMode])

  useEffect(() => {
    mediaErrorNotifiedForSrcRef.current = null
    setPlaybackFailure(null)
    const video = videoRef.current
    if (!video || !videoSrc) {
      return
    }

    const onMediaError = (): void => {
      if (mediaErrorNotifiedForSrcRef.current === videoSrc) {
        return
      }
      mediaErrorNotifiedForSrcRef.current = videoSrc
      setPlaybackFailure(localPlaybackFailure(video.error?.code))
    }

    video.addEventListener('error', onMediaError)
    return () => {
      video.removeEventListener('error', onMediaError)
    }
  }, [videoSrc])

  useEffect(() => {
    mediaAutoplaySrcRef.current = null
    const video = activeLocalMediaElement
    if (!video || videoRef.current !== video || !videoSrc) {
      return
    }

    return armAuthoritativeMediaAutoplay({
      element: video,
      isAuthoritative: () => videoRef.current === video,
      hasAttempted: () => mediaAutoplaySrcRef.current === videoSrc,
      markAttempted: () => {
        mediaAutoplaySrcRef.current = videoSrc
      },
      requestPlay: () => video.play()
      // Autoplay rejection is intentionally silent and does not mutate playback UI.
    })
  }, [activeLocalMediaElement, videoSrc])

  useEffect(() => {
    if (classicSidebarFallback) {
      setActiveTrackTool(null)
    }
  }, [classicSidebarFallback])

  const openTrackTool = useCallback((tool: ActiveTrackTool): void => {
    if (tool === 'manual-builder') {
      runAppMenuAction('openManualTrackBuilder')
      return
    }
    if (tool === 'subtitles') {
      setSubtitleSheetOpen(true)
      return
    }
    setActiveTrackTool(tool)
  }, [])

  const openLayerManager = useCallback((filter: FilterMode = 'all'): void => {
    setLayerManagerFilter(filter)
    setActiveTrackTool('layers')
  }, [])

  const closeTrackTool = useCallback((): void => {
    setActiveTrackTool(null)
    setLayerManagerFilter('all')
  }, [])

  const handleTimelineChromeHide = useCallback((): void => {
    onTimelineVisibleChange(false)
  }, [onTimelineVisibleChange])

  const maskFadeAnimationNeeded = useMemo(
    () => maskNeedsPlaybackOpacityAnimation(masks),
    [masks]
  )

  const sessionKey = useMemo(
    () => buildTrackSessionFingerprint(videoFileName, videoMetadata?.duration ?? 0),
    [videoFileName, videoMetadata?.duration]
  )
  const loopStorageKey = `veil:loop:${sessionKey}`

  const [sessionLoop, setSessionLoop] = useState<SessionLoop>(() =>
    readSessionLoop(`veil:loop:${buildTrackSessionFingerprint(null, 0)}`)
  )

  useEffect(() => {
    setSessionLoop(readSessionLoop(loopStorageKey))
  }, [loopStorageKey])

  const persistSessionLoop = useCallback(
    (loop: SessionLoop, options?: { showHud?: boolean }): void => {
      const wasEnabled = sessionLoop.enabled
      setSessionLoop(loop)
      writeSessionLoop(loopStorageKey, loop)
      if (options?.showHud && loop.enabled && !wasEnabled) {
        showPlaybackHud(t('player.hud.loop'))
      }
    },
    [loopStorageKey, sessionLoop.enabled]
  )

  const { activeMasks, activeMutes, activeSkips, reconcileNow, resetSkipLatch, suppressSkipOnce, resetPlaybackEngine } =
    usePlaybackLoop({ videoRef })

  const resetYouTubeSkipLatch = useCallback((): void => {
    youtubeRangeGuardRef.current.resetSkipLatch()
  }, [])

  useEffect(() => {
    if (!isYouTube || !youtubeSource) {
      youtubeRangeGuardRef.current.reset()
      setYouTubeRangePlayback({
        activeMutes: [],
        activeSkips: [],
        rangeMuted: false,
        effectiveMuted: playerMutedRef.current || playerVolumeRef.current === 0,
        skipTarget: null
      })
      return
    }

    const inspection = fullscreenSkipInspectionRef.current
    if (inspection && Math.abs(displayTime - inspection.start) > FULLSCREEN_SKIP_INSPECTION_RELEASE_SECONDS) {
      fullscreenSkipInspectionRef.current = null
    }

    const result = youtubeRangeGuardRef.current.reconcile({
      sourceKey: youtubeSource.videoId,
      loadGeneration: youtubeLoadGeneration,
      ready: youtubeReady,
      currentTime: displayTime,
      duration,
      playing: isPlaying,
      userMuted: playerMuted,
      volume: playerVolume,
      globalOffsetSeconds,
      mutes,
      skips
    })
    const suppressInspectionSkip = Boolean(
      inspection &&
      Math.abs(displayTime - inspection.start) <= FULLSCREEN_SKIP_INSPECTION_RELEASE_SECONDS &&
      result.activeSkips.some((skip) => skip.id === inspection.id)
    )
    setYouTubeRangePlayback(suppressInspectionSkip ? { ...result, skipTarget: null } : result)

    if (result.skipTarget !== null) {
      if (suppressInspectionSkip) {
        youtubeRangeGuardRef.current.resetSkipLatch()
        return
      }
      pendingYouTubeSeekRef.current = { target: result.skipTarget, requestedAt: Date.now() }
      youtubeStageRef.current?.seekTo(result.skipTarget)
      applyAuthoritativeTime(result.skipTarget, duration)
    }
  }, [
    applyAuthoritativeTime,
    displayTime,
    duration,
    globalOffsetSeconds,
    isPlaying,
    isYouTube,
    mutes,
    playerMuted,
    playerVolume,
    skips,
    youtubeLoadGeneration,
    youtubeReady,
    youtubeSource
  ])

  const virtualPlayback = useMemo(() => {
    if (videoSrc) {
      return null
    }
    const executable = filterExecutableActions(playbackCapabilities, masks, mutes, skips)
    return reconcilePlayback(
      {
        items: buildReconcileItems(executable.masks, executable.mutes, executable.skips),
        globalOffsetSeconds
      },
      displayTime
    )
  }, [displayTime, globalOffsetSeconds, masks, mutes, playbackCapabilities, skips, videoSrc])

  const playbackActiveMasks = isYouTube ? [] : videoSrc ? activeMasks : (virtualPlayback?.activeMasks ?? [])
  const playbackActiveMutes = isYouTube ? youtubeRangePlayback.activeMutes : videoSrc ? activeMutes : (virtualPlayback?.activeMutes ?? [])
  const playbackActiveSkips = isYouTube ? youtubeRangePlayback.activeSkips : videoSrc ? activeSkips : (virtualPlayback?.activeSkips ?? [])
  const effectivePlayerMuted = isYouTube ? youtubeRangePlayback.effectiveMuted : playerMuted

  useWorkflowPlayback({
    videoRef,
    subtitleCues,
    autoPauseAtCueEnd,
    sessionLoop,
    enabled: Boolean(videoSrc)
  })

  const handleAfterTimingMutation = useCallback((): void => {
    resetYouTubeSkipLatch()
    afterTimingMutation(resetSkipLatch, reconcileNow)
  }, [reconcileNow, resetSkipLatch, resetYouTubeSkipLatch])

  const reconcileAfterStoreUpdate = useCallback((): void => {
    requestAnimationFrame(() => {
      reconcileNow()
    })
  }, [reconcileNow])

  useEffect(() => {
    if (!trackMutatedRef) {
      return
    }
    trackMutatedRef.current = () => {
      handleAfterTimingMutation()
      useVeilStore.getState().validateAndFixSelection()
    }
    return () => {
      trackMutatedRef.current = null
    }
  }, [handleAfterTimingMutation, trackMutatedRef])

  useEffect(() => {
    if (!videoSrc) {
      return
    }
    resetPlaybackEngine()
  }, [resetPlaybackEngine, videoSrc])

  useEffect(() => {
    useVeilStore.getState().validateAndFixSelection()
  }, [masks, mutes, skips])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) {
      return
    }

    const observer = new ResizeObserver(() => {
      reconcileNow()
    })
    observer.observe(stage)

    return () => {
      observer.disconnect()
    }
  }, [reconcileNow, videoSrc])

  useEffect(() => {
    const onFullscreenChange = (): void => {
      const stage = stageRef.current
      const active = stage !== null && document.fullscreenElement === stage
      setIsFullscreen(active)
      if (!active) {
        setFullscreenChromeVisible(false)
        setDrawerOpen(false)
      }
      reconcileNow()
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [reconcileNow])

  const activeMaskIds = useMemo(
    () => new Set(playbackActiveMasks.map((mask) => mask.id)),
    [playbackActiveMasks]
  )

  const activeMuteIds = useMemo(
    () => new Set(playbackActiveMutes.map((mute) => mute.id)),
    [playbackActiveMutes]
  )

  const activeSkipIds = useMemo(
    () => new Set(playbackActiveSkips.map((skip) => skip.id)),
    [playbackActiveSkips]
  )

  const activeLayerItems = useMemo((): ActiveLayerSummary[] => {
    const rows = buildLayerListRows(masks, mutes, skips, bookmarks)
    return rows
      .filter((row) => {
        if (row.type === 'mask') {
          return activeMaskIds.has(row.item.id)
        }
        if (row.type === 'mute') {
          return activeMuteIds.has(row.item.id)
        }
        if (row.type === 'skip') {
          return activeSkipIds.has(row.item.id)
        }
        return false
      })
      .map((row) => ({
        id: row.item.id,
        type: row.type,
        label: row.label,
        start: row.item.start,
        end: row.item.end,
        notes: row.type === 'bookmark' ? row.item.notes : undefined,
        enabled: row.item.enabled
      }))
  }, [activeMaskIds, activeMuteIds, activeSkipIds, bookmarks, masks, mutes, skips])

  const totalLayerCount = masks.length + mutes.length + skips.length + bookmarks.length

  const allLayerItems = useMemo((): ActiveLayerSummary[] => {
    return buildLayerListRows(masks, mutes, skips, bookmarks).map((row) => ({
      id: row.item.id,
      type: row.type,
      label: row.label,
      start: row.item.start,
      end: row.item.end,
      notes: row.type === 'bookmark' ? row.item.notes : undefined,
      enabled: row.item.enabled
    }))
  }, [bookmarks, masks, mutes, skips])

  const [fullscreenLayerFilter, setFullscreenLayerFilter] = useState<FullscreenLayerFilter>(() =>
    resolveFullscreenLayerFilter(masks.length + mutes.length + skips.length + bookmarks.length)
  )

  const fullscreenLayerItems =
    fullscreenLayerFilter === 'all' ? allLayerItems : activeLayerItems

  const handleFullscreenLayerFilterChange = useCallback((filter: FullscreenLayerFilter): void => {
    setFullscreenLayerFilter(filter)
    writeFullscreenLayerFilter(filter)
  }, [])

  const applyPlaybackRate = useCallback((rate: PlaybackSpeedPreset, options?: { showHud?: boolean }): void => {
    const video = videoRef.current
    setPlaybackRate(rate)
    if (isYouTube) {
      youtubeStageRef.current?.setPlaybackRate(rate)
    } else if (video) {
      video.playbackRate = rate
    }
    if (options?.showHud === false) return
    incrementWorkflowMetric('speedChange')
    if (speedHudTimerRef.current) {
      clearTimeout(speedHudTimerRef.current)
    }
    speedHudTimerRef.current = setTimeout(() => {
      showPlaybackHud(`${rate}×`)
      speedHudTimerRef.current = null
    }, 150)
  }, [isYouTube])

  const toggleSidebar = useCallback((): void => {
    onSidebarCollapsedChange(!sidebarCollapsed)
  }, [onSidebarCollapsedChange, sidebarCollapsed])

  const toggleTimeline = useCallback((): void => {
    onTimelineVisibleChange(!timelineVisible)
  }, [onTimelineVisibleChange, timelineVisible])

  useEffect(() => {
    return registerEnsureSidebarVisible(() => {
      if (requestUiRefreshEditMode()) {
        return
      }
      onSidebarCollapsedChange(false)
    })
  }, [onSidebarCollapsedChange])

  useEffect(() => {
    return registerUiRefreshPanelRouting({
      openTrackTool,
      enterEditMode: () => {
        setInspectorCollapsed(false)
        setPlayerModeEditWithAudio(
          videoRef.current && Number.isFinite(videoRef.current.currentTime)
            ? videoRef.current.currentTime
            : displayTime
        )
      },
      isAdvancedSidebarActive: () => classicSidebarFallback
    })
  }, [classicSidebarFallback, displayTime, openTrackTool])

  subtitleSheetOpenRef.current = subtitleSheetOpen

  useEffect(() => subscribeInteractiveOverlay(() => {
    setInteractiveOverlayOpen(isInteractiveOverlayOpen())
  }), [])

  useEffect(() => {
    return registerSubtitleSheetBridge({
      open: () => setSubtitleSheetOpen(true),
      close: () => setSubtitleSheetOpen(false),
      isOpen: () => subtitleSheetOpenRef.current,
      triggerImport: () => subtitleImportTriggerRef.current()
    })
  }, [])

  const subtitleRevealActive = holdReveal
  const momentaryRevealActive = isMomentaryRevealActive(momentaryRevealUntil)
  const hasPerCueSubtitleMasks = useMemo(
    () => masks.some((mask) => mask.source?.kind === 'srt'),
    [masks]
  )
  const hideRegionCover =
    isRegionCoverMode(subtitleCoverMode) && (subtitleRevealActive || momentaryRevealActive)

  useEffect(() => {
    if (!maskFadeAnimationNeeded || !videoSrc) {
      return
    }

    let rafId = 0
    const tick = (): void => {
      const video = videoRef.current
      if (video && Number.isFinite(video.currentTime)) {
        const frame = Math.floor(video.currentTime * 30)
        if (frame !== playbackOpacityFrameRef.current) {
          playbackOpacityFrameRef.current = frame
          setPlaybackOpacityTick(video.currentTime)
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [maskFadeAnimationNeeded, videoSrc])

  const masksToRender = useMemo((): MaskRenderSpec[] => {
    if (!canRenderMaskOverlays(mediaKind)) {
      return []
    }

    if (holdReveal || fullReveal) {
      return []
    }

    const selectedMask =
      selectedItemType === 'mask' && selectedItemId
        ? (masks.find((mask) => mask.id === selectedItemId) ?? null)
        : null

    if (!videoSrc) {
      const activeIds = new Set(playbackActiveMasks.map((mask) => mask.id))
      if (selectedMask) {
        activeIds.add(selectedMask.id)
      }

      return masks
        .filter((mask) => {
          if (!activeIds.has(mask.id)) {
            return false
          }
          if (mask.id === selectedMask?.id) {
            return true
          }
          return isTrackItemEnabled(mask)
        })
        .map((mask) => ({ mask, effectiveOpacity: 1 }))
    }

    const adjustedTime = displayTime + globalOffsetSeconds
    let specs: MaskRenderSpec[]

    if (reviewIsolation) {
      if (!selectedMask) {
        specs = []
      } else if (maskFadeAnimationNeeded) {
        specs = filterMasksForPlaybackRender([selectedMask], adjustedTime)
      } else {
        specs = [{ mask: selectedMask, effectiveOpacity: 1 }]
      }
    } else if (maskFadeAnimationNeeded) {
      specs = filterMasksForPlaybackRender(masks, adjustedTime)
      if (
        selectedMask &&
        !specs.some((spec) => spec.mask.id === selectedMask.id)
      ) {
        const fadeEntries = filterMasksForPlaybackRender([selectedMask], adjustedTime)
        if (fadeEntries.length > 0) {
          specs = [...specs, fadeEntries[0]]
        }
      }
    } else {
      const activeIds = new Set(playbackActiveMasks.map((mask) => mask.id))
      if (selectedMask) {
        activeIds.add(selectedMask.id)
      }

      specs = masks
        .filter((mask) => {
          if (!activeIds.has(mask.id)) {
            return false
          }
          if (mask.id === selectedMask?.id) {
            return true
          }
          return isTrackItemEnabled(mask)
        })
        .map((mask) => ({ mask, effectiveOpacity: 1 }))
    }

    if (momentaryRevealActive && hasPerCueSubtitleMasks) {
      const activeSrtMaskId = findActiveSubtitleMaskId(masks, subtitleCues, displayTime)
      if (activeSrtMaskId) {
        specs = specs.filter((spec) => spec.mask.id !== activeSrtMaskId)
      }
    }

    return specs
  }, [
    playbackActiveMasks,
    displayTime,
    fullReveal,
    globalOffsetSeconds,
    hasPerCueSubtitleMasks,
    holdReveal,
    maskFadeAnimationNeeded,
    masks,
    momentaryRevealActive,
    playbackOpacityTick,
    reviewIsolation,
    selectedItemId,
    selectedItemType,
    subtitleCues,
    videoSrc,
    mediaKind
  ])

  useEffect(() => {
    if (holdReveal && !peekHudShownRef.current) {
      peekHudShownRef.current = true
      showPlaybackHud(t('player.hud.peek'))
    }
    if (!holdReveal) {
      peekHudShownRef.current = false
    }
  }, [holdReveal])

  useEffect(() => {
    if (!videoSrc) {
      setReviewIsolation(false)
      setFullReveal(false)
      setMomentaryRevealUntil(0)
    }
  }, [videoSrc])

  useEffect(() => {
    if (masks.length + mutes.length + skips.length === 0) {
      setReviewIsolation(false)
    }
  }, [masks.length, mutes.length, skips.length])

  const triggerMomentaryReveal = useCallback((): void => {
    setMomentaryRevealUntil(Date.now() + MOMENTARY_REVEAL_MS)
    incrementWorkflowMetric('holdReveal')
    showPlaybackHud(t('player.hud.reveal'))
  }, [])

  const seekToSubtitleCue = useCallback(
    (direction: -1 | 1): void => {
      const video = videoRef.current
      if (!video || subtitleCues.length === 0) {
        return
      }
      const time = video.currentTime
      const index =
        direction < 0
          ? getPreviousCueIndex(subtitleCues, time)
          : getNextCueIndex(subtitleCues, time)
      if (index < 0) {
        return
      }
      resetSkipLatch()
      const previousTime = video.currentTime
      seekVideoToCue(video, subtitleCues, index)
      if (Math.abs(video.currentTime - previousTime) > 0.001) {
        requestBookmarkToastDismissal()
      }
      applyAuthoritativeTime(video.currentTime, duration)
      reconcileNow()
    },
    [applyAuthoritativeTime, duration, reconcileNow, resetSkipLatch, subtitleCues]
  )

  const handleSmartReplay = useCallback((): void => {
    const video = videoRef.current
    if (!video) {
      return
    }
    resetSkipLatch()
    const previousTime = video.currentTime
    smartReplay(video, subtitleCues)
    if (Math.abs(video.currentTime - previousTime) > 0.001) {
      requestBookmarkToastDismissal()
    }
    setIsPlaying(true)
    incrementWorkflowMetric('quickReplay')
    showPlaybackHud(t('player.hud.replay'))
    reconcileNow()
  }, [reconcileNow, resetSkipLatch, subtitleCues])

  const handleFixedReplay = useCallback((): void => {
    const video = videoRef.current
    if (!video) {
      return
    }
    resetSkipLatch()
    const previousTime = video.currentTime
    quickReplay(video)
    if (Math.abs(video.currentTime - previousTime) > 0.001) {
      requestBookmarkToastDismissal()
    }
    setIsPlaying(true)
    incrementWorkflowMetric('quickReplay')
    reconcileNow()
  }, [reconcileNow, resetSkipLatch])

  const getCurrentVideoTime = useCallback((): number => {
    return playbackTimeRef.current
  }, [])

  const clearSeekFailureTimer = useCallback((): void => {
    if (seekFailureTimerRef.current) {
      clearTimeout(seekFailureTimerRef.current)
      seekFailureTimerRef.current = null
    }
  }, [])

  const finishPendingSeekFromEvent = useCallback((eventName: 'seeked' | 'timeupdate'): void => {
    const video = videoRef.current
    const pendingTarget = pendingSeekTargetRef.current
    if (!video || pendingTarget === null) {
      return
    }

    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : null
    const delta = currentTime === null ? null : Math.abs(currentTime - pendingTarget)
    const matched = delta !== null && delta <= SEEK_SUCCESS_TOLERANCE_SECONDS
    updateSeekDebug({
      ...buildMediaSeekDebug(video),
      videoCurrentTime: currentTime,
      pendingSeekTarget: matched ? null : pendingTarget,
      lastSeekedEventTime: eventName === 'seeked' ? currentTime : undefined,
      lastSeekedEventResult: `${eventName}: target=${pendingTarget.toFixed(3)} actual=${currentTime?.toFixed(3) ?? 'n/a'} delta=${delta?.toFixed(3) ?? 'n/a'} ${matched ? 'ok' : 'pending'}`
    })

    if (!matched) {
      return
    }

    clearSeekFailureTimer()
    pendingSeekTargetRef.current = null
    updateSeekDebug({ pendingSeekTarget: null })
  }, [clearSeekFailureTimer])

  const ensureEditModeForShortcut = useCallback((): void => {
    if (uiRefreshV1 && usePlayerModeStore.getState().playerMode !== 'edit') {
      const liveTime =
        isYouTube
          ? playbackTimeRef.current
          : videoRef.current && Number.isFinite(videoRef.current.currentTime)
          ? videoRef.current.currentTime
          : displayTime
      setPlayerModeEditWithAudio(liveTime)
    }
  }, [displayTime, isYouTube, uiRefreshV1])

  const addMaskAtCurrentTime = useCallback((): void => {
    if (!playbackCapabilities.canCreateMask) {
      pushWarningToast(isYouTube ? t('youtube.muteSkipUnavailable') : userMessages.masksUnavailableForAudio)
      return
    }
    ensureEditModeForShortcut()
    const start = getCurrentVideoTime()
    addMask(start, start + playbackActivityPreferences.defaultMaskDurationSeconds)
    reconcileAfterStoreUpdate()
  }, [
    addMask,
    ensureEditModeForShortcut,
    getCurrentVideoTime,
    isYouTube,
    playbackCapabilities.canCreateMask,
    playbackActivityPreferences.defaultMaskDurationSeconds,
    reconcileAfterStoreUpdate
  ])

  const addMuteAtCurrentTime = useCallback((): void => {
    if (!playbackCapabilities.canCreateMuteRange) {
      pushWarningToast(t('youtube.muteSkipUnavailable'))
      return
    }
    ensureEditModeForShortcut()
    const start = getCurrentVideoTime()
    addMute(start, start + playbackActivityPreferences.defaultMuteDurationSeconds)
    reconcileAfterStoreUpdate()
  }, [
    addMute,
    ensureEditModeForShortcut,
    getCurrentVideoTime,
    playbackCapabilities.canCreateMuteRange,
    playbackActivityPreferences.defaultMuteDurationSeconds,
    reconcileAfterStoreUpdate
  ])

  const addSkipAtCurrentTime = useCallback((): void => {
    if (!playbackCapabilities.canCreateSkipRange) {
      pushWarningToast(t('youtube.muteSkipUnavailable'))
      return
    }
    ensureEditModeForShortcut()
    const start = getCurrentVideoTime()
    addSkip(start, start + playbackActivityPreferences.defaultSkipDurationSeconds)
    reconcileAfterStoreUpdate()
  }, [
    addSkip,
    ensureEditModeForShortcut,
    getCurrentVideoTime,
    playbackCapabilities.canCreateSkipRange,
    playbackActivityPreferences.defaultSkipDurationSeconds,
    reconcileAfterStoreUpdate
  ])

  const addBookmarkAtCurrentTime = useCallback((intent?: InspectorSelectionNavigationIntent): void => {
    if (!canCreatePlaybackPositionBookmark(isYouTube ? 'youtube' : 'local', youtubeReady)) {
      pushWarningToast(t('youtube.bookmarkPlaybackUnavailable'))
      return
    }
    ensureEditModeForShortcut()
    const timestamp = resolveBookmarkTimestamp(getCurrentVideoTime(), duration)
    if (timestamp === null) {
      return
    }
    addBookmark({ start: timestamp })
    const state = useVeilStore.getState()
    const createdBookmarkId = state.selectedItemType === 'bookmark'
      ? state.selectedItemId
      : null
    if (createdBookmarkId && intent?.preserveInspectorTab) {
      preserveInspectorTabForSelection(createdBookmarkId, 'bookmark')
    }
    if (createdBookmarkId && !isAudioMode && (videoSrc || isYouTube)) {
      showBookmarkToast(createdBookmarkId, true)
    } else if (!intent?.preserveInspectorTab) {
      requestOpenSidebarPanel('selected')
    }
    reconcileAfterStoreUpdate()
  }, [addBookmark, duration, ensureEditModeForShortcut, getCurrentVideoTime, isAudioMode, isYouTube, reconcileAfterStoreUpdate, showBookmarkToast, videoSrc, youtubeReady])

  const retryYouTubePlayback = useCallback((): void => {
    if (!retryActiveYouTubePlayback(playbackFailure)) {
      return
    }
    setPlaybackFailure(null)
    setYouTubeReady(false)
    pendingYouTubeSeekRef.current = null
  }, [playbackFailure])

  const openFailedYouTubeExternally = useCallback((): void => {
    openYouTubeFailureExternally(playbackFailure)
  }, [playbackFailure])

  const closeFailedYouTubeMedia = useCallback((): void => {
    runAppMenuAction('closeVideo')
  }, [])

  const manualSeek = useCallback(
    (time: number, source: SeekDebugSource = 'manualSeek', targetBookmarkId?: string, inspectionSkipId?: string): void => {
      fullscreenSkipInspectionRef.current = null
      if (isYouTube) {
        if (!youtubeReady) {
          return
        }
        const ytDuration =
          duration > 0 ? duration : (youtubeStageRef.current?.getDuration() ?? 0)
        const safeYtDuration = normalizePlaybackDuration(ytDuration)
        const virtualTime = normalizePlaybackTime(time, safeYtDuration)
        if (virtualTime === null) {
          return
        }
        requestBookmarkToastDismissal(targetBookmarkId)
        resetSkipLatch()
        resetYouTubeSkipLatch()
        if (inspectionSkipId) {
          fullscreenSkipInspectionRef.current = { id: inspectionSkipId, start: virtualTime }
        }
        lastManualSeekTimeRef.current = virtualTime
        requestedSeekTargetRef.current = virtualTime
        pendingSeekTargetRef.current = null
        clearSeekFailureTimer()
        pendingYouTubeSeekRef.current = { target: virtualTime, requestedAt: Date.now() }
        youtubeStageRef.current?.seekTo(virtualTime)
        recordManualSeekDebug(source, virtualTime)
        applyAuthoritativeTime(virtualTime, safeYtDuration)
        updateSeekDebug({
          requestedSeekTarget: virtualTime,
          pendingSeekTarget: null,
          displayTime: virtualTime,
          duration: safeYtDuration,
          paused: !isPlaying
        })
        return
      }

      const video = videoRef.current
      const mediaDuration = video && Number.isFinite(video.duration) ? video.duration : 0
      const safeDuration = resolveActiveLocalMediaDuration(mediaDuration, duration)
      if (!video || !Number.isFinite(safeDuration) || safeDuration <= 0) {
        if (!video && Number.isFinite(safeDuration) && safeDuration > 0) {
          const virtualTime = Math.min(Math.max(Number.isFinite(time) ? time : 0, 0), safeDuration)
          requestBookmarkToastDismissal(targetBookmarkId)
          resetSkipLatch()
          if (inspectionSkipId) suppressSkipOnce(inspectionSkipId)
          lastManualSeekTimeRef.current = virtualTime
          requestedSeekTargetRef.current = virtualTime
          pendingSeekTargetRef.current = null
          clearSeekFailureTimer()
          recordManualSeekDebug(source, virtualTime)
          applyAuthoritativeTime(virtualTime, safeDuration)
          updateSeekDebug({
            requestedSeekTarget: virtualTime,
            pendingSeekTarget: null,
            displayTime: virtualTime,
            duration: safeDuration,
            paused: null
          })
          return
        }
        updateSeekDebug({
          requestedSeekTarget: Number.isFinite(time) ? time : null,
          pendingSeekTarget: null,
          duration: Number.isFinite(safeDuration) ? safeDuration : null,
          paused: video?.paused ?? null,
          ...(video ? buildMediaSeekDebug(video) : {})
        })
        markSeekDebugEvent(`seek skipped source=${source} reason=duration_not_finite target=${Number.isFinite(time) ? time.toFixed(3) : 'n/a'}`)
        return
      }

      if (video.readyState < HAVE_METADATA_READY_STATE) {
        updateSeekDebug({
          requestedSeekTarget: Number.isFinite(time) ? time : null,
          pendingSeekTarget: null,
          duration: safeDuration,
          paused: video.paused,
          ...buildMediaSeekDebug(video)
        })
        markSeekDebugEvent(`seek deferred source=${source} reason=metadata_not_ready readyState=${video.readyState}`)
        const requestedElement = video
        const requestedSource = videoSrc
        video.addEventListener('loadedmetadata', () => {
          if (!isDeferredSeekStillCurrent({
            requestedElement,
            activeElement: videoRef.current,
            requestedSource,
            activeSource: useVeilStore.getState().videoSrc
          })) return
          manualSeek(time, source, targetBookmarkId, inspectionSkipId)
        }, { once: true })
        return
      }

      const requestedTime = Math.min(Math.max(Number.isFinite(time) ? time : 0, 0), safeDuration)
      const seekableRanges = readSeekableRanges(video)
      const seekableTarget = clampTargetToSeekableRange(requestedTime, seekableRanges)
      const clampedTime = Math.min(Math.max(seekableTarget.target, 0), safeDuration)
      const seekAttemptAt = new Date().toISOString()

      requestBookmarkToastDismissal(targetBookmarkId)
      resetSkipLatch()
      if (inspectionSkipId) suppressSkipOnce(inspectionSkipId)
      lastManualSeekTimeRef.current = clampedTime
      requestedSeekTargetRef.current = requestedTime
      pendingSeekTargetRef.current = clampedTime
      seekAttemptAtRef.current = seekAttemptAt
      clearSeekFailureTimer()
      recordManualSeekDebug(source, clampedTime)
      updateSeekDebug({
        ...buildMediaSeekDebug(video, seekableTarget.within),
        requestedSeekTarget: requestedTime,
        pendingSeekTarget: clampedTime,
        seekAttemptAt,
        lastSeekedEventResult: null
      })
      setCurrentTimeDebug(video, source, clampedTime)
      applyAuthoritativeTime(clampedTime, safeDuration)
      updateSeekDebug({ displayTime: clampedTime, duration: safeDuration, paused: video?.paused ?? null })
      seekFailureTimerRef.current = setTimeout(() => {
        const currentVideo = videoRef.current
        const pendingTarget = pendingSeekTargetRef.current
        if (!currentVideo || pendingTarget === null) {
          return
        }
        const actual = Number.isFinite(currentVideo.currentTime) ? currentVideo.currentTime : null
        const delta = actual === null ? null : Math.abs(actual - pendingTarget)
        const failed = delta === null || delta > SEEK_SUCCESS_TOLERANCE_SECONDS
        updateSeekDebug({
          ...buildMediaSeekDebug(currentVideo),
          videoCurrentTime: actual,
          pendingSeekTarget: failed ? pendingTarget : null,
          lastSeekedEventResult: `timeout: target=${pendingTarget.toFixed(3)} actual=${actual?.toFixed(3) ?? 'n/a'} delta=${delta?.toFixed(3) ?? 'n/a'} ${failed ? 'failed' : 'ok'}`
        })
        if (!failed) {
          pendingSeekTargetRef.current = null
          return
        }
        if (
          lastSeekFailureToastTargetRef.current === null ||
          Math.abs(lastSeekFailureToastTargetRef.current - pendingTarget) > SEEK_SUCCESS_TOLERANCE_SECONDS
        ) {
          lastSeekFailureToastTargetRef.current = pendingTarget
          pushWarningToast(userMessages.seekFailed)
        }
      }, SEEK_FAILURE_TIMEOUT_MS)
      requestAnimationFrame(() => {
        reconcileNow()
      })
    },
    [applyAuthoritativeTime, clearSeekFailureTimer, duration, isPlaying, isYouTube, reconcileNow, resetSkipLatch, resetYouTubeSkipLatch, suppressSkipOnce, youtubeReady]
  )

  const previewContentReviewFinding = useCallback((time: number): void => {
    manualSeek(time, 'other')
    if (isYouTube) {
      try {
        youtubeStageRef.current?.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
      return
    }

    const video = videoRef.current
    if (!video) return
    void video
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }, [isYouTube, manualSeek])

  const stopContentReviewPreview = useCallback((): void => {
    if (isYouTube) {
      youtubeStageRef.current?.pause()
      setIsPlaying(false)
      return
    }

    videoRef.current?.pause()
    setIsPlaying(false)
  }, [isYouTube])

  const captureContentReviewPlaybackSession = useCallback((): void => {
    contentReviewPlaybackOriginRef.current = captureContentReviewPlaybackOrigin(
      contentReviewPlaybackOriginRef.current,
      playbackTimeRef.current,
      isPlaying
    )
  }, [isPlaying])

  const restoreContentReviewPlaybackSession = useCallback((): void => {
    const origin = contentReviewPlaybackOriginRef.current
    if (!origin) return
    contentReviewPlaybackOriginRef.current = null

    manualSeek(origin.time, 'other')
    if (isYouTube) {
      if (origin.wasPlaying) {
        try {
          youtubeStageRef.current?.play()
          setIsPlaying(true)
        } catch {
          setIsPlaying(false)
        }
      } else {
        youtubeStageRef.current?.pause()
        setIsPlaying(false)
      }
      return
    }

    const video = videoRef.current
    if (!video) return
    if (!origin.wasPlaying) {
      video.pause()
      setIsPlaying(false)
      return
    }
    void video
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }, [isYouTube, manualSeek])

  useEffect(() => {
    if (isYouTube) return
    lastManualSeekTimeRef.current = null
    requestedSeekTargetRef.current = null
    pendingSeekTargetRef.current = null
    seekAttemptAtRef.current = null
    clearSeekFailureTimer()
    setIsSeeking(false)
    setIsPlaying(false)
    setDuration(0)
    applyAuthoritativeTime(0)
    updateSeekDebug({ requestedSeekTarget: null, pendingSeekTarget: null, displayTime: 0 })
  }, [applyAuthoritativeTime, clearSeekFailureTimer, isYouTube, videoSrc])

  const seekBySeconds = useCallback(
    (offsetSeconds: number): void => {
      if (isYouTube) {
        const currentTime = getCurrentVideoTime()
        const mediaDuration =
          duration > 0 ? duration : (youtubeStageRef.current?.getDuration() ?? 0)
        seekRelative({
          currentTime,
          duration: mediaDuration,
          offsetSeconds,
          seek: (target) => manualSeek(target, 'other')
        })
        return
      }
      const video = videoRef.current
      const currentTime =
        video && Number.isFinite(video.currentTime) ? video.currentTime : displayTime
      const mediaDuration =
        video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration
      seekRelative({
        currentTime,
        duration: mediaDuration,
        offsetSeconds,
        seek: (target) => manualSeek(target, 'other')
      })
    },
    [displayTime, duration, getCurrentVideoTime, isYouTube, manualSeek]
  )

  const syncDisplayTime = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    applyAuthoritativeTime(video.currentTime, duration)
    updateSeekDebug({ displayTime: video.currentTime, videoCurrentTime: video.currentTime, paused: video.paused })
  }, [applyAuthoritativeTime, duration])

  const onLoadedMetadata = (): void => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const pending = readAudioPlaybackTransition(videoSrc)
    const mediaSrcChanged =
      lastLoadedMediaSrcRef.current !== null && lastLoadedMediaSrcRef.current !== videoSrc
    lastLoadedMediaSrcRef.current = videoSrc

    const elementTime = Number.isFinite(video.currentTime) ? video.currentTime : 0
    const shouldRestore =
      Boolean(pending) ||
      shouldRestorePlayheadAfterRemount({
        mediaSrcChanged,
        elementTime,
        preservedTime: displayTime
      })
    const restore = pending ??
      (shouldRestore
        ? {
            time: displayTime,
            wasPlaying: isPlaying,
            playbackRate,
            mediaSrc: videoSrc
          }
        : null)

    resetPlaybackEngine()
    markSeekDebugEvent('loadmetadata')

    const safeDuration = Number.isFinite(video.duration) ? video.duration : 0
    setDuration(safeDuration)

    if (restore) {
      const target = clampPlaybackRestoreTime(restore.time, safeDuration)
      const onRestoreSeeked = (): void => {
        if (Math.abs(video.currentTime - target) > 0.2) {
          return
        }
        video.removeEventListener('seeked', onRestoreSeeked)
        if (pending) {
          clearAudioPlaybackTransition()
        }
        applyAuthoritativeTime(video.currentTime, safeDuration)
      }
      video.addEventListener('seeked', onRestoreSeeked)
      try {
        video.currentTime = target
      } catch {
        // Some engines reject seeks before readyState is sufficient; retry below.
      }
      applyAuthoritativeTime(target, safeDuration)
      const rate = restore.playbackRate
      if (Number.isFinite(rate) && rate > 0) {
        applyPlaybackRate(rate as PlaybackSpeedPreset, { showHud: false })
      }
      updateSeekDebug({
        videoCurrentTime: target,
        displayTime: target,
        duration: safeDuration,
        paused: !restore.wasPlaying,
        lastCurrentTimeSetter: `loadmetadata-restore: ${target.toFixed(3)}`,
        ...buildMediaSeekDebug(video)
      })

      const finishRestore = (): void => {
        if (Math.abs(video.currentTime - target) > 0.2) {
          try {
            video.currentTime = target
          } catch {
            /* ignore */
          }
        }
        applyAuthoritativeTime(Number.isFinite(video.currentTime) ? video.currentTime : target, safeDuration)
        if (restore.wasPlaying) {
          void video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false))
        } else {
          video.pause()
          setIsPlaying(false)
        }
        reconcileNow()
      }

      if (video.readyState >= 1) {
        finishRestore()
      } else {
        const onReady = (): void => {
          video.removeEventListener('loadeddata', onReady)
          video.removeEventListener('canplay', onReady)
          finishRestore()
        }
        video.addEventListener('loadeddata', onReady)
        video.addEventListener('canplay', onReady)
      }
    } else {
      applyAuthoritativeTime(elementTime, safeDuration)
      updateSeekDebug({
        videoCurrentTime: elementTime,
        displayTime: elementTime,
        duration: safeDuration,
        paused: video.paused,
        lastCurrentTimeSetter: `loadmetadata: ${elementTime.toFixed(3)}`,
        ...buildMediaSeekDebug(video)
      })
      setIsPlaying(false)
      applyPlaybackRate(1, { showHud: false })
      reconcileNow()
    }

    const store = useVeilStore.getState()
    const fileName = store.videoFileName ?? 'video'
    const pickedBytes = store.pickedFileBytes
    const isAudio = isAudioMediaKind(store.mediaKind)
    setVideoMetadata({
      name: fileName,
      duration: safeDuration,
      fileSize: pickedBytes,
      width: isAudio ? 0 : video.videoWidth,
      height: isAudio ? 0 : video.videoHeight
    })
    updateRecentVideoDuration(fileName, safeDuration)

    useVeilStore.getState().validateAndFixSelection()
    warnDurationOverflowFromStore()
  }

  const togglePlayPause = useCallback(async (): Promise<void> => {
    if (isYouTube) {
      const stage = youtubeStageRef.current
      if (!stage) {
        return
      }
      if (isPlaying) {
        stage.pause()
        setIsPlaying(false)
      } else {
        try {
          stage.play()
          setIsPlaying(true)
        } catch {
          setIsPlaying(false)
        }
      }
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    if (video.paused) {
      try {
        await video.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }, [isPlaying, isYouTube])

  const onSeekInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    manualSeek(Number(event.target.value), 'seekbar')
  }

  const onSeekStart = (): void => {
    requestBookmarkToastDismissal()
    setIsSeeking(true)
    resetSkipLatch()
  }

  const onSeekEnd = (): void => {
    setIsSeeking(false)
    resetSkipLatch()
    if (!videoRef.current) {
      return
    }
    requestAnimationFrame(() => {
      const video = videoRef.current
      const lastManualSeekTime = lastManualSeekTimeRef.current
      if (
        video &&
        lastManualSeekTime !== null &&
        Math.abs(video.currentTime - lastManualSeekTime) > 0.25
      ) {
        manualSeek(lastManualSeekTime, 'seekbar')
      } else {
        syncDisplayTime()
      }
      reconcileNow()
    })
  }

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    if (isAudioMode) {
      return
    }

    const stage = stageRef.current
    if (!stage) {
      return
    }

    if (document.fullscreenElement === stage) {
      await document.exitFullscreen()
      return
    }

    await stage.requestFullscreen()
  }, [isAudioMode])

  const handleVideoClick = useCallback((): void => {
    if (videoClickTimerRef.current) {
      clearTimeout(videoClickTimerRef.current)
      videoClickTimerRef.current = null
    }
    videoClickTimerRef.current = setTimeout(() => {
      videoClickTimerRef.current = null
      void togglePlayPause()
    }, 180)
  }, [togglePlayPause])

  const handleVideoDoubleClick = useCallback((): void => {
    if (videoClickTimerRef.current) {
      clearTimeout(videoClickTimerRef.current)
      videoClickTimerRef.current = null
    }
    if (!isAudioMode) {
      void toggleFullscreen()
    }
  }, [isAudioMode, toggleFullscreen])

  const bumpFullscreenChrome = useCallback((): void => {
    if (!isFullscreen) {
      return
    }

    setFullscreenChromeVisible(true)
    if (fullscreenHideTimerRef.current) {
      clearTimeout(fullscreenHideTimerRef.current)
    }
    fullscreenHideTimerRef.current = setTimeout(() => {
      const stage = stageRef.current
      const controlsEngaged = Boolean(stage?.querySelector(
        '.fullscreen-overlay .volume-control--open, .fullscreen-overlay [aria-expanded="true"]'
      ))
      if (!shouldHideFullscreenCursor({
        fullscreen: true,
        interactiveOverlayOpen: isInteractiveOverlayOpen(),
        controlsEngaged
      })) {
        fullscreenHideTimerRef.current = null
        if (controlsEngaged) bumpFullscreenChrome()
        else setFullscreenChromeVisible(true)
        return
      }
      setFullscreenChromeVisible(false)
    }, 2000)
  }, [isFullscreen])

  useEffect(() => {
    if (isFullscreen) {
      bumpFullscreenChrome()
      return
    }

    if (fullscreenHideTimerRef.current) {
      clearTimeout(fullscreenHideTimerRef.current)
      fullscreenHideTimerRef.current = null
    }
    setFullscreenChromeVisible(false)
  }, [bumpFullscreenChrome, isFullscreen])

  useEffect(() => {
    if (isFullscreen) {
      bumpFullscreenChrome()
    }
  }, [isFullscreen, selectedItemId, selectedItemType, interactiveOverlayOpen, bumpFullscreenChrome])

  useEffect(() => {
    const idle = isFullscreen && !fullscreenChromeVisible && !interactiveOverlayOpen
    document.body.classList.toggle('veil-fullscreen-idle', idle)
    return () => {
      document.body.classList.remove('veil-fullscreen-idle')
    }
  }, [fullscreenChromeVisible, interactiveOverlayOpen, isFullscreen])

  const applySetStartAtPlayhead = useCallback((): void => {
    const state = useVeilStore.getState()
    const { selectedItemId: id, selectedItemType: type } = state
    if (id === null || type === null || !canEditItemType(playbackCapabilities, type) || type === 'bookmark') {
      return
    }
    const time = getCurrentVideoTime()
    if (type === 'mask') {
      state.setMaskStart(id, time)
    } else if (type === 'mute') {
      state.setMuteStart(id, time)
    } else {
      state.setSkipStart(id, time)
    }
    handleAfterTimingMutation()
  }, [getCurrentVideoTime, handleAfterTimingMutation, playbackCapabilities])

  const applySetEndAtPlayhead = useCallback((): void => {
    const state = useVeilStore.getState()
    const { selectedItemId: id, selectedItemType: type } = state
    if (id === null || type === null || !canEditItemType(playbackCapabilities, type) || type === 'bookmark') {
      return
    }
    const time = getCurrentVideoTime()
    if (type === 'mask') {
      state.setMaskEnd(id, time)
    } else if (type === 'mute') {
      state.setMuteEnd(id, time)
    } else {
      state.setSkipEnd(id, time)
    }
    handleAfterTimingMutation()
  }, [getCurrentVideoTime, handleAfterTimingMutation, playbackCapabilities])

  useEffect(() => {
    registerAppMenuActions({
      togglePlayPause: () => {
        void togglePlayPause()
      },
      seekBack10: () => seekBySeconds(-AUDIO_SEEK_STEP_SECONDS),
      seekForward10: () => seekBySeconds(AUDIO_SEEK_STEP_SECONDS),
      quickReplay: handleFixedReplay,
      smartReplay: handleSmartReplay,
      prevSubtitleCue: () => seekToSubtitleCue(-1),
      nextSubtitleCue: () => seekToSubtitleCue(1),
      repeatSubtitleCue: () => {
        const video = videoRef.current
        const previousTime = video?.currentTime ?? null
        if (video && repeatCurrentCue(video, subtitleCues, video.currentTime)) {
          if (previousTime !== null && Math.abs(video.currentTime - previousTime) > 0.001) {
            requestBookmarkToastDismissal()
          }
          setIsPlaying(true)
          reconcileNow()
        }
      },
      toggleItemLocked: () => {
        const { selectedItemId: id, selectedItemType: type } = useVeilStore.getState()
        if (id !== null && type !== null && canEditItemType(playbackCapabilities, type)) {
          toggleItemLocked(id, type)
        }
      },
      speedDown: () => {
        applyPlaybackRate(stepPlaybackSpeed(playbackRate, -1) as PlaybackSpeedPreset, { showHud: true })
      },
      speedUp: () => {
        applyPlaybackRate(stepPlaybackSpeed(playbackRate, 1) as PlaybackSpeedPreset, { showHud: true })
      },
      toggleFullscreen: () => {
        void toggleFullscreen()
      },
      addMask: addMaskAtCurrentTime,
      addMute: addMuteAtCurrentTime,
      addSkip: addSkipAtCurrentTime,
      addBookmark: addBookmarkAtCurrentTime,
      deleteSelected: () => {
        const { selectedItemType: type } = useVeilStore.getState()
        if (!canEditItemType(playbackCapabilities, type)) {
          return
        }
        removeSelectedItem()
        reconcileAfterStoreUpdate()
      },
      setStart: applySetStartAtPlayhead,
      setEnd: applySetEndAtPlayhead,
      toggleSidebar,
      toggleTimeline
    })

    return () => {
      clearAppMenuActions([
        'togglePlayPause',
        'seekBack10',
        'seekForward10',
        'quickReplay',
        'smartReplay',
        'prevSubtitleCue',
        'nextSubtitleCue',
        'repeatSubtitleCue',
        'toggleItemLocked',
        'speedDown',
        'speedUp',
        'toggleFullscreen',
        'addMask',
        'addMute',
        'addSkip',
        'addBookmark',
        'deleteSelected',
        'setStart',
        'setEnd',
        'toggleSidebar',
        'toggleTimeline'
      ])
    }
  }, [
    addMaskAtCurrentTime,
    addMuteAtCurrentTime,
    addSkipAtCurrentTime,
    addBookmarkAtCurrentTime,
    applyPlaybackRate,
    applySetEndAtPlayhead,
    applySetStartAtPlayhead,
    handleFixedReplay,
    handleSmartReplay,
    playbackRate,
    playbackCapabilities,
    seekBySeconds,
    reconcileAfterStoreUpdate,
    removeSelectedItem,
    toggleFullscreen,
    togglePlayPause,
    sidebarCollapsed,
    toggleSidebar,
    toggleTimeline,
    timelineVisible
  ])

  const handleFullscreenSeek = useCallback(
    (time: number): void => {
      manualSeek(time, 'seekbar')
    },
    [manualSeek]
  )

  const onStagePointerMove = (): void => {
    if (isFullscreen) {
      bumpFullscreenChrome()
    }
  }

  const onStagePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement
    const targetIsInsideMask = target.closest('.mask-box, .mask-handle') !== null
    if (targetIsInsideMask) {
      return
    }
    if (
      target.closest(
        '.bookmark-side-toast, .fullscreen-overlay__toolbar, .fullscreen-overlay__bottom, .fullscreen-overlay__drawer'
      )
    ) {
      return
    }
    if (
      shouldClearMaskSelectionFromStage(
        useVeilStore.getState().selectedItemType,
        targetIsInsideMask
      )
    ) {
      clearExplicitLayerSelection()
    }
  }

  const setSelectedItemStart = (id: string, type: SelectableItemType, time: number): void => {
    if (type === 'mask') {
      setMaskStart(id, time)
    } else if (type === 'mute') {
      setMuteStart(id, time)
    } else {
      setSkipStart(id, time)
    }
  }

  const setSelectedItemEnd = (id: string, type: SelectableItemType, time: number): void => {
    if (type === 'mask') {
      setMaskEnd(id, time)
    } else if (type === 'mute') {
      setMuteEnd(id, time)
    } else {
      setSkipEnd(id, time)
    }
  }

  localMediaCallbacksRef.current = {
    onActivate: (media): void => {
      const video = media as HTMLVideoElement
      video.volume = playerVolumeRef.current
      video.muted = playerMutedRef.current
      video.playbackRate = playbackRate
      setIsPlaying(!video.paused && !video.ended)
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration)
      }
      applyAuthoritativeTime(video.currentTime, video.duration)
    },
    onPlay: (): void => setIsPlaying(true),
    onPause: (): void => setIsPlaying(false),
    onSeeked: (): void => {
      const video = videoRef.current
      if (!video) return
      finishPendingSeekFromEvent('seeked')
      updateSeekDebug({
        ...buildMediaSeekDebug(video),
        lastSeekedEventTime: video.currentTime,
        videoCurrentTime: video.currentTime,
        paused: video.paused
      })
      if (!isSeeking) {
        applyAuthoritativeTime(video.currentTime, video.duration)
        updateSeekDebug({ displayTime: video.currentTime })
        resetSkipLatch()
        reconcileNow()
      }
    },
    onTimeUpdate: (): void => {
      const video = videoRef.current
      if (!video) return
      finishPendingSeekFromEvent('timeupdate')
      updateSeekDebug({
        ...buildMediaSeekDebug(video),
        videoCurrentTime: video.currentTime,
        paused: video.paused
      })
      if (!isSeeking) {
        applyAuthoritativeTime(video.currentTime, video.duration)
        updateSeekDebug({ displayTime: video.currentTime })
      }
    },
    onDurationChange: (): void => {
      const video = videoRef.current
      if (!video) return
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        return
      }

      const safeDuration = video.duration
      setDuration(safeDuration)
      updateSeekDebug({
        ...buildMediaSeekDebug(video),
        duration: safeDuration,
        videoCurrentTime: video.currentTime,
        paused: video.paused
      })

      const store = useVeilStore.getState()
      if (
        store.videoMetadata &&
        Math.abs(store.videoMetadata.duration - safeDuration) > 0.001
      ) {
        setVideoMetadata({ ...store.videoMetadata, duration: safeDuration })
        updateRecentVideoDuration(store.videoFileName ?? store.videoMetadata.name, safeDuration)
      }
    },
    onEnded: (): void => {
      setIsPlaying(false)
      resetSkipLatch()
    }
  }

  useEffect(() => {
    if (!isSeekDebugEnabled()) {
      return
    }

    let rafId = 0
    const tick = (): void => {
      const video = videoRef.current
      updateSeekDebug({
        ...(video ? buildMediaSeekDebug(video) : {}),
        videoCurrentTime: video && Number.isFinite(video.currentTime) ? video.currentTime : null,
        displayTime,
        duration: videoSrc ? duration : Math.max(duration, videoMetadata?.duration ?? 0),
        paused: video?.paused ?? null,
        requestedSeekTarget: requestedSeekTargetRef.current,
        pendingSeekTarget: pendingSeekTargetRef.current,
        seekAttemptAt: seekAttemptAtRef.current,
        loopState: `${sessionLoop.enabled ? 'enabled' : 'disabled'} ${sessionLoop.start.toFixed(3)}-${sessionLoop.end.toFixed(3)}`
      })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [displayTime, duration, sessionLoop.enabled, sessionLoop.end, sessionLoop.start, videoMetadata?.duration, videoSrc])

  useEffect(() => {
    return () => {
      if (videoClickTimerRef.current) {
        clearTimeout(videoClickTimerRef.current)
        videoClickTimerRef.current = null
      }
      clearSeekFailureTimer()
      pendingSeekTargetRef.current = null
      updateSeekDebug({ pendingSeekTarget: null })
    }
  }, [clearSeekFailureTimer, videoSrc])

  useEffect(() => {
    const debugWindow = window as typeof window & {
      veilDebug?: {
        seekTo?: (time: number) => void
        checkMatchingVeil?: () => Promise<void>
      }
    }
    debugWindow.veilDebug = {
      ...(debugWindow.veilDebug ?? {}),
      seekTo: (time: number) => manualSeek(time, 'manualSeek')
    }
    return () => {
      if (debugWindow.veilDebug?.seekTo) {
        delete debugWindow.veilDebug.seekTo
      }
    }
  }, [manualSeek])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (isModalActive()) {
        return
      }

      if (
        uiRefreshV1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'e'
      ) {
        event.preventDefault()
        if (isAudioMode) {
          togglePlayerModeWithAudio(displayTime)
        } else {
          togglePlayerMode()
        }
        return
      }

      const stage = stageRef.current
      const inAppFullscreen = stage !== null && document.fullscreenElement === stage
      if (inAppFullscreen) {
        bumpFullscreenChrome()
      }

      if (event.key === 'Escape') {
        const dirtyEditor = document.querySelector('[data-layer-editor-dirty="true"]')
        if (dirtyEditor) return
        if (clearExplicitLayerSelection()) {
          event.preventDefault()
          return
        }
        if (inAppFullscreen) {
          event.preventDefault()
          void toggleFullscreen()
          return
        }
      }

      if (matchesBinding(event, 'toggleFullscreen')) {
        event.preventDefault()
        void toggleFullscreen()
        return
      }

      if (matchesBinding(event, 'playPause')) {
        event.preventDefault()
        void togglePlayPause()
        return
      }

      if (hasPlayableMedia) {
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            applyPlayerVolume(playerVolumeRef.current + 0.05)
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            applyPlayerVolume(playerVolumeRef.current - 0.05)
            return
          }
        }
        if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
          event.preventDefault()
          applyPlayerMuted(!playerMutedRef.current)
          return
        }
      }

      if (matchesBinding(event, 'smartReplay')) {
        if (event.repeat) {
          return
        }
        event.preventDefault()
        handleSmartReplay()
        return
      }

      if (matchesBinding(event, 'quickReplay')) {
        event.preventDefault()
        handleFixedReplay()
        return
      }

      if (matchesBinding(event, 'momentaryReveal')) {
        event.preventDefault()
        triggerMomentaryReveal()
        return
      }

      if (matchesBinding(event, 'prevSubtitleCue')) {
        event.preventDefault()
        seekToSubtitleCue(-1)
        return
      }

      if (matchesBinding(event, 'nextSubtitleCue')) {
        event.preventDefault()
        seekToSubtitleCue(1)
        return
      }

      if (matchesBinding(event, 'repeatSubtitleCue')) {
        const video = videoRef.current
        if (!video || subtitleCues.length === 0) {
          return
        }
        event.preventDefault()
        const previousTime = video.currentTime
        if (repeatCurrentCue(video, subtitleCues, video.currentTime)) {
          if (Math.abs(video.currentTime - previousTime) > 0.001) {
            requestBookmarkToastDismissal()
          }
          setIsPlaying(true)
          reconcileNow()
        }
        return
      }

      if (matchesBinding(event, 'toggleLoop')) {
        event.preventDefault()
        persistSessionLoop({ ...sessionLoop, enabled: !sessionLoop.enabled }, { showHud: true })
        return
      }

      if (matchesBinding(event, 'setLoopStart')) {
        event.preventDefault()
        persistSessionLoop({ ...sessionLoop, start: getCurrentVideoTime() })
        return
      }

      if (matchesBinding(event, 'setLoopEnd')) {
        event.preventDefault()
        persistSessionLoop({ ...sessionLoop, end: getCurrentVideoTime() })
        return
      }

      if (matchesBinding(event, 'toggleItemLocked')) {
        if (refreshWatchMode) {
          return
        }
        const { selectedItemId: id, selectedItemType: type } = useVeilStore.getState()
        if (id === null || type === null || !canEditItemType(playbackCapabilities, type)) {
          return
        }
        event.preventDefault()
        toggleItemLocked(id, type)
        return
      }

      if (
        (event.key === KEY_MOMENTARY_REVEAL || event.key === KEY_MOMENTARY_REVEAL.toUpperCase()) &&
        !event.repeat
      ) {
        event.preventDefault()
        triggerMomentaryReveal()
        return
      }

      if (matchesBinding(event, 'speedDown')) {
        event.preventDefault()
        applyPlaybackRate(stepPlaybackSpeed(playbackRate, -1) as PlaybackSpeedPreset, { showHud: true })
        return
      }

      if (matchesBinding(event, 'speedUp')) {
        event.preventDefault()
        applyPlaybackRate(stepPlaybackSpeed(playbackRate, 1) as PlaybackSpeedPreset, { showHud: true })
        return
      }

      if (event.key === KEY_HOLD_REVEAL && !event.repeat && !isEditableTarget(event.target)) {
        setHoldReveal(true)
        incrementWorkflowMetric('holdReveal')
        return
      }

      if (matchesBinding(event, 'addMask')) {
        event.preventDefault()
        addMaskAtCurrentTime()
        return
      }

      if (matchesBinding(event, 'addMute')) {
        event.preventDefault()
        addMuteAtCurrentTime()
        return
      }

      if (matchesBinding(event, 'addSkip')) {
        event.preventDefault()
        addSkipAtCurrentTime()
        return
      }

      if (matchesBinding(event, 'addBookmark')) {
        event.preventDefault()
        addBookmarkAtCurrentTime()
        return
      }

      if (matchesBinding(event, 'addAnchor')) {
        if (refreshWatchMode || !canCreateRangeActions(playbackCapabilities)) {
          return
        }
        event.preventDefault()
        addAnchorAtTime(getCurrentVideoTime())
        reconcileAfterStoreUpdate()
        return
      }

      if (event.key === 'i' || event.key === 'I') {
        if (refreshWatchMode) {
          return
        }
        const { selectedItemId: id, selectedItemType: type } = useVeilStore.getState()
        if (id === null || type === null || !canEditItemType(playbackCapabilities, type) || type === 'bookmark') {
          return
        }
        event.preventDefault()
        setSelectedItemStart(id, type, getCurrentVideoTime())
        handleAfterTimingMutation()
        return
      }

      if (event.key === 'o' || event.key === 'O') {
        if (refreshWatchMode) {
          return
        }
        const { selectedItemId: id, selectedItemType: type } = useVeilStore.getState()
        if (id === null || type === null || !canEditItemType(playbackCapabilities, type) || type === 'bookmark') {
          return
        }
        event.preventDefault()
        setSelectedItemEnd(id, type, getCurrentVideoTime())
        handleAfterTimingMutation()
        return
      }

      if (matchesBinding(event, 'deleteSelected') || event.code === 'Backspace') {
        if (refreshWatchMode) {
          return
        }
        const { selectedItemId: id, selectedItemType: type } = useVeilStore.getState()
        if (id === null || type === null || !canEditItemType(playbackCapabilities, type)) {
          return
        }
        event.preventDefault()
        removeSelectedItem()
        reconcileAfterStoreUpdate()
      }
    }

    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === KEY_HOLD_REVEAL) {
        setHoldReveal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [
    addMaskAtCurrentTime,
    applyPlayerMuted,
    applyPlayerVolume,
    bumpFullscreenChrome,
    applyPlaybackRate,
    playbackRate,
    playbackCapabilities,
    addMuteAtCurrentTime,
    addSkipAtCurrentTime,
    addAnchorAtTime,
    getCurrentVideoTime,
    handleAfterTimingMutation,
    handleFixedReplay,
    handleSmartReplay,
    reconcileAfterStoreUpdate,
    reconcileNow,
    hasPlayableMedia,
    videoSrc,
    resetSkipLatch,
    removeSelectedItem,
    fullscreenChromeVisible,
    persistSessionLoop,
    seekToSubtitleCue,
    sessionLoop,
    subtitleCues,
    toggleFullscreen,
    toggleItemLocked,
    togglePlayPause,
    triggerMomentaryReveal,
    togglePlayerMode,
    uiRefreshV1,
    refreshWatchMode
  ])

  const virtualTimelineDuration = useMemo(
    () =>
      computeVirtualTimelineDuration({
        masks,
        mutes,
        skips,
        metadataDuration: videoMetadata?.duration
      }),
    [masks, mutes, skips, videoMetadata?.duration]
  )

  const veilSessionActive = useMemo(
    () => hasVeilSession({ trackFilePath, masks, mutes, skips, bookmarks }),
    [bookmarks, masks, mutes, skips, trackFilePath]
  )
  const showEditWithoutVideo = uiRefreshV1 && playerMode === 'edit' && veilSessionActive

  useEffect(() => {
    if (!hasPlayableMedia && showEditWithoutVideo) {
      setDuration(virtualTimelineDuration)
      applyAuthoritativeTime(playbackTimeRef.current, virtualTimelineDuration)
    }
  }, [applyAuthoritativeTime, hasPlayableMedia, showEditWithoutVideo, virtualTimelineDuration])

  useEffect(() => {
    if (videoSrc || !showEditWithoutVideo) {
      setPlaceholderContentLayout(null)
      return
    }

    const stage = stageRef.current
    if (!stage) {
      return
    }

    const updateLayout = (): void => {
      const rect = stage.getBoundingClientRect()
      setPlaceholderContentLayout(
        computeAspectFitContentLayout(rect.width, rect.height, 16 / 9)
      )
    }

    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(stage)
    return () => {
      observer.disconnect()
    }
  }, [showEditWithoutVideo, videoSrc])

  useEffect(() => {
    if (!isAudioMode || !videoSrc) {
      setAudioContentLayout(null)
      return
    }

    const stage = stageRef.current
    if (!stage) {
      return
    }

    const updateLayout = (): void => {
      setAudioContentLayout(getStageFillContentLayout(stage))
    }

    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(stage)
    document.addEventListener('fullscreenchange', updateLayout)
    return () => {
      observer.disconnect()
      document.removeEventListener('fullscreenchange', updateLayout)
    }
  }, [isAudioMode, videoSrc, sidebarCollapsed, timelineVisible, hideEditorChrome, playerMode, uiRefreshV1])

  const canvasBookmarkDuration = videoSrc
    ? duration
    : Math.max(duration, videoMetadata?.duration ?? virtualTimelineDuration)

  const canvasBookmarks = useMemo(() => {
    if (videoSrc) {
      return []
    }
    return readSessionBookmarks(bookmarkStorageKey(videoFileName, canvasBookmarkDuration))
  }, [canvasBookmarkDuration, videoFileName, videoSrc])

  const effectiveDuration = videoMetadata?.duration ?? virtualTimelineDuration
  const savedYouTubeDuration = normalizePlaybackDuration(youtubeSource?.duration ?? Number.NaN)
  const timelineDuration = isYouTube
    ? (normalizePlaybackDuration(duration) ?? savedYouTubeDuration ?? effectiveDuration)
    : hasPlayableMedia
      ? duration
      : Math.max(duration, effectiveDuration)
  const bookmarkMarkerDuration = isYouTube
    ? (normalizePlaybackDuration(duration) ?? savedYouTubeDuration ??
      normalizePlaybackDuration(videoMetadata?.duration ?? Number.NaN) ?? 0)
    : (normalizePlaybackDuration(duration) ?? 0)
  const liveTransportDuration = resolveLiveTransportDuration({
    source: isYouTube ? 'youtube' : 'local',
    ready: youtubeReady,
    duration: timelineDuration
  })
  const bookmarkToast = bookmarkToastTrigger
    ? bookmarks.find((bookmark) => bookmark.id === bookmarkToastTrigger.bookmarkId) ?? null
    : null

  const deleteBookmarkFromToast = (): void => {
    if (!bookmarkToast || !confirmNative(t('dialog.deleteTitle', { type: t('inspector.bookmark') }), t('bookmarks.confirmDelete'))) return
    const state = useVeilStore.getState()
    const partOfMultiSelection = state.selectedItems.length > 1 && state.selectedItems.some(
      (item) => item.id === bookmarkToast.id && item.type === 'bookmark'
    )
    if (partOfMultiSelection) state.removeSelectedItem()
    else deleteBookmark(bookmarkToast.id)
    if (!useVeilStore.getState().bookmarks.some((bookmark) => bookmark.id === bookmarkToast.id)) {
      dismissBookmarkToast()
    }
  }

  useEffect(() => {
    if (!showAudioCompact || !isFullscreen) {
      return
    }
    void document.exitFullscreen().catch(() => {})
    setIsFullscreen(false)
  }, [isFullscreen, showAudioCompact])

  if (!hasPlayableMedia && !showEditWithoutVideo) {
    return null
  }

  const workspaceClass = playerWorkspaceClassName({
    sidebarCollapsed,
    hideEditorChrome,
    showInspectorChrome,
    uiRefreshV1,
    timelineVisible,
    inspectorModeActive,
    inspectorCollapsed
  })

  const timelineHidden = !timelineVisible
  const timelineChromeEligible = (
    uiRefreshV1 ? playerMode === 'edit' || isYouTube : true
  )

  const activateLayer = useCallback(
    (
      id: string,
      type: SelectableItemType,
      start: number,
      originOrModifier: LayerSelectionOrigin | boolean = 'standard',
      forceExclusive = false
    ): void => {
      const modifierSelection = typeof originOrModifier === 'boolean' ? originOrModifier : false
      const origin = typeof originOrModifier === 'string' ? originOrModifier : 'standard'
      if (forceExclusive) setSelectedItem(id, type)
      else if (modifierSelection) toggleSelectedItem(id, type)
      else selectTimelineItem(id, type)
      const remainsSelected = useVeilStore.getState().selectedItems.some(
        (item) => item.id === id && item.type === type
      )
      if (!remainsSelected) return
      if (type === 'bookmark') {
        requestBookmarkToast(id)
      }
      if (origin === 'standard') requestOpenSidebarPanel('selected')
      manualSeek(start, 'other', type === 'bookmark' ? id : undefined, type === 'skip' ? id : undefined)
    },
    [manualSeek, selectTimelineItem, setSelectedItem, toggleSelectedItem]
  )
  const videoContentLayout = isAudioMode
    ? audioContentLayout
    : videoSrc
      ? measuredVideoContentLayout
      : placeholderContentLayout
  const showRegionSubtitleCover =
    playbackCapabilities.canUseRegionCover && isRegionCoverMode(subtitleCoverMode)

  const sidebarChromeClass = [
    'player-workspace__sidebar-chrome',
    hideLegacySidebar ? 'player-workspace__sidebar-chrome--mode-hidden' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const timelineChromeClass = [
    'player-chrome-timeline',
    timelineHidden ? 'player-chrome-timeline--mode-hidden' : '',
    uiRefreshV1 ? 'player-chrome-timeline--refresh' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const playerColumnClass = [
    'player-column',
    hideEditorChrome ? 'player-column--watch' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const playerControlsClass = [
    'player-controls',
    hideEditorChrome ? 'player-controls--watch' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const stageClass = [
    'player-stage',
    isYouTube ? 'player-stage--youtube' : '',
    isFullscreen && drawerOpen ? 'player-stage--layers-open' : '',
    isYouTube && isFullscreen && drawerOpen ? 'player-stage--youtube-layers-open' : '',
    isAudioMode ? 'player-stage--audio-workspace' : '',
    isFullscreen && !fullscreenChromeVisible && !interactiveOverlayOpen ? 'player-stage--fullscreen-idle' : ''
  ]
    .filter(Boolean)
    .join(' ')

  if (showAudioCompact && videoSrc) {
    return (
      <>
        <AudioPlayerLayout
          videoRef={videoRef}
          mediaRef={bindActiveLocalMediaElement}
          videoSrc={videoSrc}
          fileName={videoFileName}
          isPlaying={isPlaying}
          displayTime={displayTime}
          duration={timelineDuration}
          playbackRate={playbackRate}
          subtitleSheetOpen={subtitleSheetOpen}
          onTogglePlayPause={() => void togglePlayPause()}
          onSeekRelative={seekBySeconds}
          onSeekInput={onSeekInput}
          onSeekStart={onSeekStart}
          onSeekEnd={onSeekEnd}
          onPlaybackRateChange={applyPlaybackRate}
          onAddMute={addMuteAtCurrentTime}
          onAddSkip={addSkipAtCurrentTime}
          onAddBookmark={addBookmarkAtCurrentTime}
          bookmarks={bookmarks}
          selectedBookmarkId={selectedItemType === 'bookmark' ? selectedItemId : null}
          onSelectBookmark={(id) => selectTimelineItem(id, 'bookmark')}
          onSeekBookmark={(time) => manualSeek(time, 'other')}
          onLoadedMetadata={onLoadedMetadata}
        />
        <MediaPlaybackErrorDialog
          failure={playbackFailure}
          onClose={() => setPlaybackFailure(null)}
        />
        <SubtitleSheet
          open={subtitleSheetOpen}
          onClose={() => setSubtitleSheetOpen(false)}
          onOpenSettings={() => {
            setSubtitleSheetOpen(false)
            requestSettingsSection('subtitles')
          }}
          videoRef={videoRef}
          getCurrentTime={getCurrentVideoTime}
          sessionLoop={sessionLoop}
          reviewIsolation={reviewIsolation}
          fullReveal={fullReveal}
          autoPauseAtCueEnd={autoPauseAtCueEnd}
          onToggleReviewIsolation={() => setReviewIsolation((value) => !value)}
          onFullRevealChange={setFullReveal}
          onAutoPauseAtCueEndChange={setAutoPauseAtCueEnd}
          onSessionLoopChange={persistSessionLoop}
          onReconcile={reconcileAfterStoreUpdate}
          onAfterSeek={reconcileNow}
          onRegisterImportTrigger={(trigger) => {
            subtitleImportTriggerRef.current = trigger
          }}
        />
        <ContentReviewDialog
          onPreview={previewContentReviewFinding}
          onStopPreview={stopContentReviewPreview}
          onReviewSessionOpen={captureContentReviewPlaybackSession}
          onReviewSessionExit={restoreContentReviewPlaybackSession}
          onApply={applyContentReviewToVeil}
          videoRef={videoRef}
          previewMode="audio"
          playbackTime={displayTime}
        />
      </>
    )
  }

  return (
    <section
      className={[
        'player-shell',
        isAudioMode ? 'player-shell--audio-workspace' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={t('player.ariaLabel')}
    >
      <div className={workspaceClass}>
        <div className={playerColumnClass}>
          <div
            ref={stageRef}
            className={stageClass}
            tabIndex={-1}
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
          >
            {isYouTube && youtubeSource ? (
              <YouTubePlayerStage
                ref={youtubeStageRef}
                source={youtubeSource}
                loadGeneration={youtubeLoadGeneration}
                volume={playerVolume}
                muted={effectivePlayerMuted}
                playbackRate={playbackRate}
                onPlayingChange={setIsPlaying}
                onTimeUpdate={({ currentTime, duration: nextDuration }) => {
                  const reconciled = reconcileYouTubeSeekSample({
                    sampleTime: currentTime,
                    duration: nextDuration,
                    pendingSeek: pendingYouTubeSeekRef.current,
                    now: Date.now()
                  })
                  pendingYouTubeSeekRef.current = reconciled.pendingSeek
                  if (reconciled.time !== null) {
                    applyAuthoritativeTime(reconciled.time, nextDuration)
                  }
                  if (nextDuration !== null) {
                    setDuration(nextDuration)
                  }
                }}
                onReady={({ loadGeneration, videoId, metadata }) => {
                  setYouTubeReady(true)
                  setPlaybackFailure(null)
                  const liveDuration = youtubeStageRef.current?.getDuration() ?? 0
                  const liveTime = youtubeStageRef.current?.getCurrentTime() ?? Number.NaN
                  applyAuthoritativeTime(liveTime, liveDuration)
                  if (liveDuration > 0) {
                    setDuration(liveDuration)
                    const currentMeta = useVeilStore.getState().videoMetadata
                    const currentSource = useVeilStore.getState().mediaSource
                    if (currentMeta) {
                      useVeilStore.getState().setVideoMetadata({
                        ...currentMeta,
                        duration: liveDuration
                      })
                    }
                    if (currentSource && isYouTubeMediaSource(currentSource)) {
                      useVeilStore.getState().setMediaSource({
                        ...currentSource,
                        duration: liveDuration
                      })
                    }
                    const saved =
                      youtubeSource.duration ?? currentMeta?.duration ?? null
                    if (driftCheckedVideoIdRef.current !== youtubeSource.videoId) {
                      driftCheckedVideoIdRef.current = youtubeSource.videoId
                      const drift = evaluateYouTubeDurationDrift(saved, liveDuration)
                      if (drift.status === 'warn') {
                        pushWarningToast(t('youtube.durationDriftWarning'))
                      }
                    }
                  }
                  if (metadata) {
                    useVeilStore.getState().mergeYouTubeMetadata({
                      ...metadata,
                      videoId,
                      source: 'iframe',
                      status: 'partial'
                    })
                    updateRecentYouTubeTitle(videoId, metadata.title)
                  }
                  // Two-phase mismatch: apply pending VEIL only after exact-target Ready.
                  notifyYouTubeReadyForMismatch(videoId, loadGeneration)
                }}
                onError={(error, { loadGeneration, videoId }) => {
                  setYouTubeReady(false)
                  pendingYouTubeSeekRef.current = null
                  const handledByMismatch = notifyYouTubeErrorForMismatch(
                    error,
                    videoId,
                    loadGeneration
                  )
                  if (!handledByMismatch) {
                    const state = useVeilStore.getState()
                    const activeSource = state.mediaSource
                    if (
                      activeSource &&
                      isYouTubeMediaSource(activeSource) &&
                      isCurrentYouTubeFailureEvent({
                        eventVideoId: videoId,
                        eventLoadGeneration: loadGeneration,
                        activeSource,
                        activeLoadGeneration: state.youtubeLoadGeneration
                      })
                    ) {
                      setPlaybackFailure(youtubePlaybackFailure(error.code, activeSource))
                    }
                  }
                }}
              />
            ) : videoSrc ? (
              <>
                <video
                  key={videoSrc}
                  ref={bindActiveLocalMediaElement}
                  className={`player-video${isAudioMode ? ' player-video--audio' : ''}`}
                  src={videoSrc}
                  playsInline
                  onLoadedMetadata={onLoadedMetadata}
                  onClick={handleVideoClick}
                  onDoubleClick={handleVideoDoubleClick}
                />
                {isAudioMode ? (
                  <AudioPlaceholder
                    contentLayout={videoContentLayout}
                    fileName={videoFileName}
                    duration={duration}
                  />
                ) : null}
              </>
            ) : (
              <VeilCanvas
                contentLayout={placeholderContentLayout}
                duration={timelineDuration}
                bookmarks={canvasBookmarks}
                trackBookmarks={trackBookmarks}
                anchors={anchors}
                onOpenVideo={onOpenVideo}
              />
            )}
            {/* Stack: video → subtitles (z-10) → masks (z-20) → editor chrome (z-30 in OverlayLayer) */}
            {!isYouTube ? (
              <SubtitleTextLayer
                videoRef={videoRef}
                contentLayout={videoContentLayout}
                subtitleRevealActive={subtitleRevealActive}
                momentaryRevealActive={momentaryRevealActive}
              />
            ) : null}
            {!isYouTube && showRegionSubtitleCover ? (
              <RegionSubtitleCover
                stageRef={stageRef}
                contentLayout={videoContentLayout}
                rect={regionCoverRect}
                hidden={hideRegionCover}
                onPatchRect={setRegionCoverRect}
              />
            ) : null}
            {!isYouTube && playbackCapabilities.canUseVisualOverlays && canRenderMaskOverlays(mediaKind) ? (
            <OverlayLayer
              stageRef={stageRef}
              contentLayout={videoContentLayout}
              masksToRender={masksToRender}
            />
            ) : null}
            {!isYouTube || !isFullscreen ? <PlaybackHUD /> : null}
            {isFullscreen ? (
              <FullscreenEditOverlay
                layoutMode={isYouTube ? 'youtube-sibling' : 'overlay'}
                visible={fullscreenChromeVisible}
                drawerOpen={drawerOpen}
                duration={duration}
                displayTime={displayTime}
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                selectedItemId={selectedItemId}
                selectedItemType={selectedItemType}
                selectedItems={selectedItems}
                bookmarks={bookmarks}
                bookmarkActivity={bookmarkToast}
                bookmarkActivityRefreshKey={bookmarkToastTrigger?.sequence}
                bookmarkActivityInitiallyEditing={bookmarkToastTrigger?.initiallyEditing}
                showActivityRail={playbackActivityPreferences.showFullscreenVeilRail}
                bookmarkActivityDisplayDurationMs={playbackActivityPreferences.bookmarkActivityDurationMs}
                layerItems={fullscreenLayerItems}
                activityRailItems={allLayerItems}
                totalLayerCount={totalLayerCount}
                layerFilter={fullscreenLayerFilter}
                onLayerFilterChange={handleFullscreenLayerFilterChange}
                onActivity={bumpFullscreenChrome}
                onCloseDrawer={() => setDrawerOpen(false)}
                onOpenDrawer={() => setDrawerOpen(true)}
                onExitFullscreen={() => void toggleFullscreen()}
                onTogglePlayPause={() => void togglePlayPause()}
                onSeek={handleFullscreenSeek}
                onSeekBookmark={(time, bookmarkId) => manualSeek(time, 'other', bookmarkId)}
                onSelectBookmark={(id) => {
                  selectTimelineItem(id, 'bookmark')
                  if (useVeilStore.getState().selectedItemId === id && useVeilStore.getState().selectedItemType === 'bookmark') {
                    requestBookmarkToast(id)
                  }
                }}
                onAddMask={addMaskAtCurrentTime}
                onAddMute={addMuteAtCurrentTime}
                onAddSkip={addSkipAtCurrentTime}
                onAddBookmark={addBookmarkAtCurrentTime}
                videoRef={videoRef}
                volume={playerVolume}
                muted={effectivePlayerMuted}
                onVolumeChange={applyPlayerVolume}
                onMutedChange={applyPlayerMuted}
                onPlaybackRateChange={applyPlaybackRate}
                subtitleSheetOpen={subtitleSheetOpen}
                showBookmarkAction
                capabilities={playbackCapabilities}
                onSelectItem={(id, type) => {
                  if (!id || !type) return
                  const item = fullscreenLayerItems.find((candidate) => candidate.id === id && candidate.type === type)
                  if (item) activateLayer(id, type, item.start, 'fullscreen-layers-row')
                }}
                onEditItem={(id, type) => {
                  const item = fullscreenLayerItems.find((candidate) => candidate.id === id && candidate.type === type)
                  if (!item) return
                  setSelectedItem(id, type)
                  if (type === 'bookmark') requestBookmarkToast(id)
                }}
                onDeleteItem={(id, type) => {
                  const state = useVeilStore.getState()
                  const selected = state.selectedItems.some((item) => item.id === id && item.type === type)
                  if (selected) state.removeSelectedItem()
                  else state.removeTrackItem(id, type)
                  handleAfterTimingMutation()
                }}
                onToggleItemEnabled={(id, type) => toggleItemEnabled(id, type)}
                onAfterTimingMutation={handleAfterTimingMutation}
                onSaveBookmarkDetails={(details) => {
                  if (bookmarkToast) patchBookmark(bookmarkToast.id, details)
                }}
                onDeleteBookmark={bookmarkToast ? deleteBookmarkFromToast : undefined}
                onDismissBookmarkActivity={dismissBookmarkToast}
              />
            ) : null}
          <SubtitleSheet
            open={subtitleSheetOpen}
            onClose={() => setSubtitleSheetOpen(false)}
            onOpenSettings={() => {
              setSubtitleSheetOpen(false)
              requestSettingsSection('subtitles')
            }}
            videoRef={videoRef}
            getCurrentTime={getCurrentVideoTime}
            sessionLoop={sessionLoop}
            reviewIsolation={reviewIsolation}
            fullReveal={fullReveal}
            autoPauseAtCueEnd={autoPauseAtCueEnd}
            onToggleReviewIsolation={() => setReviewIsolation((value) => !value)}
            onFullRevealChange={setFullReveal}
            onAutoPauseAtCueEndChange={setAutoPauseAtCueEnd}
            onSessionLoopChange={persistSessionLoop}
            onReconcile={reconcileAfterStoreUpdate}
            onAfterSeek={reconcileNow}
            onRegisterImportTrigger={(trigger) => {
              subtitleImportTriggerRef.current = trigger
            }}
          />
          </div>

          <YouTubePlaybackFailurePanel
            failure={playbackFailure}
            onRetry={retryYouTubePlayback}
            onOpenOnYouTube={openFailedYouTubeExternally}
            onCloseMedia={closeFailedYouTubeMedia}
          />

          <div className="source-disclosure" aria-live="polite">
            <div className="source-disclosure__source">
              <span>
                {playbackCapabilities.sourceDisclosure === 'youtube'
                  ? t('youtube.sourceDisclosure')
                  : t('youtube.sourceDisclosureLocal')}
              </span>
              {isYouTube && youtubeSource ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  onClick={() => {
                    void window.veil?.openExternalUrl?.(youtubeSource.canonicalUrl)
                  }}
                >
                  {t('youtube.openOnYouTube')}
                </button>
              ) : null}
            </div>
            {!isFullscreen && bookmarkToast ? (
              <BookmarkActivitySurface
                key={bookmarkToastTrigger?.sequence}
                bookmark={bookmarkToast}
                refreshKey={bookmarkToastTrigger?.sequence}
                initiallyEditing={bookmarkToastTrigger?.initiallyEditing}
                displayDurationMs={playbackActivityPreferences.bookmarkActivityDurationMs}
                onSaveDetails={(details) => patchBookmark(bookmarkToast.id, details)}
                onDelete={deleteBookmarkFromToast}
                onDismiss={dismissBookmarkToast}
              />
            ) : null}
          </div>

          <div className={playerControlsClass} dir="ltr">
            {hasPlayableMedia ? (
              <button
                type="button"
                className="btn btn-compact player-controls__play player-play-button"
                onClick={() => void togglePlayPause()}
              >
                {isPlaying ? t('playback.pause') : t('playback.play')}
              </button>
            ) : null}

            <PlaybackSeekBar
              className="seek-control seekbar-container player-controls__seek"
              duration={timelineDuration}
              step={0.1}
              value={Math.min(displayTime, timelineDuration)}
              ariaLabel={t('player.seek')}
              disabled={(isYouTube && !youtubeReady) || (!hasPlayableMedia && !showEditWithoutVideo)}
              onChange={onSeekInput}
              onMouseDown={onSeekStart}
              onMouseUp={onSeekEnd}
              onTouchStart={onSeekStart}
              onTouchEnd={onSeekEnd}
            >
              <span className="sr-only">{t('player.seek')}</span>
              <ProgressBookmarkMarkers
                bookmarks={bookmarks}
                duration={bookmarkMarkerDuration}
                selectedBookmarkId={selectedItemType === 'bookmark' ? selectedItemId : null}
                onSelect={(id) => {
                  selectTimelineItem(id, 'bookmark')
                  if (useVeilStore.getState().selectedItemId === id && useVeilStore.getState().selectedItemType === 'bookmark') {
                    requestBookmarkToast(id)
                  }
                }}
                onSeek={(time, bookmarkId) => manualSeek(time, 'other', bookmarkId)}
              />
            </PlaybackSeekBar>

            <span className="player-controls__time" aria-live="polite">
              {formatTime(displayTime)} / {liveTransportDuration === null ? '--:--' : formatTime(liveTransportDuration)}
            </span>

            <div className="player-controls__utilities">
              <PlayerUtilityControls subtitleSheetOpen={subtitleSheetOpen} />
              {uiRefreshV1 ? (
                <VolumeControl
                  videoRef={videoRef}
                  volume={playerVolume}
                  muted={effectivePlayerMuted}
                  onVolumeChange={applyPlayerVolume}
                  onMutedChange={applyPlayerMuted}
                />
              ) : null}
              <PlaybackRateControl value={playbackRate} onChange={applyPlaybackRate} />
            </div>

            {(!uiRefreshV1 && !hideEditorChrome) ||
            (uiRefreshV1 && (playerMode === 'edit' || isYouTube)) ? (
              <button
                type="button"
                className="btn btn-secondary btn-compact player-controls__timeline"
                onClick={() => onTimelineVisibleChange(!timelineVisible)}
                title={timelineVisible ? t('player.hideTimeline') : t('player.showTimeline')}
                aria-label={timelineVisible ? t('player.hideTimeline') : t('player.showTimeline')}
                aria-expanded={timelineVisible}
                aria-controls="player-timeline-panel"
              >
                {t('player.timeline')}
              </button>
            ) : null}

            {!isAudioMode ? (
            <button
              type="button"
              className="btn btn-compact btn-ghost player-controls__fullscreen player-controls__icon-btn"
              onClick={() => void toggleFullscreen()}
              title={t('player.fullscreen')}
              aria-label={t('player.fullscreenAria')}
            >
              <FullscreenEnterIcon className="player-controls__icon" />
            </button>
            ) : null}
          </div>

          {timelineChromeEligible ? (
            <div
              id="player-timeline-panel"
              className={timelineChromeClass}
              dir="ltr"
              aria-hidden={timelineHidden}
              inert={timelineHidden}
            >
              <header className="timeline-chrome-header">
                <h2 className="timeline-chrome-header__title">{t('player.timeline')}</h2>
                <div className="timeline-chrome-header__actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact timeline-chrome-header__layers"
                    onClick={() => openTrackTool('layers')}
                    aria-label={t('trackTools.layers')}
                  >
                    <LayersIcon className="timeline-chrome-header__layers-icon" />
                    {t('trackTools.layers')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost timeline-chrome-header__toggle"
                    onClick={handleTimelineChromeHide}
                    aria-label="Hide Timeline"
                    title="Hide Timeline"
                  >
                    <InspectorCollapseIcon />
                  </button>
                </div>
              </header>
              <TimelineEditor
                capabilities={playbackCapabilities}
                videoRef={videoRef}
                duration={timelineDuration}
                bookmarkDuration={bookmarkMarkerDuration}
                activeMaskIds={activeMaskIds}
                activeMuteIds={activeMuteIds}
                activeSkipIds={activeSkipIds}
                getCurrentTime={getCurrentVideoTime}
                sessionLoop={sessionLoop}
                onAfterTimingMutation={handleAfterTimingMutation}
                onDurationCommit={warnDurationOverflowFromStore}
                onManualSeek={manualSeek}
                playheadTimeOverride={displayTime}
                playheadVisible={!isYouTube || youtubeReady}
                visible={timelineVisible}
                onAddBookmark={addBookmarkAtCurrentTime}
                onActivateItem={activateLayer}
              />
            </div>
          ) : null}
        </div>

        {showInspectorChrome ? (
          <div
            className={inspectorDockClassName(
              inspectorDock,
              inspectorCollapsed ? 'collapsed' : 'expanded'
            )}
          >
            <InspectorPanel
              currentTime={displayTime}
              duration={timelineDuration}
              youtubePlaybackAvailable={youtubeReady && !playbackFailure}
              onSeek={(time) => manualSeek(time)}
              onActivateItem={activateLayer}
              onAddBookmark={addBookmarkAtCurrentTime}
              onOpenTrackTool={openTrackTool}
              onOpenLayerManager={openLayerManager}
              onAfterTimingMutation={handleAfterTimingMutation}
              onHide={() => setInspectorCollapsed(true)}
            />
          </div>
        ) : null}

        {inspectorModeActive && inspectorCollapsed ? (
          <aside className="inspector-dock inspector-dock--right inspector-dock--collapsed">
            <button
              type="button"
              className="inspector-dock__show"
              onClick={() => setInspectorCollapsed(false)}
              title={`${t('common.show')} ${t('inspector.trackOverview')}`}
              aria-label={`${t('common.show')} ${t('inspector.trackOverview')}`}
            >
              <span aria-hidden="true">‹</span>
            </button>
          </aside>
        ) : null}

        {showInspectorChrome ? (
          <TrackToolDialogs
            capabilities={playbackCapabilities}
            activeTool={activeTrackTool}
            onClose={closeTrackTool}
            layerManagerFilter={layerManagerFilter}
            videoRef={videoRef}
            activeMaskIds={activeMaskIds}
            activeMuteIds={activeMuteIds}
            activeSkipIds={activeSkipIds}
            getCurrentTime={getCurrentVideoTime}
            hasVideo={hasPlayableMedia}
            groupSession={groupSession}
            onReconcile={reconcileAfterStoreUpdate}
            onAfterTimingMutation={handleAfterTimingMutation}
            onAfterSeek={reconcileNow}
            onSeekToTime={(time) => manualSeek(time, 'other')}
          />
        ) : null}

        <div className={sidebarChromeClass} aria-hidden={hideLegacySidebar}>
        {sidebarCollapsed ? (
          <TrackSidebarRail
            activeSection={railActiveSection}
            onExpand={() => onSidebarCollapsedChange(false)}
            onOpenPanel={(panelId: SidebarPanelId) => {
              setRailActiveSection(panelId)
              onSidebarCollapsedChange(false)
              requestOpenSidebarPanel(panelId)
            }}
          />
        ) : (
          <div className="track-sidebar-wrap">
            <TrackSidebar
            videoRef={videoRef}
            hideSubtitlesPanel={
              showInspectorChrome || !playbackCapabilities.canImportCustomSubtitles
            }
            activeMaskIds={activeMaskIds}
            activeMuteIds={activeMuteIds}
            activeSkipIds={activeSkipIds}
            getCurrentTime={getCurrentVideoTime}
            hasVideo={hasPlayableMedia}
            groupSession={groupSession}
            onReconcile={reconcileAfterStoreUpdate}
            onAfterTimingMutation={handleAfterTimingMutation}
            onAfterSeek={reconcileNow}
            onSeekToTime={(time) => manualSeek(time, 'other')}
            onCollapseSidebar={() => onSidebarCollapsedChange(true)}
          />
          </div>
        )}
        </div>
      </div>

      <MediaPlaybackErrorDialog
        failure={playbackFailure}
        onClose={() => setPlaybackFailure(null)}
      />

      <ContentReviewDialog
        onPreview={previewContentReviewFinding}
        onStopPreview={stopContentReviewPreview}
        onReviewSessionOpen={captureContentReviewPlaybackSession}
        onReviewSessionExit={restoreContentReviewPlaybackSession}
        onApply={applyContentReviewToVeil}
        videoRef={videoRef}
        previewMode={isYouTube ? 'youtube' : isAudioMode ? 'audio' : 'local-video'}
        playbackTime={displayTime}
      />
    </section>
  )
}

