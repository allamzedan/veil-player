import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { parseYouTubeUrl } from '../lib/youtubeUrl'
import type { YouTubeMediaSource } from '../types/mediaSource'
import Modal from './Modal'
import {
  GOOGLE_PRIVACY_POLICY_URL,
  hasYouTubeProviderConsent,
  recordYouTubeProviderConsent,
  VEIL_PRIVACY_POLICY_URL,
  YOUTUBE_TERMS_URL
} from '../lib/youtubeProviderConsent'

interface OpenYouTubeDialogProps {
  open: boolean
  onClose: () => void
  onLoad: (source: YouTubeMediaSource) => void
}

export default function OpenYouTubeDialog({ open, onClose, onLoad }: OpenYouTubeDialogProps) {
  useLanguage()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setUrlInput('')
    setError(null)
    setAccepted(hasYouTubeProviderConsent(window.localStorage))
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open])

  const submit = (): void => {
    if (!accepted) {
      setError('Accept the privacy policy and YouTube Terms notice before using YouTube.')
      return
    }
    const parsed = parseYouTubeUrl(urlInput)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    setError(null)
    recordYouTubeProviderConsent(window.localStorage)
    onLoad(parsed.source)
  }

  const openPolicy = (url: string): void => {
    void window.veil?.openExternalUrl?.(url)
  }

  return (
    <Modal
      open={open}
      title={t('youtube.openTitle')}
      onClose={onClose}
      panelClassName="modal__panel--open-youtube"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn" onClick={submit}>
            {t('youtube.load')}
          </button>
        </>
      }
    >
      <form
        className="open-youtube-dialog"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <label className="open-youtube-dialog__label" htmlFor={inputId}>
          {t('youtube.urlLabel')}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className="open-youtube-dialog__input"
          type="url"
          value={urlInput}
          onChange={(event) => {
            setUrlInput(event.target.value)
            if (error) {
              setError(null)
            }
          }}
          placeholder={t('youtube.urlPlaceholder')}
          spellCheck={false}
          autoComplete="off"
        />
        {error ? (
          <p className="open-youtube-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <label className={'open-youtube-dialog__consent'}>
          <input type={'checkbox'} checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>{t('youtube.consent')}</span>
        </label>
        <p className={'open-youtube-dialog__policy-links'}>
          <button type={'button'} className={'link-button'} onClick={() => openPolicy(VEIL_PRIVACY_POLICY_URL)}>{t('youtube.privacyPolicy')}</button>
          {' · '}
          <button type={'button'} className={'link-button'} onClick={() => openPolicy(YOUTUBE_TERMS_URL)}>{t('youtube.terms')}</button>
          {' · '}
          <button type={'button'} className={'link-button'} onClick={() => openPolicy(GOOGLE_PRIVACY_POLICY_URL)}>{t('youtube.googlePrivacy')}</button>
        </p>
      </form>
    </Modal>
  )
}
