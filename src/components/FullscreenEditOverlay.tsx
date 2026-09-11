import { useMotionPreferences } from '../hooks/useMotionPreferences'
import { shouldAnimateTransitions } from '../lib/motionPreferences'
import type { PlaybackSpeedPreset } from '../lib/playbackHelpers'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { formatSeconds, formatTime } from '../lib/time'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { confirmNative } from '../lib/nativeConfirm'
import type { SelectableItemType } from '../lib/trackItems'
import { includesTimelineSelectionItem, type SelectedTimelineItem } from '../lib/timelineMultiSelection'
import type { FullscreenLayerFilter } from '../lib/fullscreenLayerFilter'
import TrackEditor from './TrackEditor'
import TimelineScrubStrip from './TimelineScrubStrip'
import FullscreenVeilActivityRail from './FullscreenVeilActivityRail'
import type { PlaybackCapabilities } from '../lib/playbackCapabilities'
import { canCreateRangeActions } from '../lib/authoringCapabilities'
import VolumeControl from './VolumeControl'
import PlaybackRateControl from './PlaybackRateControl'
import PlayerUtilityControls from './PlayerUtilityControls'
import type { BookmarkTrackItem } from '../types/track'
import BookmarkActivitySurface from './BookmarkActivitySurface'
import { revealElementInScrollableViewport } from '../lib/scrollReveal'
import BookmarkItemEditor from './BookmarkItemEditor'
import LayerSelectionPreview from './LayerSelectionPreview'
import { CopyIcon, EditIcon, FullscreenExitIcon, LayersIcon, PauseIcon, PlayIcon, PowerIcon, TrashIcon } from './icons'
import { deriveLayerPanelState } from '../lib/layerPanelState'
import { formatBookmarkClipboardText } from '../lib/bookmarkClipboard'

export interface ActiveLayerSummary {
  id: string
  label: string
  type: SelectableItemType
  start: number
  end: number
  notes?: string
  enabled?: boolean
}

interface FullscreenEditOverlayProps {
  layoutMode?: 'overlay' | 'youtube-sibling'
  visible: boolean
  drawerOpen: boolean
  duration: number
  displayTime: number
  isPlaying: boolean
  playbackRate?: PlaybackSpeedPreset
  selectedItemId: string | null
  selectedItemType?: SelectableItemType | null
  selectedItems?: readonly SelectedTimelineItem[]
  bookmarks?: BookmarkTrackItem[]
  bookmarkActivity?: BookmarkTrackItem | null
  bookmarkActivityRefreshKey?: number
  bookmarkActivityInitiallyEditing?: boolean
  showActivityRail?: boolean
  bookmarkActivityDisplayDurationMs?: number
  layerItems: ActiveLayerSummary[]
  activityRailItems?: ActiveLayerSummary[]
  totalLayerCount: number
  layerFilter: FullscreenLayerFilter
  onLayerFilterChange: (filter: FullscreenLayerFilter) => void
  onActivity: () => void
  onCloseDrawer: () => void
  onOpenDrawer: () => void
  onExitFullscreen: () => void
  onTogglePlayPause: () => void
  onSeek: (time: number) => void
  onSeekBookmark?: (time: number, bookmarkId: string) => void
  onSelectBookmark?: (id: string) => void
  onAddMask: () => void
  onAddMute: () => void
  onAddSkip: () => void
  onAddBookmark: () => void
  videoRef: RefObject<HTMLVideoElement | null>
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onMutedChange: (muted: boolean) => void
  onPlaybackRateChange: (rate: PlaybackSpeedPreset) => void
  subtitleSheetOpen: boolean
  showBookmarkAction?: boolean
  capabilities: PlaybackCapabilities
  onSelectItem: (id: string | null, type: SelectableItemType | null) => void
  onEditItem: (id: string, type: SelectableItemType) => void
  onDeleteItem: (id: string, type: SelectableItemType) => void
  onToggleItemEnabled?: (id: string, type: Exclude<SelectableItemType, 'bookmark'>) => void
  onAfterTimingMutation: () => void
  onSaveBookmarkDetails?: (details: Pick<BookmarkTrackItem, 'label' | 'notes'>) => void
  onDeleteBookmark?: () => void
  onDismissBookmarkActivity?: () => void
}

interface ToolbarButtonProps {
  label: string
  shortcut: string
  title: string
  onClick: () => void
  disabled?: boolean
  tone?: 'mask' | 'mute' | 'skip' | 'bookmark'
}

export type FullscreenLayerSort = 'time' | 'type'

const FULLSCREEN_TYPE_RANK: Record<SelectableItemType, number> = {
  mask: 0,
  mute: 1,
  skip: 2,
  bookmark: 3
}

export function sortFullscreenLayerItems(
  items: readonly ActiveLayerSummary[],
  sort: FullscreenLayerSort
): ActiveLayerSummary[] {
  return [...items].sort((a, b) => {
    if (sort === 'type') {
      const typeDifference = FULLSCREEN_TYPE_RANK[a.type] - FULLSCREEN_TYPE_RANK[b.type]
      if (typeDifference !== 0) return typeDifference
    }
    if (a.start !== b.start) return a.start - b.start
    if (sort === 'time') {
      const typeDifference = FULLSCREEN_TYPE_RANK[a.type] - FULLSCREEN_TYPE_RANK[b.type]
      if (typeDifference !== 0) return typeDifference
    }
    return a.id.localeCompare(b.id)
  })
}

function ToolbarButton({ label, shortcut, title, onClick, disabled = false, tone }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-secondary fullscreen-overlay__toolbar-btn${tone ? ` fullscreen-overlay__toolbar-btn--${tone}` : ''}`}
      title={title}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="fullscreen-overlay__toolbar-label">{label}</span>
      <kbd className="fullscreen-overlay__toolbar-kbd" aria-hidden>
        {shortcut}
      </kbd>
    </button>
  )
}

export default function FullscreenEditOverlay({
  layoutMode = 'overlay',
  visible,
  drawerOpen,
  duration,
  displayTime,
  isPlaying,
  playbackRate = 1,
  selectedItemId,
  selectedItemType = null,
  selectedItems = [],
  bookmarks = [],
  bookmarkActivity = null,
  bookmarkActivityRefreshKey,
  bookmarkActivityInitiallyEditing = false,
  showActivityRail = true,
  bookmarkActivityDisplayDurationMs,
  layerItems,
  activityRailItems = [],
  totalLayerCount,
  layerFilter,
  onLayerFilterChange,
  onActivity,
  onCloseDrawer,
  onOpenDrawer,
  onExitFullscreen,
  onTogglePlayPause,
  onSeek,
  onSeekBookmark,
  onSelectBookmark,
  onAddMask,
  onAddMute,
  onAddSkip,
  onAddBookmark,
  videoRef,
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  onPlaybackRateChange,
  subtitleSheetOpen,
  showBookmarkAction = true,
  capabilities,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  onToggleItemEnabled = () => {},
  onAfterTimingMutation,
  onSaveBookmarkDetails,
  onDeleteBookmark,
  onDismissBookmarkActivity
}: FullscreenEditOverlayProps) {
  useLanguage()
  const motionPrefs = useMotionPreferences()
  const motionAllowed = shouldAnimateTransitions(motionPrefs)
  const youtubeSiblingLayout = layoutMode === 'youtube-sibling'
  const [layerSort, setLayerSort] = useState<FullscreenLayerSort>('time')
  const [editingLayerKey, setEditingLayerKey] = useState<string | null>(null)
  const [editorDraftDirty, setEditorDraftDirty] = useState(false)
  const layerViewportRef = useRef<HTMLDivElement>(null)
  const selectedLayerRowRef = useRef<HTMLLIElement>(null)
  const sortedLayerItems = useMemo(
    () => sortFullscreenLayerItems(layerItems, layerSort),
    [layerItems, layerSort]
  )
  const editingLayer = useMemo(
    () => layerItems.find((item) => `${item.type}:${item.id}` === editingLayerKey) ?? null,
    [editingLayerKey, layerItems]
  )
  const selectedLayer = useMemo(
    () => layerItems.find((item) => item.id === selectedItemId && item.type === selectedItemType) ?? null,
    [layerItems, selectedItemId, selectedItemType]
  )
  const { isEditingSelectedLayer, showPreview, showEditor } = deriveLayerPanelState(
    selectedLayer ? { id: selectedLayer.id, type: selectedLayer.type } : null,
    editingLayerKey
  )

  useEffect(() => {
    if (editingLayerKey && (!editingLayer || !isEditingSelectedLayer)) {
      setEditingLayerKey(null)
      setEditorDraftDirty(false)
    }
  }, [editingLayer, editingLayerKey, isEditingSelectedLayer])

  const canLeaveEditor = (): boolean => (
    !editorDraftDirty || confirmNative(t('dialog.discardChanges'), 'Discard unsaved editor changes?')
  )

  const closeEditor = (): void => {
    setEditingLayerKey(null)
    setEditorDraftDirty(false)
  }

  const selectLayerRow = (item: ActiveLayerSummary): void => {
    if (editingLayerKey !== `${item.type}:${item.id}` && !canLeaveEditor()) return
    if (editingLayerKey !== `${item.type}:${item.id}`) closeEditor()
    onSelectItem(item.id, item.type)
  }

  const editLayer = (item: ActiveLayerSummary): void => {
    if (editingLayerKey !== `${item.type}:${item.id}` && !canLeaveEditor()) return
    onEditItem(item.id, item.type)
    setEditingLayerKey(`${item.type}:${item.id}`)
    if (editingLayerKey !== `${item.type}:${item.id}`) setEditorDraftDirty(false)
  }

  const deleteLayer = (item: ActiveLayerSummary): void => {
    const label = layerTypeLabel(item.type)
    if (!confirmNative(t('dialog.deleteTitle', { type: label }), t('inspector.deleteConfirm', { type: label }))) return
    if (editingLayerKey === `${item.type}:${item.id}`) closeEditor()
    onDeleteItem(item.id, item.type)
  }

  const toggleLayerEnabled = (item: ActiveLayerSummary): void => {
    if (item.type === 'bookmark') return
    onToggleItemEnabled(item.id, item.type)
    onAfterTimingMutation()
  }

  const copyBookmark = async (item: ActiveLayerSummary): Promise<void> => {
    try {
      await navigator.clipboard.writeText(formatBookmarkClipboardText(item))
    } catch {
      // Clipboard access is optional.
    }
  }

  const closeDrawer = (): void => {
    if (!canLeaveEditor()) return
    closeEditor()
    onCloseDrawer()
  }

  const changeLayerFilter = (filter: FullscreenLayerFilter): void => {
    if (!canLeaveEditor()) return
    closeEditor()
    onLayerFilterChange(filter)
  }

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    onActivity()
    if (event.key !== 'Escape' || !editingLayer) return
    if ((event.target as HTMLElement).classList?.contains('compact-range-timing__input')) return
    event.stopPropagation()
    if (!canLeaveEditor()) return
    event.preventDefault()
    closeEditor()
  }

  useEffect(() => {
    const viewport = layerViewportRef.current
    const row = selectedLayerRowRef.current
    if (drawerOpen && viewport && row) revealElementInScrollableViewport(viewport, row)
  }, [drawerOpen, layerFilter, layerSort, selectedItemId, selectedItemType])

  const transportVisible = visible || Boolean(bookmarkActivity && bookmarkActivityInitiallyEditing)
  const workspaceVisible = transportVisible || drawerOpen || Boolean(bookmarkActivity)
  const chromeClass = workspaceVisible
    ? motionAllowed
      ? 'fullscreen-overlay--visible'
      : 'fullscreen-overlay--visible fullscreen-overlay--instant'
    : 'fullscreen-overlay--hidden'

  const layerTypeLabel = (type: SelectableItemType): string => {
    if (type === 'mask') {
      return t('timeline.mask')
    }
    if (type === 'mute') {
      return t('timeline.mute')
    }
    if (type === 'skip') {
      return t('timeline.skip')
    }
    return t('bookmarks.defaultLabel')
  }

  const showLayerFilterToggle = totalLayerCount > 0
  const hasRangeAuthoring = canCreateRangeActions(capabilities)
  const canShowBookmark = showBookmarkAction && capabilities.canCreateBookmark
  const hasAuthoringActions = hasRangeAuthoring || canShowBookmark
  const emptyLayerMessage =
    layerFilter === 'all' ? t('fullscreen.noLayers') : t('fullscreen.noActiveLayers')

  return (
    <div
      className={`fullscreen-overlay${youtubeSiblingLayout ? ' fullscreen-overlay--youtube-sibling' : ''} ${chromeClass}`}
      aria-hidden={!workspaceVisible}
      onFocusCapture={onActivity}
      onKeyDownCapture={handleOverlayKeyDown}
    >
      {bookmarkActivity && !transportVisible && onDismissBookmarkActivity ? (
        <div
          className="fullscreen-overlay__bookmark-activity-layer"
          aria-label="Bookmark activity"
        >
          <BookmarkActivitySurface
            bookmark={bookmarkActivity}
            refreshKey={bookmarkActivityRefreshKey}
            displayDurationMs={bookmarkActivityDisplayDurationMs}
            onSaveDetails={onSaveBookmarkDetails}
            onDelete={onDeleteBookmark}
            onDismiss={onDismissBookmarkActivity}
          />
        </div>
      ) : null}
      {transportVisible ? (
      <div
        className="fullscreen-overlay__bottom"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerEnter={onActivity}
      >
        <div className="fullscreen-overlay__transport">
          <>
              <div className="fullscreen-overlay__playback-group">
                <button
                  type="button"
                  className="btn btn-secondary fullscreen-overlay__play-toggle"
                  onClick={onTogglePlayPause}
                  aria-label={isPlaying ? t('playback.pause') : t('playback.play')}
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  <span>{isPlaying ? t('playback.pause') : t('playback.play')}</span>
                </button>
                <span className="time-readout ltr-digits">
                  {formatTime(displayTime)} / {formatTime(duration)}
                </span>
              </div>
              {hasAuthoringActions ? (
                <div className="fullscreen-overlay__youtube-authoring" aria-label={t('fullscreen.layers')}>
                  {capabilities.canCreateMask ? <ToolbarButton label={t('timeline.mask')} shortcut="M" title={`${t('timeline.mask')} (M)`} onClick={onAddMask} tone="mask" /> : null}
                  {capabilities.canCreateMuteRange ? <ToolbarButton label={t('timeline.mute')} shortcut="U" title={`${t('timeline.mute')} (U)`} onClick={onAddMute} tone="mute" /> : null}
                  {capabilities.canCreateSkipRange ? <ToolbarButton label={t('timeline.skip')} shortcut="K" title={`${t('timeline.skip')} (K)`} onClick={onAddSkip} tone="skip" /> : null}
                  {canShowBookmark ? <ToolbarButton label={t('bookmarks.defaultLabel')} shortcut="B" title={`${t('bookmarks.add')} (B)`} onClick={onAddBookmark} tone="bookmark" /> : null}
                </div>
              ) : null}
              {bookmarkActivity && !showEditor && onDismissBookmarkActivity ? (
                <div className="fullscreen-overlay__youtube-activity" aria-label="Bookmark activity">
                  <BookmarkActivitySurface
                    refreshKey={bookmarkActivityRefreshKey}
                    bookmark={bookmarkActivity}
                    initiallyEditing={bookmarkActivityInitiallyEditing}
                    displayDurationMs={bookmarkActivityDisplayDurationMs}
                    onSaveDetails={onSaveBookmarkDetails}
                    onDelete={onDeleteBookmark}
                    onDismiss={onDismissBookmarkActivity}
                  />
                </div>
              ) : <div className="fullscreen-overlay__youtube-activity-spacer" aria-hidden />}
              <div className="fullscreen-overlay__transport-utilities">
                <PlayerUtilityControls
                  subtitleSheetOpen={subtitleSheetOpen}
                  showCc={capabilities.canImportCustomSubtitles}
                  showVeilMenu={capabilities.canSaveVeil || capabilities.canShareVeil}
                />
                <VolumeControl videoRef={videoRef} volume={volume} muted={muted} onVolumeChange={onVolumeChange} onMutedChange={onMutedChange} />
                <PlaybackRateControl value={playbackRate} onChange={onPlaybackRateChange} />
                {hasAuthoringActions ? (
                  <button
                    type="button"
                    className={`btn btn-secondary fullscreen-overlay__layers-button${drawerOpen ? ' fullscreen-overlay__layers-button--active' : ''}`}
                    onClick={drawerOpen ? closeDrawer : onOpenDrawer}
                    aria-label={t('fullscreen.layers')}
                    aria-pressed={drawerOpen}
                  >
                    <LayersIcon className="fullscreen-overlay__layers-icon" />
                    <span>{t('fullscreen.layers')}</span>
                  </button>
                ) : null}
                <button type="button" className="btn btn-secondary fullscreen-overlay__youtube-exit fullscreen-overlay__icon-control" onClick={onExitFullscreen} title={t('fullscreen.exit')} aria-label={t('fullscreen.exit')}>
                  <FullscreenExitIcon />
                </button>
              </div>
          </>
        </div>
        <TimelineScrubStrip
          duration={duration}
          currentTime={displayTime}
          onSeek={onSeek}
          bookmarks={bookmarks}
          selectedBookmarkId={selectedItemType === 'bookmark' ? selectedItemId : null}
          onSeekBookmark={onSeekBookmark}
          onSelectBookmark={onSelectBookmark}
        />
        {showActivityRail ? (
          <FullscreenVeilActivityRail duration={duration} items={activityRailItems} />
        ) : null}
      </div>
      ) : null}

      {hasAuthoringActions && drawerOpen ? (
        <aside
          className={`fullscreen-overlay__drawer${youtubeSiblingLayout ? ' fullscreen-overlay__drawer--youtube-sibling' : ''}${showEditor ? ' fullscreen-overlay__drawer--editing' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="fullscreen-overlay__drawer-header">
            <h3 className="fullscreen-overlay__drawer-title">{t('fullscreen.layers')}</h3>
            <button
              type="button"
              className="btn btn-icon btn-ghost fullscreen-overlay__drawer-close"
              aria-label={t('common.close')}
              onClick={closeDrawer}
            >
              <span className="btn-icon__glyph" aria-hidden>
                ×
              </span>
            </button>
          </div>
          <div className="fullscreen-overlay__drawer-controls">
          {showLayerFilterToggle ? (
            <div className="fullscreen-overlay__layer-filter" role="tablist" aria-label={t('fullscreen.layerFilterAria')}>
              <button
                type="button"
                role="tab"
                aria-selected={layerFilter === 'active'}
                className={`fullscreen-overlay__layer-filter-btn${layerFilter === 'active' ? ' fullscreen-overlay__layer-filter-btn--active' : ''}`}
                onClick={() => changeLayerFilter('active')}
              >
                {t('fullscreen.layerFilterActive')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={layerFilter === 'all'}
                className={`fullscreen-overlay__layer-filter-btn${layerFilter === 'all' ? ' fullscreen-overlay__layer-filter-btn--active' : ''}`}
                onClick={() => changeLayerFilter('all')}
              >
                {t('fullscreen.layerFilterAll')}
              </button>
            </div>
          ) : null}
          <label className="fullscreen-overlay__layer-sort">
            <span>{t('layers.sort')}</span>
            <select
              value={layerSort}
              onChange={(event) => setLayerSort(event.target.value as FullscreenLayerSort)}
              aria-label={t('layers.sort')}
            >
              <option value="time">{t('layers.sortTime')}</option>
              <option value="type">{t('layers.sortType')}</option>
            </select>
          </label>
          </div>
          <div
            ref={layerViewportRef}
            className={`fullscreen-overlay__drawer-layers${showEditor ? ' fullscreen-overlay__drawer-layers--compact' : ''}`}
          >
            {sortedLayerItems.length === 0 ? (
              <p className="fullscreen-overlay__empty">{emptyLayerMessage}</p>
            ) : (
              <>
                <p className="fullscreen-overlay__active-heading">
                  {layerFilter === 'all' ? t('fullscreen.allHeading') : t('fullscreen.activeHeading')}
                </p>
                <ul className="fullscreen-overlay__active-list">
                  {sortedLayerItems.map((item) => {
                    const isSelected = selectedItems.length > 0
                      ? includesTimelineSelectionItem(selectedItems, item.id, item.type)
                      : selectedItemId === item.id && selectedItemType === item.type
                    return (
                      <li ref={isSelected ? selectedLayerRowRef : undefined} key={`${item.type}-${item.id}`} className="fullscreen-overlay__active-row">
                        <button
                          type="button"
                          className={`fullscreen-overlay__active-item fullscreen-overlay__active-item--${item.type}${isSelected ? ' fullscreen-overlay__active-item--selected' : ''}`}
                          aria-label={item.label}
                          aria-pressed={isSelected}
                          onClick={() => selectLayerRow(item)}
                        >
                          <span className="fullscreen-overlay__active-type">
                            {layerTypeLabel(item.type)}
                          </span>
                          <span className="fullscreen-overlay__active-timing ltr-digits">
                            {formatSeconds(item.start)}
                            {item.type === 'bookmark' ? null : <>–{formatSeconds(item.end)}</>}
                          </span>
                        </button>
                        <div className="fullscreen-overlay__row-actions">
                          {item.type !== 'bookmark' ? (
                            <button
                              type="button"
                              className={`fullscreen-overlay__go fullscreen-overlay__toggle-layer${item.enabled !== false ? ' fullscreen-overlay__toggle-layer--active' : ''}`}
                              aria-label={item.enabled !== false ? 'Disable layer' : 'Enable layer'}
                              title={item.enabled !== false ? 'Disable layer' : 'Enable layer'}
                              aria-pressed={item.enabled !== false}
                              onClick={(event) => { event.stopPropagation(); toggleLayerEnabled(item) }}
                            >
                              <PowerIcon />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="fullscreen-overlay__go fullscreen-overlay__edit-layer"
                            aria-label={`${t('bookmarks.edit')} ${item.label}`}
                            title={t('bookmarks.edit')}
                            onClick={(event) => { event.stopPropagation(); editLayer(item) }}
                          >
                            <EditIcon />
                          </button>
                          {item.type === 'bookmark' ? (
                            <button
                              type="button"
                              className="fullscreen-overlay__go fullscreen-overlay__copy-layer"
                              aria-label="Copy bookmark"
                              title="Copy bookmark"
                              onClick={(event) => { event.stopPropagation(); void copyBookmark(item) }}
                            >
                              <CopyIcon />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="fullscreen-overlay__go fullscreen-overlay__delete-layer"
                            aria-label={`Delete ${item.type}`}
                            title={`Delete ${item.type}`}
                            onClick={(event) => { event.stopPropagation(); deleteLayer(item) }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
          {showEditor && editingLayer ? (
            <div
              className="fullscreen-overlay__editor selected-layer-panel-region selected-layer-panel-region--editor"
              data-layer-editor-dirty={editorDraftDirty ? 'true' : undefined}
            >
              {editingLayer.type === 'bookmark' ? (
                <BookmarkItemEditor
                  labelMode="inspector"
                  fullscreen
                  onApplyComplete={closeEditor}
                  onCancelComplete={closeEditor}
                  onDirtyChange={setEditorDraftDirty}
                />
              ) : (
                <TrackEditor
                  labelMode="inspector"
                  fullscreen
                  onAfterTimingMutation={onAfterTimingMutation}
                  onApplyComplete={closeEditor}
                  onCancelComplete={closeEditor}
                  onDirtyChange={setEditorDraftDirty}
                />
              )}
            </div>
          ) : showPreview && selectedLayer ? (
            <LayerSelectionPreview
              className="fullscreen-overlay__layer-preview"
              item={{
                ...selectedLayer,
                active: selectedLayer.type !== 'bookmark' &&
                  selectedLayer.enabled !== false &&
                  displayTime >= selectedLayer.start &&
                  displayTime <= selectedLayer.end
              }}
            />
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}
