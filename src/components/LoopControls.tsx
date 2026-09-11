import { useLanguage } from '../hooks/useLanguage'
import { isValidSessionLoop, type SessionLoop } from '../lib/sessionLoop'
import { t } from '../i18n'

interface LoopControlsProps {
  sessionLoop: SessionLoop
  getCurrentTime: () => number
  onSetLoopStart: (time: number) => void
  onSetLoopEnd: (time: number) => void
  onToggleLoop: () => void
  onClearLoop: () => void
}

function formatLocalizedLoopReadout(loop: SessionLoop): string {
  if (!isValidSessionLoop(loop)) {
    return t('loop.noLoopSet')
  }
  return t('loop.readout', { start: loop.start.toFixed(1), end: loop.end.toFixed(1) })
}

export default function LoopControls({
  sessionLoop,
  getCurrentTime,
  onSetLoopStart,
  onSetLoopEnd,
  onToggleLoop,
  onClearLoop
}: LoopControlsProps) {
  useLanguage()

  return (
    <div className="loop-controls" role="group" aria-label={t('loop.ariaLabel')}>
      <div className="loop-controls__row">
        <button
          type="button"
          className="btn btn-compact btn-secondary"
          title={t('loop.setStartTitle')}
          onClick={() => onSetLoopStart(getCurrentTime())}
        >
          {t('loop.start')}
        </button>
        <button
          type="button"
          className="btn btn-compact btn-secondary"
          title={t('loop.setEndTitle')}
          onClick={() => onSetLoopEnd(getCurrentTime())}
        >
          {t('loop.end')}
        </button>
      </div>
      <div className="loop-controls__row">
        <label className="loop-controls__toggle">
          <input type="checkbox" checked={sessionLoop.enabled} onChange={onToggleLoop} />
          <span>{t('loop.enable')}</span>
        </label>
        <button type="button" className="btn btn-compact btn-ghost" onClick={onClearLoop}>
          {t('common.clear')}
        </button>
      </div>
      <p className="loop-controls__readout">{formatLocalizedLoopReadout(sessionLoop)}</p>
    </div>
  )
}
