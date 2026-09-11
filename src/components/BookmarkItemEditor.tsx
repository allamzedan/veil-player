import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { confirmNative } from '../lib/nativeConfirm'
import { formatSeconds } from '../lib/time'
import { useVeilStore } from '../state/useVeilStore'
import { GoToPositionIcon, TrashIcon } from './icons'

interface BookmarkItemEditorProps {
  labelMode?: 'sidebar' | 'inspector'
  onApplyComplete?: () => void
  onCancelComplete?: () => void
  onDeleteRequest?: (id: string) => void
  onGoToPosition?: (time: number, id: string) => void
  fullscreen?: boolean
  onDirtyChange?: (dirty: boolean) => void
}

export default function BookmarkItemEditor({
  labelMode = 'sidebar',
  onApplyComplete,
  onCancelComplete,
  onDeleteRequest,
  onGoToPosition,
  fullscreen = false,
  onDirtyChange
}: BookmarkItemEditorProps) {
  useLanguage()

  const bookmarks = useVeilStore((state) => state.bookmarks)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const patchBookmark = useVeilStore((state) => state.patchBookmark)
  const deleteBookmark = useVeilStore((state) => state.deleteBookmark)

  const bookmark = useMemo(() => {
    if (selectedItemType !== 'bookmark' || !selectedItemId) {
      return null
    }
    return bookmarks.find((item) => item.id === selectedItemId) ?? null
  }, [bookmarks, selectedItemId, selectedItemType])

  const [labelInput, setLabelInput] = useState('')
  const [notesInput, setNotesInput] = useState('')

  useEffect(() => {
    if (!bookmark) {
      setLabelInput('')
      setNotesInput('')
      return
    }
    setLabelInput(bookmark.label ?? '')
    setNotesInput(bookmark.notes ?? '')
  }, [bookmark?.id, bookmark?.start, bookmark?.label, bookmark?.notes])

  useEffect(() => {
    if (!bookmark) {
      onDirtyChange?.(false)
      return
    }
    onDirtyChange?.(
      labelInput !== (bookmark.label ?? '') ||
      notesInput !== (bookmark.notes ?? '')
    )
  }, [bookmark, labelInput, notesInput, onDirtyChange])

  if (!bookmark) {
    return null
  }

  const isLocked = bookmark.locked === true
  const isInspector = labelMode === 'inspector'

  const apply = (): void => {
    patchBookmark(bookmark.id, {
      label: labelInput,
      notes: notesInput
    })
    onApplyComplete?.()
  }

  const remove = (): void => {
    if (onDeleteRequest) {
      onDeleteRequest(bookmark.id)
      return
    }
    if (!confirmNative(t('dialog.deleteTitle', { type: t('inspector.bookmark') }), t('bookmarks.confirmDelete'))) {
      return
    }
    const state = useVeilStore.getState()
    const partOfMultiSelection = state.selectedItems.length > 1 && state.selectedItems.some(
      (item) => item.id === bookmark.id && item.type === 'bookmark'
    )
    if (partOfMultiSelection) state.removeSelectedItem()
    else deleteBookmark(bookmark.id)
    onApplyComplete?.()
  }

  return (
    <section
      className={`selected-item-editor selected-item-editor--compact selected-item-editor--bookmark${isInspector ? ' selected-item-editor--inspector' : ''}${fullscreen ? ' selected-item-editor--fullscreen' : ''}`}
      aria-label={t('inspector.bookmark')}
    >
      <header className="selected-item-editor__metadata-header">
        <h3>{t('inspector.bookmark')}</h3>
        <span className="selected-item-editor__timestamp-pill ltr-digits" dir="ltr">
          {formatSeconds(bookmark.start)}
        </span>
      </header>
      <div className="selected-item-editor__scroll selected-item-editor__body">
        <div className="selected-item-editor__block">
          <h3 className="selected-item-editor__heading">{t('bookmarks.label')}</h3>
          <input
            type="text"
            className="track-editor__input"
            value={labelInput}
            disabled={isLocked}
            dir="auto"
            style={{ textAlign: 'start' }}
            aria-label={t('bookmarks.label')}
            onChange={(event) => setLabelInput(event.target.value)}
          />
        </div>

        <div className="selected-item-editor__block">
          <h3 className="selected-item-editor__heading">{t('bookmarks.notes')}</h3>
          <textarea
            className="track-editor__textarea"
            value={notesInput}
            disabled={isLocked}
            rows={3}
            dir="auto"
            style={{ textAlign: 'start' }}
            aria-label={t('bookmarks.notes')}
            onChange={(event) => setNotesInput(event.target.value)}
          />
        </div>

      </div>
        <footer className="selected-item-editor__actions selected-item-editor__actions--footer">
          {onGoToPosition ? (
            <button
              type="button"
              className="btn btn-secondary btn-compact selected-item-editor__go"
              aria-label="Go to bookmark"
              onClick={() => onGoToPosition(bookmark.start, bookmark.id)}
            >
              <GoToPositionIcon />
              <span>Go to Bookmark</span>
            </button>
          ) : null}
          <button type="button" className="btn btn-compact" disabled={isLocked} onClick={apply}>
            {isInspector ? t('inspector.apply') : t('bookmarks.save')}
          </button>
          {isInspector ? (
            <button type="button" className="btn btn-secondary btn-compact" onClick={onCancelComplete}>
              {t('common.cancel')}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost selected-item-editor__action-delete"
            aria-label="Delete layer"
            title="Delete bookmark"
            onClick={remove}
          >
            <TrashIcon />
          </button>
        </footer>
    </section>
  )
}
