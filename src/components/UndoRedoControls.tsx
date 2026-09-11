import { useLanguage } from '../hooks/useLanguage'
import { redoTrack, undoTrack } from '../lib/trackHistory'
import { t } from '../i18n'
import { useHistoryStore } from '../state/useHistoryStore'
import { pushWarningToast } from '../state/useToastStore'
import { useVeilStore } from '../state/useVeilStore'

export default function UndoRedoControls() {
  useLanguage()
  const videoSrc = useVeilStore((state) => state.videoSrc)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)

  const canUndo = useHistoryStore((state) => state.past.length > 0)
  const canRedo = useHistoryStore((state) => state.future.length > 0)
  const historyCount = useHistoryStore((state) => state.past.length + state.future.length)

  const trackItemCount = masks.length + mutes.length + skips.length
  const visible = Boolean(videoSrc) && (trackItemCount > 0 || historyCount > 0)

  if (!visible) {
    return null
  }

  const handleUndo = (): void => {
    if (!undoTrack()) {
      pushWarningToast(t('toast.nothingUndo'))
    }
  }

  const handleRedo = (): void => {
    if (!redoTrack()) {
      pushWarningToast(t('toast.nothingRedo'))
    }
  }

  return (
    <div className="undo-redo-controls" role="group" aria-label={t('undoRedo.ariaLabel')}>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        disabled={!canUndo}
        onClick={handleUndo}
        title={t('undoRedo.undoTitle')}
        aria-label={t('menu.undo')}
      >
        <span className="btn-icon__glyph" aria-hidden>
          ↶
        </span>
      </button>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        disabled={!canRedo}
        onClick={handleRedo}
        title={t('undoRedo.redoTitle')}
        aria-label={t('menu.redo')}
      >
        <span className="btn-icon__glyph" aria-hidden>
          ↷
        </span>
      </button>
    </div>
  )
}
