import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'

interface TrackAnchorsPanelProps {
  getCurrentTime: () => number
  hasVideo: boolean
}

function formatAnchorTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export default function TrackAnchorsPanel({
  getCurrentTime,
  hasVideo
}: TrackAnchorsPanelProps) {
  useLanguage()
  const anchors = useVeilStore((state) => state.anchors)
  const addAnchorAtTime = useVeilStore((state) => state.addAnchorAtTime)
  const updateAnchor = useVeilStore((state) => state.updateAnchor)
  const removeAnchor = useVeilStore((state) => state.removeAnchor)

  const manualAnchors = anchors.filter((anchor) => anchor.kind !== 'cue')

  return (
    <section className="track-anchors-panel" aria-label={t('anchors.ariaLabel')}>
      <h2 className="track-sidebar__title">{t('sidebar.anchors')}</h2>
      <button
        type="button"
        className="btn btn-secondary btn-compact"
        disabled={!hasVideo}
        title={t('anchors.addAtPlayheadTitle')}
        onClick={() => addAnchorAtTime(getCurrentTime())}
      >
        {t('anchors.addAtPlayhead')}
      </button>
      {manualAnchors.length === 0 ? (
        <p className="track-anchors-panel__empty">{t('anchors.empty')}</p>
      ) : (
        <ul className="track-anchors-panel__list">
          {manualAnchors.map((anchor) => (
            <li key={anchor.id} className="track-anchors-panel__item">
              <span className="track-anchors-panel__time">{formatAnchorTime(anchor.time)}</span>
              <input
                type="text"
                className="track-anchors-panel__label"
                placeholder={t('anchors.labelPlaceholder')}
                value={anchor.label ?? ''}
                onChange={(event) =>
                  updateAnchor(anchor.id, { label: event.target.value || undefined })
                }
              />
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                aria-label={t('anchors.removeAria')}
                onClick={() => removeAnchor(anchor.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
