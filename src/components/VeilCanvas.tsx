import veilLogo from '../assets/veil-logo.png'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import {
  videoContentLayoutStyle,
  type VideoContentLayout
} from '../lib/videoRect'
import type { BookmarkTrackItem, TrackAnchor } from '../types/track'
import type { SessionBookmark } from '../lib/sessionBookmarks'
import VeilCanvasBookmarkLayer from './VeilCanvasBookmarkLayer'

interface VeilCanvasProps {
  contentLayout: VideoContentLayout | null
  duration: number
  bookmarks: readonly SessionBookmark[]
  trackBookmarks: readonly BookmarkTrackItem[]
  anchors: readonly TrackAnchor[]
  onOpenVideo?: () => void
}

export default function VeilCanvas({
  contentLayout,
  duration,
  bookmarks,
  trackBookmarks,
  anchors,
  onOpenVideo
}: VeilCanvasProps) {
  useLanguage()

  return (
    <div
      className="veil-canvas"
      style={videoContentLayoutStyle(contentLayout)}
      aria-label={t('veilEdit.canvasTitle')}
    >
      <div className="veil-canvas__surface" aria-hidden />
      <img
        src={veilLogo}
        alt=""
        className="veil-canvas__watermark"
        aria-hidden
      />
      <div className="veil-canvas__safe-area" aria-hidden>
        <span className="veil-canvas__safe-guide veil-canvas__safe-guide--action" />
        <span className="veil-canvas__safe-guide veil-canvas__safe-guide--title" />
      </div>
      <VeilCanvasBookmarkLayer
        bookmarks={bookmarks}
        trackBookmarks={trackBookmarks}
        anchors={anchors}
        duration={duration}
      />
      <div className="veil-canvas__chrome">
        <span className="veil-canvas__title">{t('veilEdit.canvasTitle')}</span>
        {onOpenVideo ? (
          <button type="button" className="btn btn-secondary btn-compact veil-canvas__open-video" onClick={onOpenVideo}>
            {t('veilEdit.openVideo')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
