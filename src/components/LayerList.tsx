import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { setCurrentTimeDebug } from '../lib/debugState'
import { formatSeconds } from '../lib/time'
import { t } from '../i18n'
import { confirmNative } from '../lib/nativeConfirm'
import {
  buildLayerSections,
  filterRowsByGroupVisibility
} from '../lib/trackGrouping'
import {
  buildLayerListRows,
  filterLayerRows,
  getTotalTrackItemCount,
  isTrackItemEnabled,
  sortLayerRows,
  type FilterMode,
  type LayerListRow,
  type SortMode
} from '../lib/trackItems'
import { includesTimelineSelectionItem, isTimelineMultiSelectModifier, type SelectedTimelineItem } from '../lib/timelineMultiSelection'
import { useVeilStore } from '../state/useVeilStore'
import LayerListControls from './LayerListControls'
import { BookmarkIcon } from './icons'
import { requestBookmarkToast } from '../lib/bookmarkInteractionBridge'

interface LayerListProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  activeMaskIds: ReadonlySet<string>
  activeMuteIds: ReadonlySet<string>
  activeSkipIds: ReadonlySet<string>
  hiddenGroupIds?: ReadonlySet<string>
  soloGroupId?: string | null
  collapsedGroupIds?: ReadonlySet<string>
  onToggleGroupCollapsed?: (groupId: string) => void
  onCollapseAllGroups?: () => void
  onExpandAllGroups?: () => void
  onAfterChange?: () => void
  onAfterTimingMutation?: () => void
  onItemSelected?: () => void
  embedded?: boolean
  initialFilterMode?: FilterMode
  includeBookmarks?: boolean
}

interface LayerRowProps {
  row: LayerListRow
  isSelected: boolean
  isPrimarySelection: boolean
  isActive: boolean
  isEnabled: boolean
  videoSrc: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void
  onToggleEnabled: () => void
  onToggleLocked: () => void
  onDelete: () => void
  onLabelChange: (label: string) => void
  isLocked: boolean
  onAfterChange?: () => void
  onAfterTimingMutation?: () => void
}

function LayerRow({
  row,
  isSelected,
  isPrimarySelection,
  isActive,
  isEnabled,
  videoSrc,
  videoRef,
  onSelect,
  onToggleEnabled,
  onToggleLocked,
  onDelete,
  onLabelChange,
  onAfterTimingMutation,
  isLocked
}: LayerRowProps): ReactElement {
  const { type, label, item } = row
  const typeClass =
    type === 'mask'
      ? 'layer-list__badge--type-mask'
      : type === 'mute'
        ? 'layer-list__badge--type-mute'
        : type === 'skip'
          ? 'layer-list__badge--type-skip'
          : 'layer-list__badge--type-bookmark'

  const onJumpToStart = (): void => {
    const video = videoRef.current
    if (!video) {
      return
    }
    setCurrentTimeDebug(video, 'other', item.start)
    onAfterTimingMutation?.()
  }

  const statusBadge = isLocked ? (
    <span className="layer-list__badge layer-list__badge--locked">{t('layers.locked')}</span>
  ) : !isEnabled ? (
    <span className="layer-list__badge layer-list__badge--disabled">{t('layers.disabled')}</span>
  ) : type === 'bookmark' ? (
    <span className="layer-list__badge layer-list__badge--bookmark-enabled">{t('inspector.enabled')}</span>
  ) : (
    <span
      className={`layer-list__badge${isActive ? ' layer-list__badge--active' : ' layer-list__badge--hidden'}`}
    >
      {isActive ? t('layers.active') : t('layers.hidden')}
    </span>
  )

  return (
    <li
      className={`layer-list__item${isSelected ? ' layer-list__item--selected' : ''}${!isEnabled ? ' layer-list__item--disabled' : ''}`}
    >
      <button type="button" className="layer-list__select" onClick={onSelect}>
        <span className={`layer-list__type ${typeClass}`}>
          {type === 'mask'
            ? t('layers.maskType')
            : type === 'mute'
              ? t('layers.muteType')
              : type === 'skip'
                ? t('layers.skipType')
                : <><BookmarkIcon aria-hidden /> {t('inspector.bookmark')}</>}
        </span>
        {isPrimarySelection ? (
          <input
            key={item.id}
            type="text"
            className="layer-list__label-input"
            placeholder={label}
            onClick={(event) => event.stopPropagation()}
            defaultValue={item.label ?? ''}
            onBlur={(event) => onLabelChange(event.target.value)}
          />
        ) : (
          <span className="layer-list__id">{label}</span>
        )}
        <span className="layer-list__timing ltr-digits">
          {formatSeconds(item.start)}{type === 'bookmark' ? null : <> → {formatSeconds(item.end)}</>}
        </span>
        {type === 'bookmark' && item.notes?.trim() ? (
          <span className="layer-list__notes">{item.notes.trim()}</span>
        ) : null}
        {statusBadge}
      </button>
      <div className="layer-list__actions">
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          disabled={!videoSrc}
          title={videoSrc ? t('layers.jumpToStart') : t('layers.loadVideoToJump')}
          onClick={onJumpToStart}
        >
          {t('layers.jump')}
        </button>
        <button type="button" className="btn btn-secondary btn-compact" onClick={onToggleEnabled}>
          {isEnabled ? t('layers.disable') : t('layers.enable')}
        </button>
        <button type="button" className="btn btn-secondary btn-compact" onClick={onToggleLocked}>
          {isLocked ? t('layers.unlock') : t('layers.lock')}
        </button>
        <button type="button" className="btn btn-ghost btn-compact" onClick={onDelete}>
          {t('layers.delete')}
        </button>
      </div>
    </li>
  )
}

function renderRow(
  row: LayerListRow,
  props: Omit<LayerListProps, 'videoRef'> & {
    videoRef: React.RefObject<HTMLVideoElement | null>
    videoSrc: string | null
    selectedItemId: string | null
    selectedItemType: string | null
    selectedItems: readonly SelectedTimelineItem[]
    activeMaskIds: ReadonlySet<string>
    activeMuteIds: ReadonlySet<string>
    activeSkipIds: ReadonlySet<string>
    selectTimelineItem: (id: string, type: LayerListRow['type']) => void
    toggleSelectedItem: (id: string, type: LayerListRow['type']) => void
    removeSelectedItem: () => void
    removeTrackItem: (id: string, type: LayerListRow['type']) => void
    toggleItemEnabled: (id: string, type: LayerListRow['type']) => void
    toggleItemLocked: (id: string, type: LayerListRow['type']) => void
    patchItemLabel: (id: string, type: LayerListRow['type'], label: string) => void
    onItemSelected?: () => void
  }
): ReactElement {
  const isSelected = includesTimelineSelectionItem(props.selectedItems, row.item.id, row.type)
  const isPrimarySelection = props.selectedItemId === row.item.id && props.selectedItemType === row.type
  const isEnabled = isTrackItemEnabled(row.item)
  const isActive =
    isEnabled &&
    (row.type === 'bookmark'
      ? false
      : row.type === 'mask'
      ? props.activeMaskIds.has(row.item.id)
      : row.type === 'mute'
        ? props.activeMuteIds.has(row.item.id)
        : props.activeSkipIds.has(row.item.id))

  return (
    <LayerRow
      key={`${row.type}-${row.item.id}`}
      row={row}
      isSelected={isSelected}
      isPrimarySelection={isPrimarySelection}
      isActive={isActive}
      isEnabled={isEnabled}
      videoSrc={props.videoSrc}
      videoRef={props.videoRef}
      onSelect={(event) => {
        if (isTimelineMultiSelectModifier(event)) props.toggleSelectedItem(row.item.id, row.type)
        else props.selectTimelineItem(row.item.id, row.type)
        const remainsSelected = includesTimelineSelectionItem(
          useVeilStore.getState().selectedItems,
          row.item.id,
          row.type
        )
        if (row.type === 'bookmark' && remainsSelected) requestBookmarkToast(row.item.id)
        props.onItemSelected?.()
      }}
      onToggleEnabled={() => {
        props.toggleItemEnabled(row.item.id, row.type)
        props.onAfterChange?.()
      }}
      onToggleLocked={() => {
        props.toggleItemLocked(row.item.id, row.type)
        props.onAfterChange?.()
      }}
      isLocked={row.item.locked === true}
      onDelete={() => {
        const confirmed = confirmNative(t('dialog.deleteTitle', { type: row.label }), t('layers.deleteConfirm', { label: row.label }))
        if (!confirmed) {
          return
        }
        if (isSelected) props.removeSelectedItem()
        else props.removeTrackItem(row.item.id, row.type)
        props.onAfterChange?.()
      }}
      onLabelChange={(nextLabel) => {
        props.patchItemLabel(row.item.id, row.type, nextLabel)
      }}
      onAfterChange={props.onAfterChange}
      onAfterTimingMutation={props.onAfterTimingMutation}
    />
  )
}

export default function LayerList({
  videoRef,
  activeMaskIds,
  activeMuteIds,
  activeSkipIds,
  hiddenGroupIds = new Set(),
  soloGroupId = null,
  collapsedGroupIds = new Set(),
  onToggleGroupCollapsed,
  onCollapseAllGroups,
  onExpandAllGroups,
  onAfterChange,
  onAfterTimingMutation,
  onItemSelected,
  embedded = false,
  initialFilterMode = 'all',
  includeBookmarks = false
}: LayerListProps) {
  useLanguage()
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const groups = useVeilStore((state) => state.groups)
  const videoSrc = useVeilStore((state) => state.videoSrc)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const selectedItems = useVeilStore((state) => state.selectedItems)
  const selectTimelineItem = useVeilStore((state) => state.selectTimelineItem)
  const toggleSelectedItem = useVeilStore((state) => state.toggleSelectedItem)
  const removeSelectedItem = useVeilStore((state) => state.removeSelectedItem)
  const removeTrackItem = useVeilStore((state) => state.removeTrackItem)
  const toggleItemEnabled = useVeilStore((state) => state.toggleItemEnabled)
  const toggleItemLocked = useVeilStore((state) => state.toggleItemLocked)
  const patchItemLabel = useVeilStore((state) => state.patchItemLabel)

  const [sortMode, setSortMode] = useState<SortMode>('time')
  const [filterMode, setFilterMode] = useState<FilterMode>(initialFilterMode)

  useEffect(() => {
    setFilterMode(initialFilterMode)
  }, [initialFilterMode])

  const visibleBookmarks = useMemo(
    () => includeBookmarks ? bookmarks : [],
    [bookmarks, includeBookmarks]
  )
  const totalCount = getTotalTrackItemCount({ masks, mutes, skips, bookmarks: visibleBookmarks })
  const groupCount = groups.length

  const visibleRows = useMemo(() => {
    const rows = buildLayerListRows(masks, mutes, skips, visibleBookmarks)
    const sorted = sortLayerRows(rows, sortMode)
    const filtered = filterLayerRows(sorted, filterMode, {
      mask: activeMaskIds,
      mute: activeMuteIds,
      skip: activeSkipIds
    })
    return filterRowsByGroupVisibility(filtered, groups, hiddenGroupIds, soloGroupId)
  }, [
    masks,
    mutes,
    skips,
    visibleBookmarks,
    groups,
    sortMode,
    filterMode,
    activeMaskIds,
    activeMuteIds,
    activeSkipIds,
    hiddenGroupIds,
    soloGroupId
  ])

  const useGroupedView = filterMode === 'all' && groups.length > 0 && sortMode === 'time'
  const sections = useMemo(() => {
    if (!useGroupedView) {
      return null
    }
    return buildLayerSections(visibleRows, groups)
  }, [useGroupedView, visibleRows, groups])

  const rowProps = {
    videoRef,
    videoSrc,
    selectedItemId,
    selectedItemType,
    selectedItems,
    activeMaskIds,
    activeMuteIds,
    activeSkipIds,
    selectTimelineItem,
    toggleSelectedItem,
    removeSelectedItem,
    removeTrackItem,
    toggleItemEnabled,
    toggleItemLocked,
    patchItemLabel,
    onAfterChange,
    onAfterTimingMutation,
    onItemSelected
  }

  if (totalCount === 0) {
    return (
      <section
        className={`layer-list layer-list--empty${embedded ? ' layer-list--embedded' : ''}`}
        aria-label={t('layers.ariaLabel')}
      >
        {embedded ? null : <h2 className="track-sidebar__title">{t('layers.title')}</h2>}
        <p className="layer-list__hint">{t('layers.empty')}</p>
      </section>
    )
  }

  const layersTitle =
    groupCount > 0
      ? t('layers.titleWithGroups', { count: totalCount, groups: groupCount })
      : totalCount > 50
        ? t('layers.titleWithCount', { count: totalCount })
        : t('layers.title')

  return (
    <section
      className={`layer-list${embedded ? ' layer-list--embedded' : ''}`}
      aria-label={t('layers.ariaLabel')}
    >
      {embedded ? null : <h2 className="track-sidebar__title">{layersTitle}</h2>}
      <LayerListControls
        sortMode={sortMode}
        filterMode={filterMode}
        onSortChange={setSortMode}
        onFilterChange={setFilterMode}
        includeBookmarks={includeBookmarks}
      />
      {useGroupedView && onCollapseAllGroups && onExpandAllGroups ? (
        <div className="layer-list__group-bulk">
          <button type="button" className="btn btn-ghost btn-compact" onClick={onCollapseAllGroups}>
            {t('layers.collapseGroups')}
          </button>
          <button type="button" className="btn btn-ghost btn-compact" onClick={onExpandAllGroups}>
            {t('layers.expandGroups')}
          </button>
        </div>
      ) : null}
      {visibleRows.length === 0 ? (
        <p className="layer-list__hint">{t('layers.noFilterMatch')}</p>
      ) : sections ? (
        <div className="layer-list__sections">
          {sections.map((section) => {
            const isCollapsed = collapsedGroupIds.has(section.id)
            return (
              <div key={section.id} className="layer-list__section">
                <button
                  type="button"
                  className="layer-list__section-header"
                  onClick={() => onToggleGroupCollapsed?.(section.id)}
                >
                  <span className="layer-list__section-chevron">{isCollapsed ? '▸' : '▾'}</span>
                  <span>{section.label}</span>
                  <span className="layer-list__section-count">{section.rows.length}</span>
                </button>
                {!isCollapsed ? (
                  <ul className="layer-list__items">
                    {section.rows.map((row) => renderRow(row, rowProps))}
                  </ul>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <ul className="layer-list__items">
          {visibleRows.map((row) => renderRow(row, rowProps))}
        </ul>
      )}
    </section>
  )
}
