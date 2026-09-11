import { type MouseEvent } from 'react'
import veilLogo from '../assets/veil-logo.png'
import AppMenuBar from './AppMenuBar'
import FileControls from './FileControls'
import TrackChip from './TrackChip'
import WindowControls from './WindowControls'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { useLanguage } from '../hooks/useLanguage'
import { hasVeilSession } from '../lib/trackSession'
import { isHomeWorkspaceInteractiveTarget } from '../lib/homeWorkspace'
import { readUiRefreshV1 } from '../lib/uiRefreshV1'
import { hasDesktopWindowControls } from '../lib/veilEnv'
import {
  setPlayerModeEditWithAudio,
  setPlayerModeWatchWithAudio,
  shouldShowAudioCompact
} from '../lib/audioWorkspace'
import { t } from '../i18n'
import { usePlayerModeStore } from '../state/usePlayerModeStore'
import { useVeilStore } from '../state/useVeilStore'

interface DesktopTitleBarProps {
  onOpenVideo: () => void
  showStatusBar: boolean
  sidebarCollapsed: boolean
  timelineVisible: boolean
}

export default function DesktopTitleBar({
  onOpenVideo,
  showStatusBar,
  sidebarCollapsed,
  timelineVisible
}: DesktopTitleBarProps) {
  useLanguage()

  const videoSrc = useVeilStore((state) => state.videoSrc)
  const trackFilePath = useVeilStore((state) => state.trackFilePath)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const isTrackDirty = useVeilStore((state) => state.isTrackDirty)
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const clearVideo = useVeilStore((state) => state.clearVideo)
  const uiRefreshV1 = readUiRefreshV1()
  const playerMode = usePlayerModeStore((state) => state.playerMode)
  const { runIfAllowed } = useUnsavedChangesGuard()

  const hasVideo = videoSrc !== null
  const veilSessionActive = hasVeilSession({ trackFilePath, masks, mutes, skips, bookmarks })
  const showTrackContext = uiRefreshV1 && (hasVideo || veilSessionActive)
  const audioWatchMode = shouldShowAudioCompact(mediaKind, playerMode) && hasVideo
  const isWatchChrome = showTrackContext && playerMode === 'watch' && !audioWatchMode
  const isEditChrome = showTrackContext && playerMode === 'edit'
  const showRefreshFileControls = !uiRefreshV1 || !hasVideo
  const desktopShell = hasDesktopWindowControls()

  const handleCloseVideo = (): void => {
    void runIfAllowed(() => {
      clearVideo()
    })
  }

  const onTitleBarDoubleClick = (event: MouseEvent<HTMLElement>): void => {
    if (!desktopShell || isHomeWorkspaceInteractiveTarget(event.target)) {
      return
    }
    void window.veil?.toggleMaximize?.()
  }

  const editTrackTitle = `${t('watch.editTrack')} (E)`
  const doneTitle = t('watch.returnToWatchMode')

  return (
    <header
      className={`desktop-title-bar${desktopShell ? ' desktop-title-bar--frameless' : ''}${audioWatchMode ? ' desktop-title-bar--audio-watch' : ''}`}
      onDoubleClick={onTitleBarDoubleClick}
    >
      <div className="desktop-title-bar__leading">
        <img
          src={veilLogo}
          alt=""
          className="desktop-title-bar__logo"
          width={22}
          height={22}
        />
        <AppMenuBar
          showStatusBar={showStatusBar}
          sidebarCollapsed={sidebarCollapsed}
          timelineVisible={timelineVisible}
          embedded
        />
      </div>

      <div className="desktop-title-bar__breadcrumb" aria-live="polite" />

      <div className="desktop-title-bar__trailing" data-home-interactive>
        {uiRefreshV1 && !isWatchChrome ? <TrackChip /> : null}
        {isWatchChrome ? (
          <>
            {isTrackDirty ? (
              <span className="app-header__veil-dirty" role="status">{t('trackChip.dirtyLabel')}</span>
            ) : null}
            <button
              type="button"
              className="btn btn-compact app-header__edit-track app-header__veil-primary"
              onClick={() => setPlayerModeEditWithAudio()}
              title={editTrackTitle}
            >
              {veilSessionActive ? t('watch.editTrack') : t('trackChip.createTrack')}
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
              onClick={() => setPlayerModeWatchWithAudio()}
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
        <WindowControls />
      </div>
    </header>
  )
}
