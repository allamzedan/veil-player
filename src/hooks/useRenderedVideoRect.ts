import { useCallback, useEffect, useState } from 'react'
import {
  getRenderedVideoRectInStage,
  type VideoContentLayout
} from '../lib/videoRect'

export function useRenderedVideoRect(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  stageRef: React.RefObject<HTMLElement | null>,
  /** Bumps measurement when external layout changes (sidebar/timeline chrome). */
  layoutKey?: unknown
): VideoContentLayout | null {
  const [layout, setLayout] = useState<VideoContentLayout | null>(null)

  const measure = useCallback((): void => {
    const video = videoRef.current
    const stage = stageRef.current

    if (!video || !stage) {
      setLayout(null)
      return
    }

    setLayout(getRenderedVideoRectInStage(video, stage))
  }, [stageRef, videoRef])

  useEffect(() => {
    measure()

    const video = videoRef.current
    const stage = stageRef.current

    if (!video || !stage) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      measure()
    })

    resizeObserver.observe(stage)
    resizeObserver.observe(video)

    video.addEventListener('loadedmetadata', measure)
    video.addEventListener('resize', measure)
    document.addEventListener('fullscreenchange', measure)

    return () => {
      resizeObserver.disconnect()
      video.removeEventListener('loadedmetadata', measure)
      video.removeEventListener('resize', measure)
      document.removeEventListener('fullscreenchange', measure)
    }
  }, [layoutKey, measure, stageRef, videoRef])

  return layout
}

