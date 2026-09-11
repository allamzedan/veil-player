import veilLogo from '../assets/veil-logo.png'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'

interface HomeLobbyProps {
  onOpenVideo: () => void
  onOpenYouTube?: () => void
  onLoadTrack: () => void
  onLearnMore: () => void
  /** Lightweight empty state when a separate launcher is the front door. */
  compact?: boolean
}

export default function HomeLobby({
  onOpenVideo,
  onOpenYouTube,
  onLoadTrack,
  onLearnMore,
  compact = false
}: HomeLobbyProps) {
  useLanguage()

  const shortcuts = [
    t('home.quickStart1'),
    t('home.quickStart2'),
    t('home.quickStart3'),
    t('home.quickStart4'),
    t('home.quickStart5'),
    t('home.quickStart6')
  ]

  if (compact) {
    return (
      <section className="home-lobby home-lobby--compact" aria-label={t('home.ariaLabel')}>
        <img
          src={veilLogo}
          alt=""
          className="home-lobby__logo home-lobby__logo--watermark"
          width={88}
          height={88}
        />
        <p className="home-lobby__empty-title">{t('home.emptyTitle')}</p>
        <p className="home-lobby__empty-hint">{t('home.emptyHint')}</p>
        <div className="home-lobby__actions" data-home-interactive>
          <button type="button" className="btn" onClick={onOpenVideo}>
            {t('home.openVideo')}
          </button>
          {onOpenYouTube ? (
            <button type="button" className="btn btn-secondary" onClick={onOpenYouTube}>
              {t('home.openYouTube')}
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={onLoadTrack}>
            {t('home.loadTrack')}
          </button>
        </div>
        <hr className="home-lobby__divider" aria-hidden="true" />
        <p className="home-lobby__drop-hint">{t('home.dragAnywhere')}</p>
      </section>
    )
  }

  return (
    <section className="home-lobby" aria-label={t('home.ariaLabel')}>
      <div className="home-lobby__launch-card">
        <img src={veilLogo} alt="" className="home-lobby__logo" width={64} height={64} />
        <p className="home-lobby__product-name">{t('home.productName')}</p>
        <p className="home-lobby__tagline">{t('home.tagline')}</p>
        <p className="home-lobby__headline">{t('home.headline')}</p>
        <div className="home-lobby__actions" data-home-interactive>
          <button type="button" className="btn" onClick={onOpenVideo}>
            {t('home.openVideo')}
          </button>
          <div className="home-lobby__secondary-actions">
            {onOpenYouTube ? (
              <button type="button" className="btn btn-secondary" onClick={onOpenYouTube}>
                {t('home.openYouTube')}
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary" onClick={onLoadTrack}>
              {t('home.loadTrack')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onLearnMore}>
              {t('home.learnMore')}
            </button>
          </div>
        </div>
      </div>

      <div className="home-lobby__concept" aria-hidden="false">
        <p className="home-lobby__concept-equation">
          <span className="home-lobby__concept-term">{t('home.conceptVideo')}</span>
          <span className="home-lobby__concept-operator" aria-hidden="true">
            +
          </span>
          <span className="home-lobby__concept-term">{t('home.conceptTrack')}</span>
          <span className="home-lobby__concept-operator" aria-hidden="true">
            =
          </span>
          <span className="home-lobby__concept-result">{t('home.conceptResult')}</span>
        </p>
        <ul className="home-lobby__concept-actions">
          <li>{t('home.hide')}</li>
          <li>{t('home.mute')}</li>
          <li>{t('home.skip')}</li>
        </ul>
      </div>

      <div className="home-lobby__quickstart">
        <h2 className="home-lobby__quickstart-title">{t('home.quickStartTitle')}</h2>
        <ul className="home-lobby__quickstart-steps">
          {shortcuts.map((shortcut) => (
            <li key={shortcut}>{shortcut}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
