import { useEffect, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { hasDesktopWindowControls } from '../lib/veilEnv'

export default function WindowControls() {
  useLanguage()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!hasDesktopWindowControls()) {
      return
    }

    let cancelled = false
    void window.veil?.isMaximized?.().then((value) => {
      if (!cancelled) {
        setMaximized(value)
      }
    })

    const unsubscribe = window.veil?.onMaximizedChanged?.((next) => {
      setMaximized(next)
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  if (!hasDesktopWindowControls()) {
    return null
  }

  return (
    <div className="window-controls" data-home-interactive>
      <button
        type="button"
        className="window-controls__btn"
        aria-label={t('titleBar.minimize')}
        onClick={() => void window.veil?.minimize?.()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="1" y="7" width="8" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="window-controls__btn"
        aria-label={maximized ? t('titleBar.restore') : t('titleBar.maximize')}
        onClick={() => void window.veil?.toggleMaximize?.()}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M2.5 2.5h5v5H2.5V2.5zm1.2 1.2v2.6h2.6V3.7H3.7zM4.3 1.5h4.2v4.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <rect
              x="1.75"
              y="1.75"
              width="6.5"
              height="6.5"
              rx="1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="window-controls__btn window-controls__btn--close"
        aria-label={t('common.close')}
        onClick={() => void window.veil?.requestClose?.()}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path
            d="M1.8 1.8l6.4 6.4M8.2 1.8L1.8 8.2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
