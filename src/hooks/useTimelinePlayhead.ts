import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimum delta (seconds) before updating playhead state. */
const PLAYHEAD_TIME_EPSILON = 1 / 120

export function useTimelinePlayhead(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  scrubOverrideTime: number | null = null
): number {
  const [playheadTime, setPlayheadTime] = useState(0)
  const playheadTimeRef = useRef(0)
  const rafIdRef = useRef(0)

  const applyPlayheadTime = useCallback((next: number): void => {
    if (!Number.isFinite(next)) {
      return
    }

    if (Math.abs(next - playheadTimeRef.current) <= PLAYHEAD_TIME_EPSILON) {
      return
    }

    playheadTimeRef.current = next
    setPlayheadTime(next)
  }, [])

  const syncPlayheadNow = useCallback((): void => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.currentTime)) {
      return
    }

    applyPlayheadTime(video.currentTime)
  }, [applyPlayheadTime, videoRef])

  const stopRaf = useCallback((): void => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }
  }, [])

  const tick = useCallback((): void => {
    const video = videoRef.current
    if (video && Number.isFinite(video.currentTime)) {
      applyPlayheadTime(video.currentTime)
    }

    if (video && !video.paused && !video.ended) {
      rafIdRef.current = requestAnimationFrame(tick)
    } else {
      rafIdRef.current = 0
    }
  }, [applyPlayheadTime, videoRef])

  const startRafIfPlaying = useCallback((): void => {
    stopRaf()
    const video = videoRef.current
    if (video && !video.paused && !video.ended) {
      rafIdRef.current = requestAnimationFrame(tick)
    }
  }, [stopRaf, tick, videoRef])

  useEffect(() => {
    if (scrubOverrideTime !== null && Number.isFinite(scrubOverrideTime)) {
      applyPlayheadTime(scrubOverrideTime)
    }
  }, [applyPlayheadTime, scrubOverrideTime])

  useEffect(() => {
    if (!enabled) {
      stopRaf()
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    syncPlayheadNow()

    const onPlay = (): void => {
      syncPlayheadNow()
      startRafIfPlaying()
    }

    const onPause = (): void => {
      stopRaf()
      syncPlayheadNow()
    }

    const onSeeked = (): void => {
      syncPlayheadNow()
    }

    const onTimeUpdate = (): void => {
      syncPlayheadNow()
    }

    const onLoadedMetadata = (): void => {
      syncPlayheadNow()
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)

    if (!video.paused && !video.ended) {
      startRafIfPlaying()
    }

    return () => {
      stopRaf()
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [enabled, startRafIfPlaying, stopRaf, syncPlayheadNow, videoRef])

  if (scrubOverrideTime !== null && Number.isFinite(scrubOverrideTime)) {
    return scrubOverrideTime
  }

  return playheadTime
}
