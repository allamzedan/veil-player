import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { useVeilStore } from '../state/useVeilStore'

interface FileControlsProps {
  onOpenVideo: () => void
}

export default function FileControls({ onOpenVideo }: FileControlsProps) {
  useLanguage()
  const { runIfAllowed } = useUnsavedChangesGuard()
  const clearVideo = useVeilStore((state) => state.clearVideo)
  const videoSrc = useVeilStore((state) => state.videoSrc)

  const handleCloseVideo = (): void => {
    void runIfAllowed(() => {
      clearVideo()
    })
  }

  return (
    <div className="file-controls">
      <button type="button" className="btn" onClick={onOpenVideo}>
        {t('fileControls.openVideo')}
      </button>
      {videoSrc ? (
        <button type="button" className="btn btn-ghost" onClick={handleCloseVideo}>
          {t('fileControls.closeVideo')}
        </button>
      ) : null}
    </div>
  )
}
