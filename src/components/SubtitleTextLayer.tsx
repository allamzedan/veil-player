import { useEffect, useMemo, useRef, useState } from 'react'
import { useMotionPreferences } from '../hooks/useMotionPreferences'
import { shouldAnimateTransitions } from '../lib/motionPreferences'
import { shouldRenderSubtitleTextLayer } from '../lib/subtitleCoverDefaults'
import { findActiveCueIndex } from '../lib/subtitleRuntime'
import {
  readSubtitlePresentation,
  subscribeSubtitlePresentation
} from '../lib/subtitlePresentationPreferences'
import { useVeilStore } from '../state/useVeilStore'
import { responsiveSubtitleFontSize } from '../lib/subtitleResponsiveSize'

interface SubtitleTextLayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  contentLayout: { width: number; height: number } | null
  subtitleRevealActive: boolean
  momentaryRevealActive: boolean
}

export default function SubtitleTextLayer({
  videoRef,
  contentLayout,
  subtitleRevealActive,
  momentaryRevealActive
}: SubtitleTextLayerProps) {
  const subtitleCues = useVeilStore((state) => state.subtitleCues)
  const showSubtitleText = useVeilStore((state) => state.showSubtitleText)
  const subtitleCoverMode = useVeilStore((state) => state.subtitleCoverMode)
  const motionPrefs = useMotionPreferences()
  const motionAllowed = shouldAnimateTransitions(motionPrefs)

  const [appearanceTick, setAppearanceTick] = useState(0)
  const [fallbackViewport, setFallbackViewport] = useState<{ width: number; height: number } | null>(null)
  const activeCueIndexRef = useRef(-1)
  const [activeCueIndex, setActiveCueIndex] = useState(-1)

  useEffect(() => subscribeSubtitlePresentation(() => setAppearanceTick((n) => n + 1)), [])

  useEffect(() => {
    if (contentLayout) {
      setFallbackViewport(null)
      return
    }
    const video = videoRef.current
    if (!video) return
    const measure = (): void => {
      const rect = video.getBoundingClientRect()
      setFallbackViewport((current) =>
        current?.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height }
      )
    }
    const observer = new ResizeObserver(measure)
    observer.observe(video)
    document.addEventListener('fullscreenchange', measure)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer.disconnect()
      document.removeEventListener('fullscreenchange', measure)
      window.removeEventListener('resize', measure)
    }
  }, [contentLayout, videoRef])

  const cssColor = (hex: string, opacity: number): string => {
    const red = Number.parseInt(hex.slice(1, 3), 16)
    const green = Number.parseInt(hex.slice(3, 5), 16)
    const blue = Number.parseInt(hex.slice(5, 7), 16)
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`
  }

  const fontFamilies = {
    default: 'inherit',
    'sans-serif': 'Arial, sans-serif',
    serif: 'Georgia, serif',
    monospace: 'Consolas, monospace'
  } as const

  const presentationStyle = useMemo(() => {
    void appearanceTick
    const prefs = readSubtitlePresentation()
    const shadowAlpha = prefs.shadowStrength
    return {
      ['--subtitle-font-scale' as string]: String(prefs.fontScale),
      ['--subtitle-rendered-font-size' as string]: `${responsiveSubtitleFontSize({
        viewportWidth: contentLayout?.width ?? fallbackViewport?.width ?? 0,
        viewportHeight: contentLayout?.height ?? fallbackViewport?.height ?? 0,
        configuredScale: prefs.fontScale
      })}px`,
      ['--subtitle-text-color' as string]: cssColor(prefs.textColor, prefs.textOpacity),
      ['--subtitle-bottom-offset' as string]: `${prefs.bottomOffsetPercent}%`,
      ['--subtitle-shadow' as string]: `0 2px 8px rgba(0, 0, 0, ${shadowAlpha})`,
      ['--subtitle-font-family' as string]: fontFamilies[prefs.fontFamily],
      ['--subtitle-background' as string]: prefs.backgroundMode === 'box'
        ? cssColor(prefs.backgroundColor, prefs.backgroundOpacity)
        : 'transparent'
    }
  }, [appearanceTick, contentLayout?.height, contentLayout?.width, fallbackViewport?.height, fallbackViewport?.width])

  useEffect(() => {
    if (
      !shouldRenderSubtitleTextLayer(showSubtitleText, subtitleCoverMode, subtitleCues.length)
    ) {
      if (activeCueIndexRef.current !== -1) {
        activeCueIndexRef.current = -1
        setActiveCueIndex(-1)
      }
      return
    }

    let rafId = 0

    const tick = (): void => {
      const video = videoRef.current
      if (!video || !Number.isFinite(video.currentTime)) {
        rafId = requestAnimationFrame(tick)
        return
      }

      const idx = findActiveCueIndex(subtitleCues, video.currentTime)
      if (idx !== activeCueIndexRef.current) {
        activeCueIndexRef.current = idx
        setActiveCueIndex(idx)
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [showSubtitleText, subtitleCoverMode, subtitleCues, videoRef])

  const displayText = useMemo(() => {
    if (activeCueIndex < 0 || activeCueIndex >= subtitleCues.length) {
      return null
    }
    return subtitleCues[activeCueIndex].text
  }, [activeCueIndex, subtitleCues])

  if (
    !shouldRenderSubtitleTextLayer(showSubtitleText, subtitleCoverMode, subtitleCues.length) ||
    !displayText
  ) {
    return null
  }

  const cueClassNames = ['subtitle-cue']
  if (subtitleCoverMode === 'smartCover') {
    if (momentaryRevealActive) {
      cueClassNames.push('subtitle-cue--peek')
    } else if (!subtitleRevealActive) {
      cueClassNames.push('subtitle-cue--smart-covered')
    }
  }
  if (motionAllowed) {
    cueClassNames.push('subtitle-cue--motion')
  }

  return (
    <div
      className={[
        'subtitle-text-layer',
        motionAllowed ? 'subtitle-text-layer--motion' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={presentationStyle}
      aria-live="polite"
    >
      <p className={cueClassNames.join(' ')}>{displayText}</p>
    </div>
  )
}
