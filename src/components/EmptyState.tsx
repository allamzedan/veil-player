import { t } from '../i18n'

interface EmptyStateProps {
  onOpenVideo: () => void
  onLoadTrack: () => void
}

export default function EmptyState({ onOpenVideo, onLoadTrack }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-label={t('emptyState.ariaLabel')}>
      <h2 className="empty-state__title">{t('emptyState.title')}</h2>
      <p className="empty-state__lead">{t('emptyState.lead')}</p>
      <p className="empty-state__body">{t('emptyState.body')}</p>
      <p className="empty-state__note">{t('emptyState.note')}</p>
      <div className="empty-state__actions">
        <button type="button" className="btn" onClick={onOpenVideo}>
          {t('emptyState.openVideo')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onLoadTrack}>
          {t('emptyState.loadTrack')}
        </button>
      </div>
    </section>
  )
}
