import { useLanguage } from '../hooks/useLanguage'
import { PLAYBACK_SPEED_PRESETS, type PlaybackSpeedPreset } from '../lib/playbackHelpers'
import { t } from '../i18n'

interface PlaybackRateControlProps {
  value: PlaybackSpeedPreset
  onChange: (rate: PlaybackSpeedPreset) => void
  variant?: 'default' | 'dock'
}

export default function PlaybackRateControl({
  value,
  onChange,
  variant = 'default'
}: PlaybackRateControlProps) {
  useLanguage()

  return (
    <label
      className={`playback-rate-control player-controls__rate${variant === 'dock' ? ' playback-rate-control--dock' : ''}`}
    >
      <span className="sr-only">{t('playback.speed')}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as PlaybackSpeedPreset)}
        aria-label={t('playback.speedAria')}
      >
        {PLAYBACK_SPEED_PRESETS.map((rate) => (
          <option key={rate} value={rate}>
            {rate}x
          </option>
        ))}
      </select>
    </label>
  )
}
