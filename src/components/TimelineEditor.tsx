import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { useTimelinePlayhead } from '../hooks/useTimelinePlayhead'
import { t } from '../i18n'
import {
  clampTimelineTime,
  clampTimelineHoverX,
  isTimeInViewport,
  resizeIntervalLeft,
  resizeIntervalRight,
  shiftInterval,
  shiftViewport,
  SNAP_THRESHOLD_SECONDS,
  snapTimeToNearestCue,
  timeToXPercent,
  timelineTimeFromPointer,
  zoomViewportAtTime
} from '../lib/timelineMath'
import { requestOpenSidebarPanel } from '../lib/sidebarPanelBridge'
import { isEditableTarget } from '../lib/keyboard'
import { isValidSessionLoop } from '../lib/sessionLoop'
import { incrementWorkflowMetric } from '../lib/workflowMetrics'
import { beginTrackHistoryCoalesced, endTrackHistoryCoalesced } from '../lib/trackHistory'
import type { SelectableItemType } from '../lib/trackItems'
import { includesTimelineSelectionItem } from '../lib/timelineMultiSelection'
import { buildGroupColorTokenMap } from '../lib/trackGrouping'
import { useVeilStore } from '../state/useVeilStore'
import type { TimelineBarItem, TimelineDragMode } from './TimelineBar'
import TimelineControls from './TimelineControls'
import TimelineRuler from './TimelineRuler'
import TimelineRow from './TimelineRow'
import { setCurrentTimeDebug } from '../lib/debugState'
import { canCreateRangeActions } from '../lib/authoringCapabilities'
import type { PlaybackCapabilities } from '../lib/playbackCapabilities'
import { bookmarkPositionPercent } from '../lib/bookmarkMarkers'
import { requestBookmarkToast } from '../lib/bookmarkInteractionBridge'
import type { InspectorSelectionNavigationIntent } from '../lib/inspectorSelectionNavigation'
import { TIMELINE_MARKER_CENTER_INSET_PX } from '../lib/bookmarkMarkerGeometry'
import { timelineViewportForSelection } from '../lib/timelineSelectionViewport'
import { formatSeconds } from '../lib/time'
import { clearTimelineSelection } from '../lib/timelineSelection'
import { timelineScrollLeftForPlayhead } from '../lib/timelineCentering'
import {
  isBlankSeekableTimelineTarget,
  shouldClearBlankTimelineSelection,
  shouldCompleteBlankTimelineDoubleClick
} from '../lib/timelineBlankSelection'

const ZOOM_FACTOR = 1.5
const MIN_VISIBLE_SECONDS = 1
const WHEEL_ZOOM_IN_FACTOR = 0.85
const WHEEL_ZOOM_OUT_FACTOR = 1.15
const FINE_ZOOM_IN_FACTOR = 0.9
const FINE_ZOOM_OUT_FACTOR = 1.1

interface DragSession {
  pointerId: number
  mode: TimelineDragMode
  itemId: string
  itemType: SelectableItemType
  startClientX: number
  originalStart: number
  originalEnd: number
}

interface ScrubSession {
  pointerId: number
}

interface PanSession {
  pointerId: number
  startClientX: number
  startViewStart: number
  startViewEnd: number
}

interface TimelineEditorProps {
  capabilities: PlaybackCapabilities
  videoRef: React.RefObject<HTMLVideoElement | null>
  duration: number
  bookmarkDuration: number
  activeMaskIds: ReadonlySet<string>
  activeMuteIds: ReadonlySet<string>
  activeSkipIds: ReadonlySet<string>
  getCurrentTime: () => number
  readOnly?: boolean
  sessionLoop?: import('../lib/sessionLoop').SessionLoop
  onAfterTimingMutation?: () => void
  onDurationCommit?: () => void
  onManualSeek?: (time: number, source?: 'timeline', targetBookmarkId?: string) => void
  playheadTimeOverride?: number | null
  playheadVisible?: boolean
  visible?: boolean
  onAddBookmark?: (intent?: InspectorSelectionNavigationIntent) => void
  onActivateItem?: (id: string, type: SelectableItemType, start: number, modifierSelection?: boolean, forceExclusive?: boolean) => void
}

function toBarItems<T extends { id: string; start: number; end: number; enabled?: boolean }>(
  items: T[],
  type: SelectableItemType
): TimelineBarItem[] {
  return items.map((item) => ({
    id: item.id,
    type,
    start: item.start,
    end: item.end,
    enabled: item.enabled
  }))
}

export default function TimelineEditor({
  capabilities,
  videoRef,
  duration,
  activeMaskIds,
  activeMuteIds,
  activeSkipIds,
  getCurrentTime,
  readOnly = false,
  sessionLoop,
  onAfterTimingMutation,
  onDurationCommit,
  onManualSeek,
  playheadTimeOverride = null,
  playheadVisible = true,
  visible = true,
  onAddBookmark,
  onActivateItem
}: TimelineEditorProps) {
  useLanguage()
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const groups = useVeilStore((state) => state.groups)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const selectedItems = useVeilStore((state) => state.selectedItems)
  const setSelectedItem = useVeilStore((state) => state.setSelectedItem)
  const selectTimelineItem = useVeilStore((state) => state.selectTimelineItem)
  const toggleSelectedItem = useVeilStore((state) => state.toggleSelectedItem)
  const patchTrackItemTiming = useVeilStore((state) => state.patchTrackItemTiming)
  const subtitleCues = useVeilStore((state) => state.subtitleCues)
  const globalOffsetSeconds = useVeilStore((state) => state.globalOffsetSeconds)
  const safeDuration = Math.max(duration, 0.001)

  const trackRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const usableTrackRef = useRef<HTMLDivElement>(null)
  const playheadLayerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const captureTargetRef = useRef<HTMLElement | null>(null)
  const viewStartRef = useRef(0)
  const viewEndRef = useRef(safeDuration)
  const dragSessionRef = useRef<DragSession | null>(null)
  const scrubSessionRef = useRef<ScrubSession | null>(null)
  const panSessionRef = useRef<PanSession | null>(null)
  const pendingFitRef = useRef(false)
  const blankLaneActivationRef = useRef<{
    clientX: number
    timeStamp: number
    restoreTime: number
  } | null>(null)

  const [viewStart, setViewStart] = useState(0)
  const [viewEnd, setViewEnd] = useState(safeDuration)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [layoutMetrics, setLayoutMetrics] = useState<{ viewportWidth: number; fixedWidth: number } | null>(null)

  const [dragSession, setDragSession] = useState<DragSession | null>(null)
  const [scrubSession, setScrubSession] = useState<ScrubSession | null>(null)
  const [panSession, setPanSession] = useState<PanSession | null>(null)
  const [previewStart, setPreviewStart] = useState<number | null>(null)
  const [previewEnd, setPreviewEnd] = useState<number | null>(null)
  const previewRef = useRef({ start: 0, end: 0 })
  const [snapToSubtitles, setSnapToSubtitles] = useState(true)
  const [snapPulse, setSnapPulse] = useState(false)
  const [scrubPlayheadTime, setScrubPlayheadTime] = useState<number | null>(null)
  const [hoverTime, setHoverTime] = useState<{ time: number; x: number } | null>(null)

  const videoPlayheadTime = useTimelinePlayhead(
    videoRef,
    duration > 0 && playheadTimeOverride === null,
    scrubSession ? scrubPlayheadTime : null
  )
  const playheadTime =
    scrubSession && scrubPlayheadTime !== null
      ? scrubPlayheadTime
      : (playheadTimeOverride ?? videoPlayheadTime)

  useEffect(() => {
    viewStartRef.current = viewStart
    viewEndRef.current = viewEnd
  }, [viewEnd, viewStart])

  useEffect(() => {
    dragSessionRef.current = dragSession
  }, [dragSession])

  useEffect(() => {
    scrubSessionRef.current = scrubSession
  }, [scrubSession])

  useEffect(() => {
    panSessionRef.current = panSession
  }, [panSession])

  const selectLayer = useCallback(
    (id: string, type: SelectableItemType, modifierSelection = false, forceExclusive = false): void => {
      const item = type === 'bookmark'
        ? bookmarks.find((candidate) => candidate.id === id)
        : type === 'mask'
          ? masks.find((candidate) => candidate.id === id)
          : type === 'mute'
            ? mutes.find((candidate) => candidate.id === id)
            : skips.find((candidate) => candidate.id === id)
      if (!item) return
      if (onActivateItem) {
        onActivateItem(id, type, item.start, modifierSelection, forceExclusive)
        return
      }
      if (forceExclusive) setSelectedItem(id, type)
      else if (modifierSelection) toggleSelectedItem(id, type)
      else selectTimelineItem(id, type)
      const remainsSelected = includesTimelineSelectionItem(
        useVeilStore.getState().selectedItems,
        id,
        type
      )
      if (!remainsSelected) return
      if (type === 'bookmark') requestBookmarkToast(id)
      onManualSeek?.(item.start, 'timeline', type === 'bookmark' ? id : undefined)
      requestOpenSidebarPanel('selected')
    },
    [bookmarks, masks, mutes, onActivateItem, onManualSeek, selectTimelineItem, setSelectedItem, skips, toggleSelectedItem]
  )

  useEffect(() => {
    viewStartRef.current = 0
    viewEndRef.current = safeDuration
    setViewStart(0)
    setViewEnd(safeDuration)
    setZoomLevel(1)
    setLayoutMetrics(null)
    pendingFitRef.current = true
    setHoverTime(null)
  }, [safeDuration])

  const visibleDuration = useMemo(() => {
    return Math.max(viewEnd - viewStart, MIN_VISIBLE_SECONDS)
  }, [viewEnd, viewStart])

  const contentZoom = useMemo(() => {
    return Math.max(1, safeDuration / visibleDuration)
  }, [safeDuration, visibleDuration])
  const contentWidth = layoutMetrics
    ? `${layoutMetrics.fixedWidth + Math.max(layoutMetrics.viewportWidth - layoutMetrics.fixedWidth, 1) * contentZoom}px`
    : `${contentZoom * 100}%`

  const manualMasks = useMemo(
    () => masks.filter((mask) => mask.source?.kind !== 'srt'),
    [masks]
  )
  const subtitleMasks = useMemo(
    () => masks.filter((mask) => mask.source?.kind === 'srt'),
    [masks]
  )

  const manualMaskBars = useMemo(() => toBarItems(manualMasks, 'mask'), [manualMasks])
  const subtitleMaskBars = useMemo(() => toBarItems(subtitleMasks, 'mask'), [subtitleMasks])
  const muteBars = useMemo(() => toBarItems(mutes, 'mute'), [mutes])
  const skipBars = useMemo(() => toBarItems(skips, 'skip'), [skips])

  const groupColorByItemId = useMemo(() => buildGroupColorTokenMap(groups), [groups])

  const totalItems = masks.length + mutes.length + skips.length
  const hasRangeAuthoring = canCreateRangeActions(capabilities)
  const rangeLaneCount = Number(capabilities.canCreateMask) +
    Number(capabilities.canCreateMuteRange) + Number(capabilities.canCreateSkipRange)
  const timelineLaneHeaders = [
    ...(capabilities.canCreateMask
      ? [{ key: 'mask', type: 'mask', label: t('timeline.masks') } as const]
      : []),
    ...(capabilities.canCreateMask && subtitleMasks.length > 0
      ? [{ key: 'subtitles', type: 'mask', label: t('timeline.subs') } as const]
      : []),
    ...(capabilities.canCreateMuteRange
      ? [{ key: 'mute', type: 'mute', label: t('timeline.mutes') } as const]
      : []),
    ...(capabilities.canCreateSkipRange
      ? [{ key: 'skip', type: 'skip', label: t('timeline.skips') } as const]
      : [])
  ]

  const selectedItem = useMemo(() => {
    if (!selectedItemId || !selectedItemType) {
      return null
    }
    if (selectedItemType === 'bookmark') {
      return bookmarks.find((item) => item.id === selectedItemId) ?? null
    }
    if (selectedItemType === 'mask') {
      return masks.find((item) => item.id === selectedItemId) ?? null
    }
    if (selectedItemType === 'mute') {
      return mutes.find((item) => item.id === selectedItemId) ?? null
    }
    return skips.find((item) => item.id === selectedItemId) ?? null
  }, [bookmarks, masks, mutes, selectedItemId, selectedItemType, skips])

  const maybeSnapTime = useCallback(
    (time: number): number => {
      if (!snapToSubtitles || subtitleCues.length === 0) {
        return time
      }
      const snapped = snapTimeToNearestCue(
        time,
        subtitleCues,
        globalOffsetSeconds,
        SNAP_THRESHOLD_SECONDS
      )
      if (snapped !== time) {
        incrementWorkflowMetric('snapEngage')
        setSnapPulse(true)
        window.setTimeout(() => setSnapPulse(false), 150)
      }
      return snapped
    },
    [globalOffsetSeconds, snapToSubtitles, subtitleCues]
  )

  const playheadInViewport = playheadVisible && isTimeInViewport(playheadTime, viewStart, viewEnd)
  const playheadLeft = bookmarkPositionPercent(playheadTime, safeDuration) ?? 0

  const releaseCapture = useCallback((pointerId: number): void => {
    const target = captureTargetRef.current
    if (target?.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    captureTargetRef.current = null
  }, [])

  const clearDragUi = useCallback((): void => {
    setDragSession(null)
    setPreviewStart(null)
    setPreviewEnd(null)
    dragSessionRef.current = null
  }, [])

  const clearScrubUi = useCallback((): void => {
    setScrubSession(null)
    scrubSessionRef.current = null
    setScrubPlayheadTime(null)
  }, [])

  const clearPanUi = useCallback((): void => {
    setPanSession(null)
    panSessionRef.current = null
  }, [])

  const getLaneRect = useCallback((): DOMRect | null => {
    return usableTrackRef.current?.getBoundingClientRect() ?? null
  }, [])

  const measureTimelineLayout = useCallback((): void => {
    const viewport = viewportRef.current
    const content = contentRef.current
    const usableTrack = usableTrackRef.current
    if (!viewport || !content || !usableTrack || viewport.clientWidth <= 0) return
    const contentWidth = content.getBoundingClientRect().width
    const usableWidth = usableTrack.getBoundingClientRect().width
    const next = {
      viewportWidth: viewport.clientWidth,
      fixedWidth: Math.max(0, contentWidth - usableWidth)
    }
    setLayoutMetrics((current) => current &&
      Math.abs(current.viewportWidth - next.viewportWidth) < 0.5 &&
      Math.abs(current.fixedWidth - next.fixedWidth) < 0.5
      ? current
      : next)
  }, [])

  const pointerTimeFromClientX = useCallback((clientX: number): number | null => {
    const viewport = viewportRef.current
    const content = contentRef.current
    const usableTrack = usableTrackRef.current
    if (!viewport || !content || !usableTrack) return null

    const viewportRect = viewport.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    const usableRect = usableTrack.getBoundingClientRect()
    if (viewportRect.width <= 0 || contentRect.width <= 0 || usableRect.width <= 0) return null

    return timelineTimeFromPointer({
      clientX,
      trackLeft: viewportRect.left,
      visibleTrackWidth: viewportRect.width,
      scrollLeft: viewport.scrollLeft,
      virtualTrackWidth: contentRect.width,
      duration: safeDuration,
      usableInsetStart: usableRect.left - contentRect.left,
      usableInsetEnd: contentRect.right - usableRect.right
    })
  }, [safeDuration])

  interface ViewportAnchor {
    clientX: number
    anchorTime: number
    laneEl: HTMLElement
  }

  const restoreViewportScroll = useCallback(
    (next: { viewStart: number; viewEnd: number }): boolean => {
      const viewport = viewportRef.current
      if (!viewport || viewport.clientWidth <= 0 || viewport.scrollWidth <= 0) {
        return false
      }

      const nextVisible = Math.max(next.viewEnd - next.viewStart, MIN_VISIBLE_SECONDS)
      const scrollableDuration = Math.max(safeDuration - nextVisible, 0)
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      if (maxScroll <= 0 || scrollableDuration <= 0) {
        viewport.scrollLeft = 0
        return true
      }

      viewport.scrollLeft = (next.viewStart / scrollableDuration) * maxScroll
      return true
    },
    [safeDuration]
  )

  const applyViewport = useCallback(
    (next: { viewStart: number; viewEnd: number }, anchor?: ViewportAnchor): void => {
      viewStartRef.current = next.viewStart
      viewEndRef.current = next.viewEnd
      setViewStart(next.viewStart)
      setViewEnd(next.viewEnd)

      const nextVisible = next.viewEnd - next.viewStart
      if (nextVisible > 0) {
        setZoomLevel(safeDuration / nextVisible)
      }

      requestAnimationFrame(() => {
        const viewport = viewportRef.current
        if (!viewport || viewport.clientWidth <= 0 || viewport.scrollWidth <= 0) {
          return
        }

        const visibleDuration = Math.max(next.viewEnd - next.viewStart, MIN_VISIBLE_SECONDS)
        const scrollableDuration = Math.max(safeDuration - visibleDuration, 0)
        const maxScroll = viewport.scrollWidth - viewport.clientWidth

        if (maxScroll <= 0 || scrollableDuration <= 0) {
          viewport.scrollLeft = 0
          return
        }

        restoreViewportScroll(next)

        if (!anchor) {
          return
        }

        requestAnimationFrame(() => {
          const laneRect = anchor.laneEl.getBoundingClientRect()
          if (laneRect.width <= 0) {
            return
          }

          const anchorXPercent = timeToXPercent(anchor.anchorTime, next.viewStart, next.viewEnd)
          const anchorScreenX = laneRect.left + (anchorXPercent / 100) * laneRect.width
          const scrollDelta = anchor.clientX - anchorScreenX

          if (Math.abs(scrollDelta) > 0.5) {
            viewport.scrollLeft = Math.max(0, Math.min(maxScroll, viewport.scrollLeft + scrollDelta))
          }
        })
      })
    },
    [restoreViewportScroll, safeDuration]
  )

  const seekFromClientX = useCallback(
    (clientX: number): void => {
      const nextTime = pointerTimeFromClientX(clientX)
      if (nextTime === null) return

      if (onManualSeek) {
        onManualSeek(nextTime, 'timeline')
      } else {
        const video = videoRef.current
        if (!video) {
          return
        }
        setCurrentTimeDebug(video, 'timeline', nextTime)
      }

      if (scrubSessionRef.current) {
        setScrubPlayheadTime(nextTime)
      }
      onAfterTimingMutation?.()
    },
    [onAfterTimingMutation, onManualSeek, pointerTimeFromClientX, videoRef]
  )

  const updateHoverTime = useCallback((event: React.PointerEvent<HTMLDivElement>): void => {
    if (dragSessionRef.current || panSessionRef.current) {
      setHoverTime(null)
      return
    }
    const target = event.target
    if (target instanceof HTMLElement && target.closest('.timeline-bar, .timeline-bookmark-marker, .timeline-playhead__hit')) {
      setHoverTime(null)
      return
    }
    const viewport = viewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const time = pointerTimeFromClientX(event.clientX)
    if (time === null) return
    setHoverTime({
      time,
      x: viewport.offsetLeft + clampTimelineHoverX(event.clientX - rect.left, rect.width)
    })
  }, [pointerTimeFromClientX])

  const panViewportByTimeDelta = useCallback(
    (deltaSeconds: number): void => {
      const next = shiftViewport(
        viewStartRef.current,
        viewEndRef.current,
        safeDuration,
        deltaSeconds,
        MIN_VISIBLE_SECONDS
      )
      applyViewport(next)
    },
    [applyViewport, safeDuration]
  )

  const performFitViewport = useCallback((): void => {
    const viewport = viewportRef.current
    if (!viewport || viewport.clientWidth <= 0) {
      pendingFitRef.current = true
      return
    }
    pendingFitRef.current = false
    viewStartRef.current = 0
    viewEndRef.current = safeDuration
    setViewStart(0)
    setViewEnd(safeDuration)
    setZoomLevel(1)
    viewport.scrollLeft = 0
  }, [safeDuration])

  const fitViewport = useCallback((): void => {
    performFitViewport()
  }, [performFitViewport])

  useEffect(() => {
    if (!visible) return
    const viewport = viewportRef.current
    if (!viewport) return

    const restoreWhenMeasurable = (): void => {
      if (viewport.clientWidth <= 0) return
      measureTimelineLayout()
      if (pendingFitRef.current) {
        performFitViewport()
        return
      }
      restoreViewportScroll({
        viewStart: viewStartRef.current,
        viewEnd: viewEndRef.current
      })
    }

    const frame = requestAnimationFrame(restoreWhenMeasurable)
    const observer = new ResizeObserver((entries) => {
      if (entries.every((entry) => entry.contentRect.width <= 0)) return
      restoreWhenMeasurable()
    })
    observer.observe(viewport)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [measureTimelineLayout, performFitViewport, restoreViewportScroll, visible])

  const zoomIn = useCallback((): void => {
    const center = getCurrentTime()
    const nextZoom = zoomLevel * ZOOM_FACTOR
    const nextVisible = Math.max(safeDuration / nextZoom, MIN_VISIBLE_SECONDS)
    let nextStart = center - nextVisible / 2
    nextStart = Math.max(0, Math.min(nextStart, safeDuration - nextVisible))
    setZoomLevel(nextZoom)
    setViewStart(nextStart)
    setViewEnd(Math.min(nextStart + nextVisible, safeDuration))
  }, [getCurrentTime, safeDuration, zoomLevel])

  const zoomFine = useCallback(
    (factor: number): void => {
      const currentStart = viewStartRef.current
      const currentEnd = viewEndRef.current
      const currentRange = currentEnd - currentStart
      const center = getCurrentTime()
      const anchorRatio =
        currentRange > 0 ? Math.min(1, Math.max(0, (center - currentStart) / currentRange)) : 0.5

      const next = zoomViewportAtTime(
        currentStart,
        currentEnd,
        safeDuration,
        center,
        anchorRatio,
        factor,
        MIN_VISIBLE_SECONDS
      )
      applyViewport(next)
    },
    [applyViewport, getCurrentTime, safeDuration]
  )

  const zoomToSelection = useCallback((): void => {
    if (!selectedItem) {
      return
    }
    const next = timelineViewportForSelection(
      selectedItemType === 'bookmark'
        ? { start: selectedItem.start }
        : { start: selectedItem.start, end: selectedItem.end },
      safeDuration,
      MIN_VISIBLE_SECONDS
    )
    if (next) applyViewport(next)
  }, [applyViewport, safeDuration, selectedItem, selectedItemType])

  const centerOnPlayhead = useCallback((): void => {
    const viewport = viewportRef.current
    const content = contentRef.current
    const usableTrack = usableTrackRef.current
    if (!viewport || !content || !usableTrack || viewport.clientWidth <= 0) return
    const contentRect = content.getBoundingClientRect()
    const usableRect = usableTrack.getBoundingClientRect()
    viewport.scrollLeft = timelineScrollLeftForPlayhead({
      playheadTime: getCurrentTime(),
      duration: safeDuration,
      viewportWidth: viewport.clientWidth,
      virtualTrackWidth: contentRect.width,
      usableInsetStart: usableRect.left - contentRect.left,
      usableInsetEnd: contentRect.right - usableRect.right
    })
  }, [getCurrentTime, safeDuration])

  useEffect(() => {
    if (selectedItemType !== 'bookmark' || !selectedItemId) return
    const bookmark = bookmarks.find((item) => item.id === selectedItemId)
    if (!bookmark || isTimeInViewport(bookmark.start, viewStartRef.current, viewEndRef.current)) return
    const visible = Math.max(viewEndRef.current - viewStartRef.current, MIN_VISIBLE_SECONDS)
    const nextStart = Math.max(0, Math.min(bookmark.start - visible / 2, safeDuration - visible))
    applyViewport({ viewStart: nextStart, viewEnd: Math.min(nextStart + visible, safeDuration) })
  }, [applyViewport, bookmarks, safeDuration, selectedItemId, selectedItemType])

  const zoomOut = useCallback((): void => {
    const nextZoom = Math.max(1, zoomLevel / ZOOM_FACTOR)
    if (nextZoom <= 1) {
      fitViewport()
      return
    }
    const center = (viewStart + viewEnd) / 2
    const nextVisible = Math.min(safeDuration, safeDuration / nextZoom)
    let nextStart = center - nextVisible / 2
    nextStart = Math.max(0, Math.min(nextStart, safeDuration - nextVisible))
    setZoomLevel(nextZoom)
    setViewStart(nextStart)
    setViewEnd(Math.min(nextStart + nextVisible, safeDuration))
  }, [fitViewport, safeDuration, viewEnd, viewStart, zoomLevel])

  const handleTimelineWheel = useCallback(
    (event: WheelEvent): void => {
      if (!Number.isFinite(safeDuration) || safeDuration <= 0) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const laneRect = getLaneRect()
      if (!laneRect || laneRect.width <= 0) {
        return
      }

      const currentStart = viewStartRef.current
      const currentEnd = viewEndRef.current
      const currentRange = currentEnd - currentStart
      if (currentRange <= 0) {
        return
      }

      if (event.shiftKey) {
        const secondsPerPixel = safeDuration / laneRect.width
        const panDelta = (event.deltaY + event.deltaX) * secondsPerPixel
        panViewportByTimeDelta(panDelta)
        return
      }

      const playhead = getCurrentTime()
      const anchorRatio = Math.min(
        1,
        Math.max(0, (playhead - currentStart) / currentRange)
      )
      const zoomFactor = event.deltaY < 0 ? WHEEL_ZOOM_IN_FACTOR : WHEEL_ZOOM_OUT_FACTOR
      const next = zoomViewportAtTime(
        currentStart,
        currentEnd,
        safeDuration,
        playhead,
        anchorRatio,
        zoomFactor,
        MIN_VISIBLE_SECONDS
      )
      applyViewport(next)
    },
    [applyViewport, getCurrentTime, getLaneRect, panViewportByTimeDelta, safeDuration]
  )

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const options: AddEventListenerOptions = { passive: false }
    viewport.addEventListener('wheel', handleTimelineWheel, options)

    return () => {
      viewport.removeEventListener('wheel', handleTimelineWheel)
    }
  }, [handleTimelineWheel])

  const onViewportScroll = (): void => {
    const viewport = viewportRef.current
    if (!viewport || viewport.clientWidth <= 0 || viewport.scrollWidth <= 0 || safeDuration <= 0) {
      return
    }
    const maxScroll = viewport.scrollWidth - viewport.clientWidth
    if (maxScroll <= 0) {
      return
    }
    const ratio = viewport.scrollLeft / maxScroll
    const currentVisible = Math.max(
      viewEndRef.current - viewStartRef.current,
      MIN_VISIBLE_SECONDS
    )
    const scrollableDuration = Math.max(safeDuration - currentVisible, 0)
    const nextStart = ratio * scrollableDuration
    const nextEnd = nextStart + currentVisible

    viewStartRef.current = nextStart
    viewEndRef.current = nextEnd
    setViewStart(nextStart)
    setViewEnd(nextEnd)
  }

  const commitDrag = useCallback(
    (session: DragSession, finalStart: number, finalEnd: number): void => {
      const snappedStart = maybeSnapTime(finalStart)
      const snappedEnd = maybeSnapTime(finalEnd)
      const clampedStart = clampTimelineTime(snappedStart, safeDuration)
      const clampedEnd = clampTimelineTime(snappedEnd, safeDuration)
      patchTrackItemTiming(session.itemId, session.itemType, clampedStart, clampedEnd)
      onAfterTimingMutation?.()
      onDurationCommit?.()
    },
    [maybeSnapTime, onAfterTimingMutation, onDurationCommit, patchTrackItemTiming, safeDuration]
  )

  const finishDrag = useCallback(
    (commit: boolean): void => {
      const session = dragSessionRef.current
      if (!session) {
        return
      }

      releaseCapture(session.pointerId)

      if (commit) {
        const { start: finalStart, end: finalEnd } = previewRef.current
        commitDrag(session, finalStart, finalEnd)
      }

      endTrackHistoryCoalesced(commit)
      clearDragUi()
    },
    [clearDragUi, commitDrag, releaseCapture]
  )

  const finishScrub = useCallback(
    (pointerId: number): void => {
      if (!scrubSessionRef.current) {
        return
      }
      releaseCapture(pointerId)
      clearScrubUi()
    },
    [clearScrubUi, releaseCapture]
  )

  const startScrub = useCallback(
    (event: React.PointerEvent<HTMLElement>): void => {
      if (dragSessionRef.current || panSessionRef.current) {
        return
      }

      event.preventDefault()
      seekFromClientX(event.clientX)

      event.currentTarget.setPointerCapture(event.pointerId)
      captureTargetRef.current = event.currentTarget
      const session = { pointerId: event.pointerId }
      scrubSessionRef.current = session
      setScrubSession(session)
      setScrubPlayheadTime(videoRef.current?.currentTime ?? null)
    },
    [seekFromClientX, videoRef]
  )

  const startPan = useCallback(
    (event: React.PointerEvent<HTMLElement>): void => {
      if (dragSessionRef.current || scrubSessionRef.current) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      event.currentTarget.setPointerCapture(event.pointerId)
      captureTargetRef.current = event.currentTarget

      const session: PanSession = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startViewStart: viewStartRef.current,
        startViewEnd: viewEndRef.current
      }
      panSessionRef.current = session
      setPanSession(session)
    },
    []
  )

  const onTracksPointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (event.button !== 0) return
      const blankTarget = isBlankSeekableTimelineTarget(event.target)
      const playheadTarget = (event.target as HTMLElement).closest?.('.timeline-playhead') !== null
      const previous = blankLaneActivationRef.current

      if (previous && shouldCompleteBlankTimelineDoubleClick({
        elapsedMs: event.timeStamp - previous.timeStamp,
        deltaX: Math.abs(event.clientX - previous.clientX),
        secondTargetIsBlankOrPlayhead: blankTarget || playheadTarget
      })) {
        event.preventDefault()
        event.stopPropagation()
        blankLaneActivationRef.current = null
        clearTimelineSelection()
        onManualSeek?.(previous.restoreTime, 'timeline')
        return
      }

      blankLaneActivationRef.current = blankTarget
        ? { clientX: event.clientX, timeStamp: event.timeStamp, restoreTime: getCurrentTime() }
        : null
    },
    [getCurrentTime, onManualSeek]
  )

  const onTrackPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (event.button === 1) {
        startPan(event)
        return
      }
      if (event.button !== 0) {
        return
      }
      if (!isBlankSeekableTimelineTarget(event.target)) return
      startScrub(event)
    },
    [startPan, startScrub]
  )

  const onTrackDoubleClick = useCallback((event: React.MouseEvent<HTMLDivElement>): void => {
    if (!shouldClearBlankTimelineSelection(event.target, 2)) return
    event.preventDefault()
    event.stopPropagation()
    clearTimelineSelection()
  }, [])

  const onDragStart = (
    item: TimelineBarItem,
    mode: TimelineDragMode,
    event: PointerEvent,
    captureEl: HTMLElement
  ): void => {
    if (readOnly) {
      return
    }

    const state = useVeilStore.getState()
    const lockedItem =
      item.type === 'mask'
        ? state.masks.find((entry) => entry.id === item.id)
        : item.type === 'mute'
          ? state.mutes.find((entry) => entry.id === item.id)
          : state.skips.find((entry) => entry.id === item.id)
    if (lockedItem?.locked) {
      return
    }

    if (pointerTimeFromClientX(event.clientX) === null) {
      return
    }

    event.preventDefault()
    captureEl.setPointerCapture(event.pointerId)
    captureTargetRef.current = captureEl

    const session: DragSession = {
      pointerId: event.pointerId,
      mode,
      itemId: item.id,
      itemType: item.type,
      startClientX: event.clientX,
      originalStart: item.start,
      originalEnd: item.end
    }

    beginTrackHistoryCoalesced()
    dragSessionRef.current = session
    setDragSession(session)
    previewRef.current = { start: item.start, end: item.end }
    setPreviewStart(item.start)
    setPreviewEnd(item.end)
  }

  useEffect(() => {
    if (!dragSession) {
      return
    }

    const onPointerMove = (event: PointerEvent): void => {
      const session = dragSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }

      const startTime = pointerTimeFromClientX(session.startClientX)
      const currentTime = pointerTimeFromClientX(event.clientX)
      if (startTime === null || currentTime === null) {
        return
      }
      const delta = currentTime - startTime

      let nextStart = session.originalStart
      let nextEnd = session.originalEnd

      if (session.mode === 'move') {
        const shifted = shiftInterval(
          session.originalStart,
          session.originalEnd,
          delta,
          safeDuration
        )
        nextStart = shifted.start
        nextEnd = shifted.end
      } else if (session.mode === 'resize-left') {
        const resized = resizeIntervalLeft(
          session.originalStart,
          session.originalEnd,
          session.originalStart + delta
        )
        nextStart = resized.start
        nextEnd = resized.end
      } else {
        const resized = resizeIntervalRight(
          session.originalStart,
          session.originalEnd,
          session.originalEnd + delta
        )
        nextStart = resized.start
        nextEnd = resized.end
      }

      const snappedStart = maybeSnapTime(nextStart)
      const snappedEnd = maybeSnapTime(nextEnd)
      previewRef.current = { start: snappedStart, end: snappedEnd }
      setPreviewStart(snappedStart)
      setPreviewEnd(snappedEnd)
    }

    const onPointerUp = (event: PointerEvent): void => {
      const session = dragSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }
      finishDrag(true)
    }

    const onPointerCancel = (event: PointerEvent): void => {
      const session = dragSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }
      finishDrag(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [dragSession, finishDrag, maybeSnapTime, pointerTimeFromClientX, safeDuration])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target) || !event.altKey || !event.ctrlKey) {
        return
      }

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return
      }

      if (!selectedItem || !selectedItemType) {
        return
      }

      event.preventDefault()
      const delta = (event.shiftKey ? 1 : 0.1) * (event.key === 'ArrowLeft' ? -1 : 1)
      const shifted = shiftInterval(
        selectedItem.start,
        selectedItem.end,
        delta,
        safeDuration
      )
      patchTrackItemTiming(
        selectedItem.id,
        selectedItemType,
        shifted.start,
        shifted.end
      )
      onAfterTimingMutation?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    onAfterTimingMutation,
    patchTrackItemTiming,
    safeDuration,
    selectedItem,
    selectedItemType
  ])

  useEffect(() => {
    if (!scrubSession) {
      return
    }

    const onPointerMove = (event: PointerEvent): void => {
      const session = scrubSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }

      seekFromClientX(event.clientX)
    }

    const onPointerUp = (event: PointerEvent): void => {
      const session = scrubSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }
      finishScrub(event.pointerId)
    }

    const onPointerCancel = (event: PointerEvent): void => {
      const session = scrubSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }
      finishScrub(event.pointerId)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [finishScrub, scrubSession, seekFromClientX])

  useEffect(() => {
    if (!panSession) {
      return
    }

    const finishPan = (pointerId: number): void => {
      if (!panSessionRef.current) {
        return
      }
      releaseCapture(pointerId)
      clearPanUi()
    }

    const onPointerMove = (event: PointerEvent): void => {
      const session = panSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }

      const rect = getLaneRect()
      if (!rect || rect.width <= 0) {
        return
      }

      const deltaX = event.clientX - session.startClientX
      const deltaSeconds = -(deltaX / rect.width) * safeDuration
      const next = shiftViewport(
        session.startViewStart,
        session.startViewEnd,
        safeDuration,
        deltaSeconds,
        MIN_VISIBLE_SECONDS
      )
      applyViewport(next)
    }

    const onPointerUp = (event: PointerEvent): void => {
      const session = panSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }
      finishPan(event.pointerId)
    }

    const onPointerCancel = (event: PointerEvent): void => {
      const session = panSessionRef.current
      if (!session || event.pointerId !== session.pointerId) {
        return
      }
      finishPan(event.pointerId)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [applyViewport, clearPanUi, getLaneRect, panSession, releaseCapture, safeDuration])

  if (totalItems === 0 && duration <= 0) {
    return null
  }

  return (
    <div
      className={`timeline-editor timeline-editor--ltr timeline-editor--range-lanes-${rangeLaneCount}${!hasRangeAuthoring ? ' timeline-editor--bookmark-only' : ''}${snapPulse ? ' timeline-editor--snap-pulse' : ''}${scrubSession ? ' timeline-editor--scrubbing' : ''}${panSession ? ' timeline-editor--panning' : ''}`}
      dir="ltr"
      aria-label={t('timeline.title')}
    >
      <TimelineControls
        capabilities={capabilities}
        duration={duration}
        getCurrentTime={getCurrentTime}
        videoRef={videoRef}
        snapToSubtitles={snapToSubtitles}
        hasSubtitleCues={subtitleCues.length > 0}
        onToggleSnapToSubtitles={() => setSnapToSubtitles((value) => !value)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomFineIn={() => zoomFine(FINE_ZOOM_IN_FACTOR)}
        onZoomFineOut={() => zoomFine(FINE_ZOOM_OUT_FACTOR)}
        onFit={fitViewport}
        onZoomToSelection={zoomToSelection}
        onCenterOnPlayhead={centerOnPlayhead}
        onSeekToTime={onManualSeek ? (time) => onManualSeek(time, 'timeline') : undefined}
        onAfterTimingMutation={onAfterTimingMutation}
        onAddBookmark={onAddBookmark}
      />
      <div className="timeline-editor__viewport-shell">
      {timelineLaneHeaders.length > 0 ? (
        <div className="timeline-editor__lane-headers" aria-hidden="true">
          <div className="timeline-editor__lane-header-corner" />
          <div className="timeline-editor__lane-header-tracks">
            {timelineLaneHeaders.map((lane) => (
              <div key={lane.key} className={`timeline-row__label timeline-row__label--${lane.type}`}>
                {lane.label}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div
        ref={viewportRef}
        className="timeline-editor__viewport"
        onScroll={onViewportScroll}
        onPointerMove={updateHoverTime}
        onPointerLeave={() => setHoverTime(null)}
      >
        <div
          ref={contentRef}
          className="timeline-editor__content"
          style={{
            width: contentWidth,
            '--timeline-bookmark-track-inset': `${TIMELINE_MARKER_CENTER_INSET_PX}px`
          } as CSSProperties}
        >
          <TimelineRuler
            viewStart={viewStart}
            viewEnd={viewEnd}
            duration={safeDuration}
            bookmarks={bookmarks}
            selectedItemId={selectedItemId}
            selectedItemType={selectedItemType}
            selectedItems={selectedItems}
            onSelectBookmark={(id, toggleSelected) => selectLayer(id, 'bookmark', toggleSelected)}
            onSelectBookmarkExclusive={(id) => selectLayer(id, 'bookmark', false, true)}
            onBlankDoubleClick={onTrackDoubleClick}
            usableTrackRef={usableTrackRef}
          />
          {sessionLoop && isValidSessionLoop(sessionLoop) ? (
            <div className="timeline-editor__loop-band-track" aria-hidden>
              <div
                className="timeline-editor__loop-band"
                style={{
                  left: `${timeToXPercent(sessionLoop.start, 0, safeDuration)}%`,
                  width: `${Math.max(0, timeToXPercent(sessionLoop.end, 0, safeDuration) - timeToXPercent(sessionLoop.start, 0, safeDuration))}%`
                }}
              />
            </div>
          ) : null}
          <div
            ref={trackRef}
            className="timeline-editor__tracks"
            onPointerDownCapture={onTracksPointerDownCapture}
          >
            <div
              ref={playheadLayerRef}
              className="timeline-playhead-layer"
              aria-hidden={!playheadInViewport}
            >
              <div
                className="timeline-playhead"
                style={{
                  left: `${playheadLeft}%`,
                  visibility: playheadInViewport ? 'visible' : 'hidden'
                }}
              >
                <button
                  type="button"
                  className="timeline-playhead__hit"
                  aria-label={t('timeline.playheadScrub')}
                  onPointerDown={startScrub}
                />
              </div>
            </div>
            {capabilities.canCreateMask ? (
              <>
            <TimelineRow
              items={manualMaskBars}
              itemType="mask"
              duration={safeDuration}
              selectedItemId={selectedItemId}
              selectedItemType={selectedItemType}
              selectedItems={selectedItems}
              activeIds={activeMaskIds}
              dragItemId={dragSession?.itemId ?? null}
              previewStart={previewStart}
              previewEnd={previewEnd}
              onSelect={selectLayer}
              onSelectExclusive={(id, type) => selectLayer(id, type, false, true)}
              onDragStart={onDragStart}
              onTrackPointerDown={onTrackPointerDown}
              onTrackDoubleClick={onTrackDoubleClick}
              groupColorByItemId={groupColorByItemId}
            />
            {subtitleMasks.length > 0 ? (
              <TimelineRow
                items={subtitleMaskBars}
                groupColorByItemId={groupColorByItemId}
                itemType="mask"
                duration={safeDuration}
                selectedItemId={selectedItemId}
                selectedItemType={selectedItemType}
                selectedItems={selectedItems}
                activeIds={activeMaskIds}
                dragItemId={dragSession?.itemId ?? null}
                previewStart={previewStart}
                previewEnd={previewEnd}
                onSelect={selectLayer}
                onSelectExclusive={(id, type) => selectLayer(id, type, false, true)}
                onDragStart={onDragStart}
                onTrackPointerDown={onTrackPointerDown}
                onTrackDoubleClick={onTrackDoubleClick}
              />
            ) : null}
              </>
            ) : null}
            {capabilities.canCreateMuteRange ? (
            <TimelineRow
              items={muteBars}
              groupColorByItemId={groupColorByItemId}
              itemType="mute"
              duration={safeDuration}
              selectedItemId={selectedItemId}
              selectedItemType={selectedItemType}
              selectedItems={selectedItems}
              activeIds={activeMuteIds}
              dragItemId={dragSession?.itemId ?? null}
              previewStart={previewStart}
              previewEnd={previewEnd}
              onSelect={selectLayer}
              onSelectExclusive={(id, type) => selectLayer(id, type, false, true)}
              onDragStart={onDragStart}
              onTrackPointerDown={onTrackPointerDown}
              onTrackDoubleClick={onTrackDoubleClick}
            />
            ) : null}
            {capabilities.canCreateSkipRange ? (
            <TimelineRow
              items={skipBars}
              groupColorByItemId={groupColorByItemId}
              itemType="skip"
              duration={safeDuration}
              selectedItemId={selectedItemId}
              selectedItemType={selectedItemType}
              selectedItems={selectedItems}
              activeIds={activeSkipIds}
              dragItemId={dragSession?.itemId ?? null}
              previewStart={previewStart}
              previewEnd={previewEnd}
              onSelect={selectLayer}
              onSelectExclusive={(id, type) => selectLayer(id, type, false, true)}
              onDragStart={onDragStart}
              onTrackPointerDown={onTrackPointerDown}
              onTrackDoubleClick={onTrackDoubleClick}
            />
            ) : null}
          </div>
        </div>
      </div>
      {hoverTime ? (
        <output
          className="timeline-editor__hover-time ltr-digits"
          style={{ left: hoverTime.x }}
          aria-hidden="true"
        >
          {formatSeconds(hoverTime.time)}
        </output>
      ) : null}
      </div>
    </div>
  )
}
