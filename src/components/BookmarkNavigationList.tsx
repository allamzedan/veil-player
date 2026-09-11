import { useEffect, useMemo, useRef } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import {
  buildBookmarkNavigationItems,
  findAdjacentBookmark
} from '../lib/bookmarkNavigation'
import { formatSeconds } from '../lib/time'
import type { BookmarkTrackItem } from '../types/track'

export interface BookmarkNavigationListProps {
  bookmarks: BookmarkTrackItem[]
  selectedBookmarkId: string | null
  currentTime: number
  onSelect: (id: string) => void
  onSeek: (time: number) => void
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onCopyTimestamp: (time: number) => void | Promise<void>
}

export default function BookmarkNavigationList({
  bookmarks,
  selectedBookmarkId,
  currentTime,
  onSelect,
  onSeek,
  onAdd,
  onEdit,
  onDelete,
  onCopyTimestamp
}: BookmarkNavigationListProps) {
  useLanguage()
  const items = useMemo(() => buildBookmarkNavigationItems(bookmarks), [bookmarks])
  const selectedRowRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!selectedBookmarkId || !selectedRowRef.current) return
    selectedRowRef.current.focus({ preventScroll: false })
  }, [selectedBookmarkId])

  const go = (direction: 'previous' | 'next'): void => {
    const item = findAdjacentBookmark(items, selectedBookmarkId, currentTime, direction)
    if (!item) return
    onSelect(item.id)
    onSeek(item.start)
  }

  return (
    <section className="bookmark-navigation" aria-label={t('bookmarks.title')}>
      <h3 className="navigate-group-title">{t('bookmarks.title')}</h3>
      <div className="bookmark-navigation__toolbar">
        <button
          type="button"
          className="btn btn-ghost btn-compact"
          onClick={() => go('previous')}
          disabled={!findAdjacentBookmark(items, selectedBookmarkId, currentTime, 'previous')}
        >
          {t('bookmarks.previous')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-compact"
          onClick={() => go('next')}
          disabled={!findAdjacentBookmark(items, selectedBookmarkId, currentTime, 'next')}
        >
          {t('bookmarks.next')}
        </button>
        <button type="button" className="btn btn-compact" onClick={onAdd}>
          {t('bookmarks.add')}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bookmark-navigation__empty">
          <h3>{t('youtube.noBookmarksTitle')}</h3>
          <p>{t('youtube.noBookmarksDescription')}</p>
          <button type="button" className="btn btn-compact" onClick={onAdd}>
            {t('bookmarks.add')}
          </button>
        </div>
      ) : (
        <ul className="bookmark-navigation__list">
          {items.map((item) => {
            const selected = item.id === selectedBookmarkId
            return (
              <li key={item.id} className="bookmark-navigation__item">
                <button
                  ref={selected ? selectedRowRef : undefined}
                  type="button"
                  className={`bookmark-navigation__row${selected ? ' bookmark-navigation__row--selected' : ''}${!item.enabled ? ' bookmark-navigation__row--disabled' : ''}`}
                  aria-current={selected ? 'true' : undefined}
                  title={item.note ? `${item.label} · ${item.note}` : item.label}
                  onClick={() => {
                    onSelect(item.id)
                    onSeek(item.start)
                  }}
                >
                  <span className="bookmark-navigation__timestamp ltr-digits">
                    {formatSeconds(item.start)}
                  </span>
                  <span className="bookmark-navigation__text">
                    <strong>{item.label}</strong>
                    {item.note ? <small>{item.note}</small> : null}
                  </span>
                </button>
                <div className="bookmark-navigation__actions">
                  <button type="button" className="btn btn-ghost btn-compact" onClick={() => onEdit(item.id)}>
                    {t('bookmarks.edit')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-compact" onClick={() => void onCopyTimestamp(item.start)}>
                    {t('bookmarks.copyTimestamp')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    aria-label={t('bookmarks.delete')}
                    onClick={() => onDelete(item.id)}
                  >
                    {t('bookmarks.delete')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
