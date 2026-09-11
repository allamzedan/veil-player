import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { reconcilePlayback } from '../lib/reconciler'
import { buildReconcileItems, PLAYBACK_EPSILON } from '../lib/trackItems'
import { useVeilStore } from '../state/useVeilStore'
import type { MaskTrackItem, MuteTrackItem, SkipTrackItem } from '../types/track'
import { setCurrentTimeDebug, updateSeekDebug } from '../lib/debugState'
import { localSkipHostTarget } from '../lib/localSkipPlayback'

function activeIdsKey(items: ReadonlyArray<{ id: string }>): string {
  if (items.length === 0) {
    return ''
  }

  const ids = items.map((item) => item.id)
  ids.sort()
  return ids.join('\0')
}

export interface UsePlaybackLoopResult {
  activeMasks: MaskTrackItem[]
  activeMutes: MuteTrackItem[]
  activeSkips: SkipTrackItem[]
  reconcileNow: () => void
  resetSkipLatch: () => void
  suppressSkipOnce: (id: string) => void
  resetPlaybackEngine: () => void
}

export interface UsePlaybackLoopOptions {
  videoRef: RefObject<HTMLVideoElement | null>
  /** When false, the rAF loop does not run (reconcileNow still works). Default true. */
  enabled?: boolean
}

export function usePlaybackLoop({
  videoRef,
  enabled = true
}: UsePlaybackLoopOptions): UsePlaybackLoopResult {
  const [activeMasks, setActiveMasks] = useState<MaskTrackItem[]>([])
  const [activeMutes, setActiveMutes] = useState<MuteTrackItem[]>([])
  const [activeSkips, setActiveSkips] = useState<SkipTrackItem[]>([])

  const activeMaskIdsKeyRef = useRef('')
  const activeMuteIdsKeyRef = useRef('')
  const activeSkipIdsKeyRef = useRef('')
  const rafIdRef = useRef<number | null>(null)

  const userMutedRef = useRef(false)
  const veilMutedActiveRef = useRef(false)
  const lastAppliedSkipIdRef = useRef<string | null>(null)
  const lastLatchedSkipRef = useRef<SkipTrackItem | null>(null)

  const resetSkipLatch = useCallback((): void => {
    lastAppliedSkipIdRef.current = null
    lastLatchedSkipRef.current = null
    updateSeekDebug({ skipLatchState: 'reset' })
  }, [])

  const suppressSkipOnce = useCallback((id: string): void => {
    const skip = useVeilStore.getState().skips.find((item) => item.id === id) ?? null
    lastAppliedSkipIdRef.current = id
    lastLatchedSkipRef.current = skip
    updateSeekDebug({ skipLatchState: `inspection ${id}` })
  }, [])

  const resetPlaybackEngine = useCallback((): void => {
    const video = videoRef.current

    resetSkipLatch()

    if (veilMutedActiveRef.current && video) {
      video.muted = userMutedRef.current
      veilMutedActiveRef.current = false
    }

    userMutedRef.current = video?.muted ?? false
    activeMaskIdsKeyRef.current = ''
    activeMuteIdsKeyRef.current = ''
    activeSkipIdsKeyRef.current = ''
    setActiveMasks([])
    setActiveMutes([])
    setActiveSkips([])
  }, [resetSkipLatch, videoRef])

  const applyMuteEngine = useCallback(
    (video: HTMLVideoElement, nextMutes: MuteTrackItem[]): void => {
      if (nextMutes.length > 0) {
        if (!veilMutedActiveRef.current) {
          userMutedRef.current = video.muted
          veilMutedActiveRef.current = true
        }
        video.muted = true
        return
      }

      if (veilMutedActiveRef.current) {
        video.muted = userMutedRef.current
        veilMutedActiveRef.current = false
      }
    },
    []
  )

  const applySkipEngine = useCallback(
    (video: HTMLVideoElement, nextSkips: SkipTrackItem[], allSkips: SkipTrackItem[], globalOffsetSeconds: number): void => {
      if (video.paused) {
        return
      }

      const currentTime = video.currentTime

      if (nextSkips.length === 0) {
        resetSkipLatch()
        return
      }

      const skip = nextSkips[0]
      const latchedSkip = lastLatchedSkipRef.current

      if (latchedSkip && currentTime > latchedSkip.end - globalOffsetSeconds + PLAYBACK_EPSILON) {
        resetSkipLatch()
      }

      if (latchedSkip && currentTime < latchedSkip.start - globalOffsetSeconds - PLAYBACK_EPSILON) {
        resetSkipLatch()
      }

      if (currentTime < skip.start - globalOffsetSeconds - PLAYBACK_EPSILON) {
        resetSkipLatch()
        return
      }

      if (currentTime > skip.end - globalOffsetSeconds + PLAYBACK_EPSILON) {
        return
      }

      const shouldApply =
        lastAppliedSkipIdRef.current !== skip.id &&
        currentTime >= skip.start - globalOffsetSeconds - PLAYBACK_EPSILON &&
        currentTime + globalOffsetSeconds < skip.end - PLAYBACK_EPSILON

      if (!shouldApply) {
        return
      }

      const nextTime = localSkipHostTarget({ currentTime, duration: video.duration, globalOffsetSeconds, activeSkips: nextSkips, allSkips })
      if (nextTime === null) return
      setCurrentTimeDebug(video, 'skip', nextTime)
      lastAppliedSkipIdRef.current = skip.id
      lastLatchedSkipRef.current = skip
      updateSeekDebug({ skipLatchState: `latched ${skip.id} ${skip.start.toFixed(3)}-${skip.end.toFixed(3)}` })
    },
    [resetSkipLatch]
  )

  const reconcileNow = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const { masks, mutes, skips, globalOffsetSeconds } = useVeilStore.getState()
    const { activeMasks: nextMasks, activeMutes: nextMutes, activeSkips: nextSkips } =
      reconcilePlayback(
        {
          items: buildReconcileItems(masks, mutes, skips),
          globalOffsetSeconds
        },
        video.currentTime
      )

    applyMuteEngine(video, nextMutes)
    applySkipEngine(video, nextSkips, skips, globalOffsetSeconds)

    const nextMaskKey = activeIdsKey(nextMasks)
    if (nextMaskKey !== activeMaskIdsKeyRef.current) {
      activeMaskIdsKeyRef.current = nextMaskKey
      setActiveMasks(nextMasks)
    }

    const nextMuteKey = activeIdsKey(nextMutes)
    if (nextMuteKey !== activeMuteIdsKeyRef.current) {
      activeMuteIdsKeyRef.current = nextMuteKey
      setActiveMutes(nextMutes)
    }

    const nextSkipKey = activeIdsKey(nextSkips)
    if (nextSkipKey !== activeSkipIdsKeyRef.current) {
      activeSkipIdsKeyRef.current = nextSkipKey
      setActiveSkips(nextSkips)
    }
  }, [applyMuteEngine, applySkipEngine, videoRef])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    userMutedRef.current = video.muted

    const onVolumeChange = (): void => {
      if (!veilMutedActiveRef.current) {
        userMutedRef.current = video.muted
      }
    }

    video.addEventListener('volumechange', onVolumeChange)

    return () => {
      video.removeEventListener('volumechange', onVolumeChange)
    }
  }, [videoRef])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const tick = (): void => {
      const video = videoRef.current
      if (video && !video.paused) {
        reconcileNow()
      }
      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [enabled, reconcileNow, videoRef])

  return {
    activeMasks,
    activeMutes,
    activeSkips,
    reconcileNow,
    resetSkipLatch,
    suppressSkipOnce,
    resetPlaybackEngine
  }
}
