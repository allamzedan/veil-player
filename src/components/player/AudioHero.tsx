import veilLogo from '../../assets/veil-logo.png'
import { useLanguage } from '../../hooks/useLanguage'
import { t } from '../../i18n'
import { formatTime } from '../../lib/time'

interface AudioHeroProps {
  fileName: string | null
  isPlaying: boolean
  displayTime: number
  duration: number
}

const WAVE_DOT_COUNT = 56

function waveOffset(index: number): number {
  const t = index / (WAVE_DOT_COUNT - 1)
  return Math.sin(t * Math.PI * 2.2) * 10 + Math.sin(t * Math.PI * 5.1) * 3.5
}

export default function AudioHero({
  fileName,
  isPlaying,
  displayTime,
  duration
}: AudioHeroProps) {
  useLanguage()

  const fileLabel = fileName ?? t('media.audioLoaded')
  const timelineDuration = duration > 0 ? duration : 0

  return (
    <div
      className={`audio-hero${isPlaying ? ' audio-hero--playing' : ''}`}
      aria-label={t('media.audioLoaded')}
    >
      <div className="audio-hero__glow" aria-hidden />
      <div className="audio-hero__waveform" aria-hidden>
        {Array.from({ length: WAVE_DOT_COUNT }, (_, index) => (
          <span
            key={index}
            className="audio-hero__wave-dot"
            style={{
              ['--dot-y' as string]: `${waveOffset(index)}px`,
              ['--dot-phase' as string]: (index % 9) / 9
            }}
          />
        ))}
      </div>
      <img src={veilLogo} alt="" className="audio-hero__logo" aria-hidden />
      <div className="audio-hero__meta">
        <span className="audio-hero__kind">{t('media.audio')}</span>
        <span className="audio-hero__file" title={fileLabel}>
          {fileLabel}
        </span>
        <span className="audio-hero__time ltr-digits" aria-live="polite">
          {formatTime(displayTime)} / {formatTime(timelineDuration)}
        </span>
      </div>
    </div>
  )
}
