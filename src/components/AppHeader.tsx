import veilLogo from '../assets/veil-logo.png'
import FileControls from './FileControls'
import TrackChip from './TrackChip'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { useLanguage } from '../hooks/useLanguage'
import { readUiRefreshV1 } from '../lib/uiRefreshV1'
import { t } from '../i18n'
import { usePlayerModeStore } from '../state/usePlayerModeStore'
import { useVeilStore } from '../state/useVeilStore'

interface AppHeaderProps {
  onOpenVideo: () => void
}

export default function AppHeader({ onOpenVideo }: AppHeaderProps) {
  useLanguage()

  const videoSrc = useVeilStore((state) => state.videoSrc)
  const clearVideo = useVeilStore((state) => state.clearVideo)
  const uiRefreshV1 = readUiRefreshV1()
  const playerMode = usePlayerModeStore((state) => state.playerMode)
  const setPlayerMode = usePlayerModeStore((state) => state.setPlayerMode)
  const { runIfAllowed } = useUnsavedChangesGuard()

  const hasVideo = videoSrc !== null
  const showTrackChip = uiRefreshV1 && hasVideo
  const isWatchChrome = showTrackChip && playerMode === 'watch'
  const isEditChrome = showTrackChip && playerMode === 'edit'
  const showRefreshFileControls = !uiRefreshV1 || !hasVideo

  const handleCloseVideo = (): void => {
    void runIfAllowed(() => {
      clearVideo()
    })
  }

  const editTrackTitle = `${t('watch.editTrack')} (E)`
  const doneTitle = t('watch.returnToWatchMode')

  return (
    <header
      className={`app-header${isWatchChrome ? ' app-header--watch' : ''}${isEditChrome ? ' app-header--edit' : ''}`}
    >
      <div className="app-brand">
        <img src={veilLogo} alt="VEIL Player" className="app-brand__logo" />
        <strong className="app-brand__title">VEIL Player</strong>
      </div>
      <div className="app-header__actions">
        {showTrackChip ? <TrackChip /> : null}
        {isWatchChrome ? (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-compact app-header__edit-track"
              onClick={() => setPlayerMode('edit')}
              title={editTrackTitle}
            >
              {t('watch.editTrack')}
            </button>
            <button
              type="button"
              className="btn btn-ghost app-header__close-video"
              onClick={handleCloseVideo}
              title={t('watch.exitWatch')}
            >
              {t('fileControls.closeVideo')}
            </button>
          </>
        ) : null}
        {isEditChrome ? (
          <>
            <button
              type="button"
              className="btn btn-compact app-header__done"
              onClick={() => setPlayerMode('watch')}
              title={doneTitle}
            >
              {t('watch.done')}
            </button>
            <button
              type="button"
              className="btn btn-ghost app-header__close-video"
              onClick={handleCloseVideo}
              title={t('watch.exitWatch')}
            >
              {t('fileControls.closeVideo')}
            </button>
          </>
        ) : null}
        {showRefreshFileControls ? <FileControls onOpenVideo={onOpenVideo} /> : null}
      </div>
    </header>
  )
}
