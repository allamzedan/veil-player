import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { runAppMenuAction } from '../lib/appMenuBridge'
import {
  readSubtitleSheetOpen,
  requestCloseSubtitleSheet,
  requestOpenSubtitleSheet
} from '../lib/subtitleSheetBridge'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'
import type { SubtitleCoverMode } from '../types/track'

type UtilityMenu = 'veil' | null

interface PlayerUtilityControlsProps {
  subtitleSheetOpen: boolean
  variant?: 'default' | 'dock'
  showVeilMenu?: boolean
  showCc?: boolean
}

function ccAccentClass(cueCount: number, mode: SubtitleCoverMode): string {
  if (cueCount === 0) {
    return 'player-utility-controls__btn--cc-idle'
  }
  if (mode === 'smartCover') {
    return 'player-utility-controls__btn--cc-smart'
  }
  if (mode === 'regionCover') {
    return 'player-utility-controls__btn--cc-region'
  }
  return 'player-utility-controls__btn--cc-loaded'
}

export default function PlayerUtilityControls({
  subtitleSheetOpen,
  variant = 'default',
  showVeilMenu = true,
  showCc = true
}: PlayerUtilityControlsProps) {
  useLanguage()

  const subtitleCues = useVeilStore((state) => state.subtitleCues)
  const subtitleCoverMode = useVeilStore((state) => state.subtitleCoverMode)

  const [openMenu, setOpenMenu] = useState<UtilityMenu>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const dock = variant === 'dock'

  useEffect(() => {
    if (!openMenu) {
      return
    }

    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpenMenu(null)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openMenu])

  const toggleMenu = (menu: UtilityMenu): void => {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  const onCcClick = (): void => {
    if (subtitleSheetOpen || readSubtitleSheetOpen()) {
      requestCloseSubtitleSheet()
      return
    }
    requestOpenSubtitleSheet()
  }

  const ccClass = ccAccentClass(subtitleCues.length, subtitleCoverMode)

  return (
    <div
      ref={rootRef}
      className={`player-utility-controls${dock ? ' player-utility-controls--dock' : ''}`}
    >
      {showCc ? <div className="player-utility-controls__slot">
        <button
          type="button"
          className={`btn btn-compact btn-ghost player-controls__icon-btn player-utility-controls__btn player-utility-controls__btn--cc ${ccClass}${subtitleSheetOpen ? ' player-utility-controls__btn--open' : ''}${dock ? ' player-utility-controls__btn--dock' : ''}`}
          aria-label={t('player.ccAria')}
          title={t('player.ccTitle')}
          aria-haspopup="dialog"
          aria-expanded={subtitleSheetOpen}
          onClick={onCcClick}
        >
          <span className="player-controls__icon-glyph player-utility-controls__glyph" aria-hidden>
            CC
          </span>
        </button>
      </div> : null}

      {showVeilMenu ? <div className="player-utility-controls__slot">
        <button
          type="button"
          className={`btn btn-compact btn-ghost player-controls__icon-btn player-utility-controls__btn${openMenu === 'veil' ? ' player-utility-controls__btn--open' : ''}${dock ? ' player-utility-controls__btn--dock' : ''}`}
          aria-label={t('player.veilAria')}
          title={t('player.veilTitle')}
          aria-haspopup="menu"
          aria-expanded={openMenu === 'veil'}
          onClick={() => toggleMenu('veil')}
        >
          <span className="player-controls__icon-glyph player-utility-controls__glyph" aria-hidden>
            VEIL
          </span>
        </button>
        {openMenu === 'veil' ? (
          <div className="player-utility-controls__popup player-utility-controls__popup--menu" role="menu">
            <button
              type="button"
              className="player-utility-controls__menu-item"
              role="menuitem"
              onClick={() => {
                runAppMenuAction('saveTrack')
                setOpenMenu(null)
              }}
            >
              {t('inspector.saveTrack')}
            </button>
            <button
              type="button"
              className="player-utility-controls__menu-item"
              role="menuitem"
              onClick={() => {
                runAppMenuAction('loadTrack')
                setOpenMenu(null)
              }}
            >
              {t('inspector.replaceTrack')}
            </button>
            <button
              type="button"
              className="player-utility-controls__menu-item"
              role="menuitem"
              onClick={() => {
                runAppMenuAction('openTrackExport')
                setOpenMenu(null)
              }}
            >
              {t('trackChip.exportShare')}
            </button>
          </div>
        ) : null}
      </div> : null}
    </div>
  )
}
