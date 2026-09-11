import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { subscribeBookmarkToastDismissal } from '../lib/bookmarkInteractionBridge'
import {
  BOOKMARK_TOAST_DURATION_MS,
  shouldDismissBookmarkToastForNavigation
} from '../lib/bookmarkToast'
import { formatSeconds } from '../lib/time'
import type { BookmarkTrackItem } from '../types/track'
import { BookmarkIcon, EditIcon, TrashIcon } from './icons'

interface BookmarkActivitySurfaceProps {
  bookmark: BookmarkTrackItem
  refreshKey?: number
  initiallyEditing?: boolean
  displayDurationMs?: number
  onSaveDetails?: (details: Pick<BookmarkTrackItem, 'label' | 'notes'>) => void
  onDelete?: () => void
  onDismiss: () => void
}

export default function BookmarkActivitySurface({
  bookmark,
  refreshKey,
  initiallyEditing = false,
  displayDurationMs = BOOKMARK_TOAST_DURATION_MS,
  onSaveDetails,
  onDelete,
  onDismiss
}: BookmarkActivitySurfaceProps) {
  useLanguage()
  const [isEditing, setIsEditing] = useState(initiallyEditing)
  const [draftLabel, setDraftLabel] = useState(bookmark.label ?? '')
  const [draftNote, setDraftNote] = useState(bookmark.notes ?? '')
  const editingRef = useRef(initiallyEditing)
  const labelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    editingRef.current = initiallyEditing
    setIsEditing(initiallyEditing)
    setDraftLabel(bookmark.label ?? '')
    setDraftNote(bookmark.notes ?? '')
  }, [bookmark.id, initiallyEditing, refreshKey])

  useEffect(() => {
    if (isEditing) return
    const timer = setTimeout(onDismiss, displayDurationMs)
    return () => clearTimeout(timer)
  }, [bookmark.id, displayDurationMs, isEditing, onDismiss, refreshKey])

  useEffect(() => subscribeBookmarkToastDismissal((targetBookmarkId) => {
    if (shouldDismissBookmarkToastForNavigation({
      visibleBookmarkId: bookmark.id,
      editing: editingRef.current,
      targetBookmarkId
    })) {
      onDismiss()
    }
  }), [bookmark.id, onDismiss])

  useEffect(() => {
    if (!isEditing) return
    labelInputRef.current?.focus()
    labelInputRef.current?.select()
  }, [isEditing])

  const beginEditing = (): void => {
    if (!onSaveDetails) return
    editingRef.current = true
    setDraftLabel(bookmark.label ?? '')
    setDraftNote(bookmark.notes ?? '')
    setIsEditing(true)
  }

  const finishEditing = (): void => {
    editingRef.current = false
    setIsEditing(false)
  }

  const saveDetails = (): void => {
    onSaveDetails?.({ label: draftLabel, notes: draftNote })
    finishEditing()
  }

  const cancelEditing = (): void => {
    setDraftLabel(bookmark.label ?? '')
    setDraftNote(bookmark.notes ?? '')
    finishEditing()
  }

  const label = bookmark.label?.trim() || t('bookmarks.defaultLabel')
  const note = bookmark.notes?.trim()

  return (
    <section
      className={`bookmark-activity-surface${isEditing ? ' bookmark-activity-surface--editing' : ''}`}
      aria-label={t('bookmarks.defaultLabel')}
    >
      <div className="bookmark-activity-surface__summary" role="status" aria-live="polite">
        <span className="bookmark-activity-surface__icon" aria-hidden><BookmarkIcon /></span>
        <span className="bookmark-activity-surface__time ltr-digits" dir="ltr">
          {formatSeconds(bookmark.start)}
        </span>
        {isEditing ? (
          <input
            ref={labelInputRef}
            className="bookmark-activity-surface__label-input"
            type="text"
            aria-label={t('bookmarks.label')}
            dir="auto"
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancelEditing()
              }
            }}
          />
        ) : (
          <span className="bookmark-activity-surface__copy">
            <strong className="bookmark-activity-surface__label" dir="auto">{label}</strong>
            {note ? <span className="bookmark-activity-surface__note" dir="auto">{note}</span> : null}
          </span>
        )}
        <span className="bookmark-activity-surface__actions">
          {onSaveDetails ? <button type="button" onClick={beginEditing} disabled={isEditing} aria-label="Edit bookmark details" title="Edit bookmark details"><EditIcon /></button> : null}
          {onDelete ? <button type="button" onClick={onDelete} aria-label="Delete bookmark" title="Delete bookmark"><TrashIcon /></button> : null}
          <button type="button" onClick={onDismiss} aria-label="Dismiss bookmark" title="Dismiss bookmark"><span aria-hidden>×</span></button>
        </span>
      </div>
      {isEditing ? (
        <div className="bookmark-activity-surface__editor">
          <textarea
            className="bookmark-activity-surface__note-input"
            aria-label={t('bookmarks.notes')}
            dir="auto"
            rows={2}
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancelEditing()
              }
            }}
          />
          <div className="bookmark-activity-surface__editor-actions">
            <button type="button" onClick={saveDetails} aria-label="Save bookmark details">{t('common.save')}</button>
            <button type="button" onClick={cancelEditing} aria-label="Cancel bookmark editing">{t('common.cancel')}</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
