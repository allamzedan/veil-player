import { useLanguage } from '../hooks/useLanguage'
import {
  getNextCueIndex,
  getPreviousCueIndex,
  repeatCurrentCue,
  seekToActiveCueStart
} from '../lib/subtitleCueNavigation'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'
import { setCurrentTimeDebug } from '../lib/debugState'

interface SubtitleNavigationControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  getCurrentTime: () => number
  onAfterSeek?: () => void
}

export default function SubtitleNavigationControls({
  videoRef,
  getCurrentTime,
  onAfterSeek
}: SubtitleNavigationControlsProps) {
  useLanguage()
  const subtitleCues = useVeilStore((state) => state.subtitleCues)
  const disabled = subtitleCues.length === 0

  const seek = (time: number): void => {
    const video = videoRef.current
    if (!video) {
      return
    }
    setCurrentTimeDebug(video, 'other', time)
    onAfterSeek?.()
  }

  const onPrev = (): void => {
    const time = getCurrentTime()
    const index = getPreviousCueIndex(subtitleCues, time)
    if (index >= 0) {
      seek(subtitleCues[index].start)
    }
  }

  const onNext = (): void => {
    const time = getCurrentTime()
    const index = getNextCueIndex(subtitleCues, time)
    if (index >= 0) {
      seek(subtitleCues[index].start)
    }
  }

  const onJump = (): void => {
    const video = videoRef.current
    if (!video) {
      return
    }
    if (seekToActiveCueStart(video, subtitleCues, getCurrentTime())) {
      onAfterSeek?.()
    }
  }

  const onRepeat = (): void => {
    const video = videoRef.current
    if (!video) {
      return
    }
    if (repeatCurrentCue(video, subtitleCues, getCurrentTime())) {
      onAfterSeek?.()
    }
  }

  return (
    <div className="subtitle-nav-controls" role="group" aria-label={t('subtitleNav.ariaLabel')}>
      <div className="subtitle-nav-controls__row">
        <button
          type="button"
          className="btn btn-compact btn-secondary"
          disabled={disabled}
          title={t('subtitleNav.prevTitle')}
          onClick={onPrev}
        >
          {t('subtitleNav.prev')}
        </button>
        <button
          type="button"
          className="btn btn-compact btn-secondary"
          disabled={disabled}
          title={t('subtitleNav.nextTitle')}
          onClick={onNext}
        >
          {t('subtitleNav.next')}
        </button>
      </div>
      <div className="subtitle-nav-controls__row">
        <button
          type="button"
          className="btn btn-compact btn-ghost"
          disabled={disabled}
          title={t('subtitleNav.jumpTitle')}
          onClick={onJump}
        >
          {t('subtitleNav.jump')}
        </button>
        <button
          type="button"
          className="btn btn-compact btn-ghost"
          disabled={disabled}
          title={t('subtitleNav.repeatTitle')}
          onClick={onRepeat}
        >
          {t('subtitleNav.repeat')}
        </button>
      </div>
    </div>
  )
}
