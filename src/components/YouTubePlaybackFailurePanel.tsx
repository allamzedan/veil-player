import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { playbackFailureCopyKeys, type PlaybackFailure } from '../playback/playbackFailure'

interface YouTubePlaybackFailurePanelProps {
  failure: PlaybackFailure | null
  onRetry: () => void
  onOpenOnYouTube: () => void
  onCloseMedia: () => void
}

export default function YouTubePlaybackFailurePanel({
  failure,
  onRetry,
  onOpenOnYouTube,
  onCloseMedia
}: YouTubePlaybackFailurePanelProps) {
  useLanguage()
  if (!failure || failure.source !== 'youtube') {
    return null
  }
  const copy = playbackFailureCopyKeys(failure)
  return (
    <section className="youtube-playback-failure" role="alert" aria-live="assertive">
      <div className="youtube-playback-failure__copy">
        <h3>{t(copy.title)}</h3>
        <p>{t(copy.primary)}</p>
        <p>{t(copy.secondary)}</p>
      </div>
      <div className="youtube-playback-failure__actions">
        <button type="button" className="btn" onClick={onRetry}>
          {t('youtube.retryPlayback')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onOpenOnYouTube}>
          {t('youtube.openOnYouTube')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCloseMedia}>
          {t('fileControls.closeVideo')}
        </button>
      </div>
    </section>
  )
}
