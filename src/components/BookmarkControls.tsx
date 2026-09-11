import { useMemo } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { sortBookmarksByStart } from '../lib/bookmarks'
import { formatSeconds } from '../lib/time'
import { t } from '../i18n'
import { confirmNative } from '../lib/nativeConfirm'
import { useVeilStore } from '../state/useVeilStore'

interface BookmarkControlsProps {
  getCurrentTime: () => number
  onJump: (time: number) => void
  onEdit?: (id: string) => void
}

export default function BookmarkControls({
  getCurrentTime,
  onJump,
  onEdit
}: BookmarkControlsProps) {
  useLanguage()

  const bookmarks = useVeilStore((state) => state.bookmarks)
  const addBookmark = useVeilStore((state) => state.addBookmark)
  const deleteBookmark = useVeilStore((state) => state.deleteBookmark)
  const setSelectedItem = useVeilStore((state) => state.setSelectedItem)

  const sorted = useMemo(() => sortBookmarksByStart(bookmarks), [bookmarks])

  const onAdd = (): void => {
    addBookmark({ start: getCurrentTime() })
  }

  const onDelete = (id: string): void => {
    if (!confirmNative(t('dialog.deleteTitle', { type: t('inspector.bookmark') }), t('bookmarks.confirmDelete'))) {
      return
    }
    deleteBookmark(id)
  }

  const onCopyTimestamp = async (time: number): Promise<void> => {
    try {
      await navigator.clipboard.writeText(formatSeconds(time))
    } catch {
      // Clipboard unavailable — ignore.
    }
  }

  const onEditBookmark = (id: string): void => {
    setSelectedItem(id, 'bookmark')
    onEdit?.(id)
  }

  return (
    <div className="bookmark-controls" role="group" aria-label={t('bookmarks.title')}>
      <button type="button" className="btn btn-compact btn-secondary" onClick={onAdd}>
        {t('bookmarks.add')}
      </button>
      {sorted.length === 0 ? (
        <p className="bookmark-controls__empty">{t('bookmarks.empty')}</p>
      ) : (
        <ul className="bookmark-controls__list">
          {sorted.map((bookmark) => (
            <li key={bookmark.id} className="bookmark-controls__item">
              <button
                type="button"
                className="btn btn-ghost btn-compact bookmark-controls__jump ltr-digits"
                onClick={() => onJump(bookmark.start)}
              >
                {formatSeconds(bookmark.start)}
              </button>
              <div className="bookmark-controls__body">
                <span className="bookmark-controls__label">
                  {bookmark.label?.trim() || t('bookmarks.defaultLabel')}
                </span>
                {bookmark.notes?.trim() ? (
                  <span className="bookmark-controls__notes">{bookmark.notes.trim()}</span>
                ) : null}
              </div>
              <div className="bookmark-controls__actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  onClick={() => onEditBookmark(bookmark.id)}
                >
                  {t('bookmarks.edit')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  onClick={() => void onCopyTimestamp(bookmark.start)}
                >
                  {t('bookmarks.copyTimestamp')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  aria-label={t('bookmarks.delete')}
                  onClick={() => onDelete(bookmark.id)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
