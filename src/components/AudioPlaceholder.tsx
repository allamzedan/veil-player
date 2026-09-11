import veilLogo from '../assets/veil-logo.png'
import { useLanguage } from '../hooks/useLanguage'
import { formatTime } from '../lib/time'
import { t } from '../i18n'
import {
  videoContentLayoutStyle,
  type VideoContentLayout
} from '../lib/videoRect'

interface AudioPlaceholderProps {
  contentLayout: VideoContentLayout | null
  fileName: string | null
  duration: number
}

export default function AudioPlaceholder({
  contentLayout,
  fileName,
  duration
}: AudioPlaceholderProps) {
  useLanguage()

  return (
    <div
      className="audio-placeholder"
      style={videoContentLayoutStyle(contentLayout)}
      aria-label={t('media.audioLoaded')}
    >
      <div className="audio-placeholder__surface" aria-hidden />
      <img src={veilLogo} alt="" className="audio-placeholder__logo" aria-hidden />
      <div className="audio-placeholder__meta">
        <span className="audio-placeholder__kind">{t('media.audio')}</span>
        {fileName ? <span className="audio-placeholder__file">{fileName}</span> : null}
        {duration > 0 ? (
          <span className="audio-placeholder__duration ltr-digits">{formatTime(duration)}</span>
        ) : null}
      </div>
    </div>
  )
}
