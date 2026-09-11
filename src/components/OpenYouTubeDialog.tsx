import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { parseYouTubeUrl } from '../lib/youtubeUrl'
import type { YouTubeMediaSource } from '../types/mediaSource'
import Modal from './Modal'

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

  useEffect(() => {
    if (!open) {
      return
    }
    setUrlInput('')
    setError(null)
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open])

  const submit = (): void => {
    const parsed = parseYouTubeUrl(urlInput)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    setError(null)
    onLoad(parsed.source)
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
      </form>
    </Modal>
  )
}
