import { useEffect } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'

interface MatchingVeilDialogProps {
  open: boolean
  candidates: string[]
  onLoad: (filePath: string) => void
  onIgnore: () => void
}

function displayName(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] ?? filePath
}

export default function MatchingVeilDialog({
  open,
  candidates,
  onLoad,
  onIgnore
}: MatchingVeilDialogProps) {
  useLanguage()

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onIgnore()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onIgnore])

  useEffect(() => {
    if (!open) {
      return
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    return () => {
      const playerStage = document.querySelector<HTMLElement>('.player-stage')
      if (playerStage && document.body.contains(playerStage)) {
        if (!playerStage.hasAttribute('tabindex')) {
          playerStage.tabIndex = -1
        }
        playerStage.focus({ preventScroll: true })
        return
      }
      previousFocus?.focus()
    }
  }, [open])

  if (!open || candidates.length === 0) {
    return null
  }

  return (
    <div className="matching-veil-dialog" role="dialog" aria-modal="true" aria-labelledby="matching-veil-title">
      <div className="matching-veil-dialog__panel">
        <h2 id="matching-veil-title" className="matching-veil-dialog__title">
          {t('matchingVeil.title')}
        </h2>
        <p className="matching-veil-dialog__body">{t('matchingVeil.body')}</p>
        <ul className="matching-veil-dialog__list">
          {candidates.map((filePath) => (
            <li key={filePath}>
              <button type="button" className="btn btn-secondary btn-compact" onClick={() => onLoad(filePath)}>
                {t('matchingVeil.load')} — {displayName(filePath)}
              </button>
            </li>
          ))}
        </ul>
        <div className="matching-veil-dialog__actions">
          <button type="button" className="btn btn-ghost btn-compact" onClick={onIgnore}>
            {t('matchingVeil.ignore')}
          </button>
        </div>
      </div>
    </div>
  )
}
