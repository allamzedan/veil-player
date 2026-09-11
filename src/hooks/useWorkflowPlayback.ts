import { useEffect, useRef } from 'react'
import { findActiveCueIndex } from '../lib/subtitleRuntime'
import { shouldApplyLoopJump, type SessionLoop } from '../lib/sessionLoop'
import type { SrtCue } from '../lib/srtParser'
import { setCurrentTimeDebug } from '../lib/debugState'

interface UseWorkflowPlaybackOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  subtitleCues: readonly SrtCue[]
  autoPauseAtCueEnd: boolean
  sessionLoop: SessionLoop
  enabled?: boolean
}

export function useWorkflowPlayback({
  videoRef,
  subtitleCues,
  autoPauseAtCueEnd,
  sessionLoop,
  enabled = true
}: UseWorkflowPlaybackOptions): void {
  const lastCueIndexRef = useRef(-1)
  const pausedAtCueEndRef = useRef(false)
  const previousTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    previousTimeRef.current = video.currentTime

    const onSeeked = (): void => {
      previousTimeRef.current = video.currentTime
    }

    const onTimeUpdate = (): void => {
      const time = video.currentTime
      const previousTime = previousTimeRef.current

      if (shouldApplyLoopJump(previousTime, time, sessionLoop, video.paused)) {
        setCurrentTimeDebug(video, 'loop', sessionLoop.start)
        previousTimeRef.current = sessionLoop.start
        return
      }

      previousTimeRef.current = time

      if (!autoPauseAtCueEnd || subtitleCues.length === 0) {
        return
      }

      const activeIndex = findActiveCueIndex(subtitleCues, time)

      if (activeIndex < 0) {
        lastCueIndexRef.current = -1
        pausedAtCueEndRef.current = false
        return
      }

      if (lastCueIndexRef.current !== activeIndex) {
        lastCueIndexRef.current = activeIndex
        pausedAtCueEndRef.current = false
      }

      const cue = subtitleCues[activeIndex]
      if (
        !pausedAtCueEndRef.current &&
        time >= cue.end - 0.05 &&
        !video.paused
      ) {
        video.pause()
        pausedAtCueEndRef.current = true
      }
    }

    video.addEventListener('seeked', onSeeked)
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [autoPauseAtCueEnd, enabled, sessionLoop, subtitleCues, videoRef])
}
