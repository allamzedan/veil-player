import { useEffect, useMemo, useState } from 'react'
import veilLogo from '../assets/veil-logo.png'
import { useLanguage } from '../hooks/useLanguage'
import { APP_VERSION } from '../lib/appVersion'
import { formatMediaDuration, formatRecentOpened } from '../lib/recentDisplay'
import type { VeilBadgeKind } from '../lib/recentVeils'
import type { RecentVideoEntry } from '../lib/sessionRecovery'
import { recentVideoLabel, recentVideoTitle, useRecentHistory } from '../lib/recentHistory'
import { initI18n, t } from '../i18n'
import { useThemePreference } from '../lib/themePreferences'
import veilDocument from '../assets/veil-document.png'
import { DISPLAY_RECENT_COUNT } from '../lib/launcherRecentPresentation'
import RecentFilename from './RecentFilename'
import RecentMediaThumb from './RecentMediaThumb'

initI18n()



function invokeLauncherAction(
  action: string,
  invoke: (api: NonNullable<typeof window.veilLauncher>) => Promise<void> | void
): void {
  const api = window.veilLauncher
  if (!api) {
    console.error('[VEIL] Launcher preload bridge not loaded')
    return
  }
  try {
    const result = invoke(api)
    if (result instanceof Promise) {
      void result.catch((error: unknown) => {
        console.error('[VEIL] Launcher action failed:', action, error)
      })
    }
  } catch (error) {
    console.error('[VEIL] Launcher action failed:', action, error)
  }
}

const SHORTCUT_KEYS = [
  'home.quickStart1',
  'home.quickStart2',
  'home.quickStart3',
  'home.quickStart4'
] as const

function badgeLabel(badge: VeilBadgeKind): string {
  if (badge === 'familySafe') {
    return t('launcher.badge.familySafe')
  }
  if (badge === 'languageLearning') {
    return t('launcher.badge.languageLearning')
  }
  return t('launcher.badge.custom')
}

function WindowControls({
  onMinimize,
  onClose
}: {
  onMinimize: () => void
  onClose: () => void
}) {
  return (
    <div className="launcher-chrome__controls">
      <button
        type="button"
        className="launcher-chrome__btn"
        aria-label={t('launcher.minimize')}
        onClick={onMinimize}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="1" y="7" width="8" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="launcher-chrome__btn launcher-chrome__btn--close"
        aria-label={t('common.close')}
        onClick={onClose}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M1.8 1.8l6.4 6.4M8.2 1.8L1.8 8.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

export default function LauncherApp() {
  const language = useLanguage()
  useThemePreference()
  const [bridgeReady] = useState(() => typeof window.veilLauncher !== 'undefined')
  const [fileDialogPending, setFileDialogPending] = useState(false)
  const { history, clearRecent } = useRecentHistory(window.veilLauncher)

  useEffect(() => {
    if (!bridgeReady) {
      console.error('[VEIL] Launcher preload bridge not loaded', {
        veilLauncher: typeof window.veilLauncher,
        veil: typeof window.veil
      })
    }
  }, [bridgeReady])

  const recentVideos = useMemo(
    () => history.videos.slice(0, DISPLAY_RECENT_COUNT),
    [history.videos]
  )
  const recentVeils = useMemo(
    () => history.veils.slice(0, DISPLAY_RECENT_COUNT),
    [history.veils]
  )

  const locale = language === 'ar' ? 'ar' : language

  const runFileDialogAction = (
    action: 'openVideo' | 'loadVeil',
    invoke: (api: NonNullable<typeof window.veilLauncher>) => Promise<void>
  ): void => {
    if (fileDialogPending) return
    const api = window.veilLauncher
    if (!api) return
    setFileDialogPending(true)
    void invoke(api)
      .catch((error: unknown) => {
        console.error('[VEIL] Launcher action failed:', action, error)
      })
      .finally(() => setFileDialogPending(false))
  }

  const onOpenVideo = (): void => {
    runFileDialogAction('openVideo', (api) => api.openVideo())
  }

  const onLoadVeil = (): void => {
    runFileDialogAction('loadVeil', (api) => api.loadVeil())
  }

  const onOpenYouTube = (): void => {
    invokeLauncherAction('openYouTube', (api) => api.openYouTube())
  }

  const onClose = (): void => {
    invokeLauncherAction('close', (api) => api.openHome())
  }

  const onMinimize = (): void => {
    invokeLauncherAction('minimize', (api) => api.minimize())
  }

  const onOpenSettings = (): void => {
    invokeLauncherAction('settings', (api) => api.openSettings())
  }

  const onOpenReleaseNotes = (): void => {
    invokeLauncherAction('releaseNotes', (api) => api.openReleaseNotes())
  }

  const onRecentVideo = (entry: RecentVideoEntry): void => {
    if (entry.kind === 'youtube' && entry.canonicalUrl) {
      invokeLauncherAction('recentYouTube', (api) => api.openRecentYouTube(entry.canonicalUrl!))
      return
    }
    if (entry.filePath) {
      invokeLauncherAction('recentVideo', (api) => api.openRecentVideo(entry.filePath!))
    }
  }

  const onRecentVeil = (filePath: string): void => {
    invokeLauncherAction('recentVeil', (api) => api.openRecentVeil(filePath))
  }

  const openMainFallback = (): void => {
    window.location.href = 'veil://open-main'
  }

  return (
    <div className="launcher-shell" dir="ltr" lang={language}>
      {!bridgeReady ? (
        <div className="launcher-bridge-error" role="alert">
          <p>{t('launcher.bridgeMissing')}</p>
          <button type="button" className="launcher-btn launcher-btn--secondary" onClick={openMainFallback}>
            {t('launcher.openMainApp')}
          </button>
        </div>
      ) : null}
      <header className="launcher-chrome">
        <div className="launcher-chrome__drag" aria-hidden="true" />
        <WindowControls onMinimize={onMinimize} onClose={onClose} />
      </header>

      <div className="launcher-body">
        <aside className="launcher-left">
          <div className="launcher-hero-block">
            <div className="launcher-hero">
              <img src={veilLogo} alt="" className="launcher-hero__logo" width={48} height={48} />
              <h1 className="launcher-hero__title">{t('home.productName')}</h1>
              <p className="launcher-hero__tagline">{t('launcher.heroTagline')}</p>
              <p className="launcher-hero__description">{t('launcher.heroDescription')}</p>
            </div>
          </div>

          <section className="launcher-primary" aria-label={t('launcher.primaryActions')}>
            <button type="button" className="launcher-btn launcher-btn--primary" onClick={onOpenVideo} disabled={fileDialogPending}>
              {t('home.openVideo')}
            </button>
            <button type="button" className="launcher-btn launcher-btn--secondary" onClick={onOpenYouTube}>
              {t('home.openYouTube')}
            </button>
            <button type="button" className="launcher-btn launcher-btn--secondary" onClick={onLoadVeil} disabled={fileDialogPending}>
              {t('home.loadTrack')}
            </button>
          </section>

          <section className="launcher-shortcuts" aria-label={t('launcher.quickStart.title')}>
            <h2 className="launcher-shortcuts__title">{t('launcher.quickStart.title')}</h2>
            <ul className="launcher-shortcuts__list">
              {SHORTCUT_KEYS.map((key) => (
                <li key={key} className="launcher-shortcuts__item">
                  {t(key)}
                </li>
              ))}
            </ul>
          </section>

          <footer className="launcher-footer">
            <span className="launcher-footer__version">{t('launcher.version', { version: APP_VERSION })}</span>
            <div className="launcher-footer__links">
              <button type="button" className="launcher-footer__link" onClick={onOpenReleaseNotes}>
                {t('launcher.releaseNotes')}
              </button>
              <button type="button" className="launcher-footer__link" onClick={onOpenSettings}>
                {t('launcher.settings')}
              </button>
            </div>
          </footer>
        </aside>

        <div className="launcher-right">
          <div className="launcher-recents">
            <section className="launcher-section">
              <div className="launcher-section__head">
                <h2 className="launcher-section__title">{t('launcher.recentMedia')}</h2>
                <div className="launcher-section__actions">
                  <button
                    type="button"
                    className="launcher-section__clear"
                    aria-label={t('menu.clearRecent')}
                    onClick={() => void clearRecent()}
                    disabled={history.videos.length === 0 && history.veils.length === 0}
                  >
                    {t('menu.clearRecent')}
                  </button>
                </div>
              </div>
              {recentVideos.length > 0 ? (
                <ul className="launcher-list">
                  {recentVideos.map((entry) => (
                    <li key={entry.filePath ?? entry.canonicalUrl ?? entry.mediaKey}>
                      <button
                        type="button"
                        className="launcher-row launcher-row--video"
                        title={entry.kind === 'youtube' ? recentVideoTitle(entry) : entry.filePath}
                        onClick={() => onRecentVideo(entry)}
                      >
                        <span className={`launcher-row__thumb launcher-row__thumb--${entry.kind}`} aria-hidden="true">
                          <RecentMediaThumb entry={entry} />
                        </span>
                        <span className="launcher-row__body">
                          <span className="launcher-row__name recent-row__title"><RecentFilename filename={recentVideoLabel(entry)} /></span>
                          <span className="launcher-row__meta">
                            <span>{formatMediaDuration(entry.durationSeconds)}</span>
                            <span className="launcher-row__dot" aria-hidden="true" />
                            <span>{formatRecentOpened(entry.openedAt, locale)}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="launcher-empty">{t('launcher.noRecents')}</p>
              )}
            </section>

            <section className="launcher-section">
              <div className="launcher-section__head">
                <h2 className="launcher-section__title">{t('launcher.recentVeils')}</h2>
              </div>
              {recentVeils.length > 0 ? (
                <ul className="launcher-list">
                  {recentVeils.map((entry) => (
                    <li key={entry.filePath}>
                      <button
                        type="button"
                        className="launcher-row launcher-row--veil"
                        title={entry.filePath}
                        onClick={() => onRecentVeil(entry.filePath)}
                      >
                        <span className="launcher-row__thumb launcher-row__thumb--veil" aria-hidden="true"><img src={veilDocument} alt="" /></span>
                        <span className="launcher-row__body">
                          <span className="launcher-row__name recent-row__title"><RecentFilename filename={entry.title} /></span>
                          <span className="launcher-row__meta">
                            <span className="launcher-row__meta-text">
                              {t('launcher.actionsCount', { count: String(entry.actionCount) })}
                            </span>
                            <span className={`launcher-badge launcher-badge--${entry.badge}`}>
                              {badgeLabel(entry.badge)}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="launcher-empty">{t('launcher.noRecents')}</p>
              )}
            </section>
          </div>

          <section className="launcher-community" aria-disabled="true">
            <div className="launcher-community__copy">
              <h2 className="launcher-community__title">{t('launcher.community.title')}</h2>
              <p className="launcher-community__subtitle">{t('launcher.community.subtitle')}</p>
            </div>
            <span className="launcher-community__badge">{t('launcher.community.comingLater')}</span>
          </section>
        </div>
      </div>
    </div>
  )
}
