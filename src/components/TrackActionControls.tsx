import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { usePlaybackActivityPreferences } from '../hooks/usePlaybackActivityPreferences'
import { readUiRefreshV1 } from '../lib/uiRefreshV1'
import { resolvePlaybackCapabilities } from '../lib/playbackCapabilities'
import { canCreateRangeActions } from '../lib/authoringCapabilities'
import { useVeilStore } from '../state/useVeilStore'

interface TrackActionControlsProps {
  getCurrentTime: () => number
  hasVideo: boolean
  onAfterChange?: () => void
  compact?: boolean
}

export default function TrackActionControls({
  getCurrentTime,
  hasVideo,
  onAfterChange,
  compact = false
}: TrackActionControlsProps) {
  useLanguage()
  const playbackActivityPreferences = usePlaybackActivityPreferences()
  const uiRefreshV1 = readUiRefreshV1()
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const capabilities = resolvePlaybackCapabilities(mediaSource, mediaKind)
  const addMask = useVeilStore((state) => state.addMask)
  const addMute = useVeilStore((state) => state.addMute)
  const addSkip = useVeilStore((state) => state.addSkip)

  const addAtPlayhead = (action: (start: number, end: number) => void, durationSeconds: number): void => {
    const start = getCurrentTime()
    action(start, start + durationSeconds)
    onAfterChange?.()
  }

  if (!canCreateRangeActions(capabilities)) {
    return null
  }

  return (
    <section className="track-action-controls" aria-label={t('create.title')}>
      {compact ? null : <h2 className="track-sidebar__title">{t('create.title')}</h2>}
      <div className="track-action-controls__row sidebar-button-row">
        {capabilities.canCreateMask ? <button
          type="button"
          className={`btn btn-secondary sidebar-button${uiRefreshV1 ? ' track-action-controls__btn track-action-controls__btn--mask' : ''}`}
          disabled={!hasVideo}
          title={
            !hasVideo
              ? t('create.loadVideoFirst')
              : 'Add Mask (M)'
          }
          onClick={() => addAtPlayhead(addMask, playbackActivityPreferences.defaultMaskDurationSeconds)}
        >
          <span>{t('create.addMask')}</span>
          <span className="track-action-controls__shortcut" aria-hidden="true">M</span>
        </button> : null}
        {capabilities.canCreateMuteRange ? <button
          type="button"
          className={`btn btn-secondary sidebar-button${uiRefreshV1 ? ' track-action-controls__btn track-action-controls__btn--mute' : ''}`}
          disabled={!hasVideo}
          title={hasVideo ? 'Add Mute (U)' : t('create.loadVideoFirst')}
          onClick={() => addAtPlayhead(addMute, playbackActivityPreferences.defaultMuteDurationSeconds)}
        >
          <span>{t('create.addMute')}</span>
          <span className="track-action-controls__shortcut" aria-hidden="true">U</span>
        </button> : null}
        {capabilities.canCreateSkipRange ? <button
          type="button"
          className={`btn btn-secondary sidebar-button${uiRefreshV1 ? ' track-action-controls__btn track-action-controls__btn--skip' : ''}`}
          disabled={!hasVideo}
          title={hasVideo ? 'Add Skip (K)' : t('create.loadVideoFirst')}
          onClick={() => addAtPlayhead(addSkip, playbackActivityPreferences.defaultSkipDurationSeconds)}
        >
          <span>{t('create.addSkip')}</span>
          <span className="track-action-controls__shortcut" aria-hidden="true">K</span>
        </button> : null}
      </div>
    </section>
  )
}
