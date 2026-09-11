import { useMemo } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import type { FilterMode, SortMode } from '../lib/trackItems'
import { BookmarkIcon } from './icons'

interface LayerListControlsProps {
  sortMode: SortMode
  filterMode: FilterMode
  onSortChange: (mode: SortMode) => void
  onFilterChange: (mode: FilterMode) => void
  includeBookmarks?: boolean
}

export default function LayerListControls({
  sortMode,
  filterMode,
  onSortChange,
  onFilterChange,
  includeBookmarks = false
}: LayerListControlsProps) {
  const language = useLanguage()

  const sortOptions = useMemo(
    (): { value: SortMode; label: string }[] => [
      { value: 'time', label: t('layers.sortTime') },
      { value: 'type', label: t('layers.sortType') },
      { value: 'created', label: t('layers.sortCreated') }
    ],
    [language]
  )

  const filterOptions = useMemo(
    (): { value: FilterMode; label: string }[] => [
      { value: 'all', label: t('layers.filterAll') },
      { value: 'mask', label: t('layers.filterMasks') },
      { value: 'mute', label: t('layers.filterMutes') },
      { value: 'skip', label: t('layers.filterSkips') },
      ...(includeBookmarks
        ? [{ value: 'bookmark' as const, label: t('trackTools.bookmarks') }]
        : []),
      { value: 'active', label: t('layers.filterActive') }
    ],
    [includeBookmarks, language]
  )

  return (
    <div className="layer-list-controls" aria-label={t('layers.optionsAria')}>
      <div className="layer-list-controls__group">
        <span className="layer-list-controls__label">{t('layers.sort')}</span>
        <div className="layer-list-controls__buttons">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn btn-compact${sortMode === option.value ? ' btn-secondary' : ' btn-ghost'}`}
              aria-pressed={sortMode === option.value}
              onClick={() => onSortChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="layer-list-controls__group">
        <span className="layer-list-controls__label">{t('layers.filter')}</span>
        <div className="layer-list-controls__buttons">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn btn-compact${filterMode === option.value ? ' btn-secondary' : ' btn-ghost'}${option.value === 'bookmark' ? ' layer-list-controls__filter--bookmark' : ''}`}
              aria-pressed={filterMode === option.value}
              onClick={() => onFilterChange(option.value)}
            >
              {option.value === 'bookmark' ? <BookmarkIcon aria-hidden /> : null}
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
