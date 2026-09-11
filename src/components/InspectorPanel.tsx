import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { consumeInspectorTabPreservation } from '../lib/inspectorSelectionNavigation'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { t } from '../i18n'
import { confirmNative } from '../lib/nativeConfirm'
import { canCreateRangeActions, countUnsupportedActions } from '../lib/authoringCapabilities'
import { findSelectionAfterBookmarkDeletion, buildBookmarkNavigationItems } from '../lib/bookmarkNavigation'
import { filterNavigationItemsByQuery } from '../lib/bookmarkSearch'
import { bookmarkCsvFileName, buildBookmarkCsv } from '../lib/bookmarkCsv'
import { runAppMenuAction } from '../lib/appMenuBridge'
import { runClearTrackAction } from '../lib/clearTrackAction'
import { resolvePlaybackCapabilities } from '../lib/playbackCapabilities'
import { shouldDefaultInspectorToVeilTools } from '../lib/inspectorDefault'
import {
  buildInspectorNavigationItems,
  resolveInspectorEmptyStateKind,
  resolveInspectorEmptyStateAction,
  supportedInspectorTypeFilters,
  type InspectorNavigationItem,
  type InspectorStatusFilter,
  type InspectorTypeFilter
} from '../lib/inspectorNavigation'
import { navigationSearchPlaceholderKey } from '../lib/navigationSearch'
import type { FilterMode, SelectableItemType } from '../lib/trackItems'
import { includesTimelineSelectionItem } from '../lib/timelineMultiSelection'
import type { ActiveTrackTool } from '../lib/trackTools'
import { formatSeconds } from '../lib/time'
import { formatBookmarkClipboardText } from '../lib/bookmarkClipboard'
import { deriveLayerPanelState } from '../lib/layerPanelState'
import { useVeilStore } from '../state/useVeilStore'
import { pushSuccessToast, pushWarningToast } from '../state/useToastStore'
import { isYouTubeMediaSource } from '../types/mediaSource'
import type { YouTubeMediaSource } from '../types/mediaSource'
import { parseYouTubeUrl } from '../lib/youtubeUrl'
import { replaceWithCleanYouTubeSource } from '../lib/youtubeSourceChange'
import { requestBookmarkToast } from '../lib/bookmarkInteractionBridge'
import { revealElementInNearestScrollableAncestor } from '../lib/scrollReveal'
import BookmarkItemEditor from './BookmarkItemEditor'
import ChapterNavigationList from './ChapterNavigationList'
import YouTubeDescription from './YouTubeDescription'
import TrackEditor from './TrackEditor'
import LayerSelectionPreview from './LayerSelectionPreview'
import { BookmarkIcon, CopyIcon, EditIcon, InspectorCollapseIcon, LockIcon, MaskIcon, MuteIcon, PowerIcon, SkipIcon, TrashIcon, UnlockIcon } from './icons'

type InspectorTab = 'overview' | 'navigate' | 'details'

interface InspectorMenuItem {
  id: string
  label: string
  action: () => void
}

interface InspectorPanelProps {
  currentTime: number
  duration: number
  youtubePlaybackAvailable?: boolean
  onSeek: (time: number) => void
  onAddBookmark: () => void
  onOpenTrackTool: (tool: ActiveTrackTool) => void
  onOpenLayerManager: (filter?: FilterMode) => void
  onAfterTimingMutation?: () => void
  onActivateItem?: (id: string, type: SelectableItemType, start: number) => void
  onHide: () => void
}

function resolveInspectorTitle(
  trackMetadataTitle: string | undefined,
  videoFileName: string | null,
  untitledLabel: string
): string {
  const metadataTitle = trackMetadataTitle?.trim()
  if (metadataTitle) return metadataTitle

  const mediaTitle = videoFileName?.trim()
  if (!mediaTitle) return untitledLabel

  return mediaTitle.replace(/\.[^.\\/]+$/, '') || mediaTitle
}

export default function InspectorPanel({
  currentTime,
  duration,
  youtubePlaybackAvailable = false,
  onSeek,
  onAddBookmark,
  onOpenTrackTool,
  onOpenLayerManager,
  onAfterTimingMutation,
  onActivateItem,
  onHide
}: InspectorPanelProps) {
  useLanguage()
  const { runIfAllowed } = useUnsavedChangesGuard()
  const tabPrefix = useId()
  const [activeView, setActiveView] = useState<InspectorTab>(() => {
    const state = useVeilStore.getState()
    return shouldDefaultInspectorToVeilTools(state.mediaSource, state.mediaKind)
      ? 'overview'
      : 'navigate'
  })
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [navigationStatus, setNavigationStatus] = useState<InspectorStatusFilter>('all')
  const [navigationType, setNavigationType] = useState<InspectorTypeFilter>(null)
  const [navigationQuery, setNavigationQuery] = useState('')
  const [navigationSearchOpen, setNavigationSearchOpen] = useState(false)
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null)
  const [editingRangeId, setEditingRangeId] = useState<string | null>(null)
  const [editorDraftDirty, setEditorDraftDirty] = useState(false)
  const [mediaNotesExpanded, setMediaNotesExpanded] = useState(
    () => Boolean(useVeilStore.getState().trackMetadata.summary?.trim())
  )
  const titleRef = useRef<HTMLHeadingElement>(null)
  const titleTextRef = useRef<HTMLSpanElement>(null)
  const selectedNavigationRowRef = useRef<HTMLLIElement>(null)
  const navigationSearchRef = useRef<HTMLInputElement>(null)
  const [titleOverflow, setTitleOverflow] = useState(0)

  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const preservedUnsupportedItems = useVeilStore((state) => state.preservedUnsupportedItems)
  const trackMetadata = useVeilStore((state) => state.trackMetadata)
  const trackFilePath = useVeilStore((state) => state.trackFilePath)
  const videoFileName = useVeilStore((state) => state.videoFileName)
  const videoMetadata = useVeilStore((state) => state.videoMetadata)
  const videoFilePath = useVeilStore((state) => state.videoFilePath)
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const youtubeMetadata = useVeilStore((state) => state.youtubeMetadata)
  const isTrackDirty = useVeilStore((state) => state.isTrackDirty)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const selectedItems = useVeilStore((state) => state.selectedItems)
  const patchTrackMetadata = useVeilStore((state) => state.patchTrackMetadata)
  const setSelectedItem = useVeilStore((state) => state.setSelectedItem)
  const deleteBookmark = useVeilStore((state) => state.deleteBookmark)
  const toggleItemEnabled = useVeilStore((state) => state.toggleItemEnabled)
  const toggleItemLocked = useVeilStore((state) => state.toggleItemLocked)

  const capabilities = useMemo(
    () => resolvePlaybackCapabilities(mediaSource, mediaKind),
    [mediaKind, mediaSource]
  )
  const hasRangeAuthoring = canCreateRangeActions(capabilities)
  const selectedBookmarkId = selectedItemType === 'bookmark' ? selectedItemId : null
  const selectedBookmark = selectedBookmarkId
    ? bookmarks.find((bookmark) => bookmark.id === selectedBookmarkId) ?? null
    : null
  const youtubeMedia = mediaSource && isYouTubeMediaSource(mediaSource) ? mediaSource : null
  const sourceKey = mediaSource
    ? mediaSource.kind === 'youtube'
      ? `youtube:${mediaSource.videoId}`
      : `local:${mediaSource.path}`
    : 'none'

  useEffect(() => {
    setActiveView(shouldDefaultInspectorToVeilTools(mediaSource, mediaKind) ? 'overview' : 'navigate')
    setDescriptionExpanded(false)
    setNavigationStatus('all')
    setNavigationType(null)
    setNavigationQuery('')
    setEditingBookmarkId(null)
    setEditingRangeId(null)
    setEditorDraftDirty(false)
    setMediaNotesExpanded(Boolean(useVeilStore.getState().trackMetadata.summary?.trim()))
  }, [sourceKey])

  useEffect(() => {
    if (navigationType !== null && !supportedInspectorTypeFilters(capabilities).includes(navigationType)) {
      setNavigationType(null)
    }
  }, [capabilities, navigationType])

  useEffect(() => {
    if (navigationSearchOpen) navigationSearchRef.current?.focus()
  }, [navigationSearchOpen])

  useEffect(() => {
    if (!selectedItemId || !selectedItemType) return
    if (consumeInspectorTabPreservation(selectedItemId, selectedItemType)) return
    setActiveView('navigate')
  }, [selectedItemId, selectedItemType])

  useLayoutEffect(() => {
    const row = selectedNavigationRowRef.current
    if (activeView === 'navigate' && row) {
      revealElementInNearestScrollableAncestor(row)
    }
  }, [activeView, navigationStatus, navigationType, selectedItemId, selectedItemType])

  const trackName = useMemo(
    () => resolveInspectorTitle(
      trackMetadata.title,
      videoFileName,
      t('trackChip.untitledTrack')
    ),
    [trackMetadata.title, videoFileName]
  )
  const measureTitleOverflow = useCallback((): void => {
    const title = titleRef.current
    const text = titleTextRef.current
    if (!title || !text) return

    const overflow = Math.max(0, text.scrollWidth - title.clientWidth)
    setTitleOverflow((current) => current === overflow ? current : overflow)
  }, [])

  useLayoutEffect(() => {
    measureTitleOverflow()
    const title = titleRef.current
    const text = titleTextRef.current
    if (!title || !text) return

    const observer = new ResizeObserver(measureTitleOverflow)
    observer.observe(title)
    observer.observe(text)
    return () => observer.disconnect()
  }, [measureTitleOverflow, trackName])

  const titleScrollStyle = titleOverflow > 0
    ? {
        '--inspector-title-scroll-distance': `${titleOverflow + 4}px`,
        '--inspector-title-scroll-duration': `${Math.max(3000, titleOverflow * 30 + 1000)}ms`
      } as CSSProperties
    : undefined
  const sourceLabel = youtubeMedia ? 'YouTube' : mediaKind === 'audio' ? t('media.audio') : t('details.localVideo')
  const unsupportedActionCount = countUnsupportedActions(capabilities, [
    ...preservedUnsupportedItems,
    ...masks,
    ...mutes,
    ...skips
  ])

  const removeBookmark = (id: string): void => {
    if (!confirmNative(t('dialog.deleteTitle', { type: t('inspector.bookmark') }), t('bookmarks.confirmDelete'))) return
    const state = useVeilStore.getState()
    const partOfMultiSelection = state.selectedItems.length > 1 && state.selectedItems.some(
      (item) => item.id === id && item.type === 'bookmark'
    )
    if (partOfMultiSelection) {
      state.removeSelectedItem()
      setEditingBookmarkId(null)
      return
    }
    const items = buildBookmarkNavigationItems(bookmarks)
    const next = findSelectionAfterBookmarkDeletion(items, id)
    deleteBookmark(id)
    setEditingBookmarkId(null)
    if (next) {
      setSelectedItem(next.id, 'bookmark')
      onSeek(next.start)
    } else {
      setSelectedItem(null, null)
    }
  }
  const copyBookmark = async (bookmark: { start: number; label?: string; notes?: string }): Promise<void> => {
    try {
      await navigator.clipboard.writeText(formatBookmarkClipboardText(bookmark))
    } catch {
      // Clipboard access is optional.
    }
  }
  const copyLink = async (): Promise<void> => {
    if (!youtubeMedia) return
    try {
      await navigator.clipboard.writeText(youtubeMedia.canonicalUrl)
    } catch {
      // Clipboard access is optional.
    }
  }
  const openConfirmedYouTubeSource = (source: YouTubeMediaSource): void => {
    const state = useVeilStore.getState()
    replaceWithCleanYouTubeSource(source, state)
  }
  const activateDescriptionLink = (url: string): void => {
    const parsed = parseYouTubeUrl(url)
    if (parsed.ok && parsed.source.videoId !== youtubeMedia?.videoId) {
      void runIfAllowed(() => openConfirmedYouTubeSource(parsed.source))
      return
    }
    void window.veil?.openExternalUrl?.(url)
  }

  const trackTools: InspectorMenuItem[] = hasRangeAuthoring ? [
    { id: 'layers', label: t('trackTools.layers'), action: () => onOpenTrackTool('layers') },
    ...(capabilities.canImportCustomSubtitles
      ? [{ id: 'subtitles', label: t('trackTools.subtitles'), action: () => onOpenTrackTool('subtitles') }]
      : []),
    { id: 'offset', label: t('trackTools.offsetShift'), action: () => onOpenTrackTool('offset') },
    { id: 'manual', label: t('trackTools.manualBuilder'), action: () => onOpenTrackTool('manual-builder') }
  ] : []
  const navigationTypes = supportedInspectorTypeFilters(capabilities)
  const navigationSearchVisible = navigationSearchOpen || navigationQuery.length > 0
  const navigationSearchPlaceholder = t(navigationSearchPlaceholderKey(navigationType))
  const emptyStateKind = resolveInspectorEmptyStateKind({
    statusFilter: navigationStatus,
    typeFilter: navigationType,
    supportedTypes: navigationTypes
  })
  const emptyState = {
    all: [
      'inspector.emptyAllTitle',
      capabilities.canCreateMask
        ? 'inspector.emptyAllDescription'
        : 'inspector.emptyAllAudioDescription'
    ],
    active: ['inspector.emptyActiveTitle', 'inspector.emptyActiveDescription'],
    mask: ['inspector.emptyMasksTitle', 'inspector.emptyMasksDescription'],
    mute: ['inspector.emptyMutesTitle', 'inspector.emptyMutesDescription'],
    skip: ['inspector.emptySkipsTitle', 'inspector.emptySkipsDescription'],
    bookmark: ['youtube.noBookmarksTitle', 'youtube.noBookmarksDescription']
  }[emptyStateKind]
  const emptyStateAction = resolveInspectorEmptyStateAction(emptyStateKind, capabilities)
  const emptyStateActionLabel = emptyStateAction === 'overview'
    ? t('inspector.openOverview')
    : emptyStateAction === 'mask'
      ? t('create.addMask')
      : emptyStateAction === 'mute'
        ? t('create.addMute')
        : emptyStateAction === 'skip'
          ? t('create.addSkip')
          : emptyStateAction === 'bookmark'
            ? t('bookmarks.add')
            : null

  const runEmptyStateAction = (): void => {
    if (emptyStateAction === 'overview') setActiveView('overview')
    else if (emptyStateAction === 'mask') runAppMenuAction('addMask')
    else if (emptyStateAction === 'mute') runAppMenuAction('addMute')
    else if (emptyStateAction === 'skip') runAppMenuAction('addSkip')
    else if (emptyStateAction === 'bookmark') onAddBookmark()
  }

  const exportBookmarks = async (): Promise<void> => {
    const csv = buildBookmarkCsv(bookmarks)
    if (!csv) {
      pushWarningToast(t('bookmarks.exportEmpty'))
      return
    }
    const result = await window.veil?.exportBookmarkCsv(csv, bookmarkCsvFileName(trackName))
    if (result?.ok) {
      pushSuccessToast(t('bookmarks.exported'))
    } else if (result && !result.canceled) {
      pushWarningToast(result.error || t('bookmarks.exportFailed'))
    }
  }
  const navigationItems = filterNavigationItemsByQuery(buildInspectorNavigationItems({
    masks,
    mutes,
    skips,
    bookmarks,
    capabilities,
    currentTime,
    statusFilter: navigationStatus,
    typeFilter: navigationType
  }), navigationQuery)
  const selectedNavigationItem = buildInspectorNavigationItems({
    masks,
    mutes,
    skips,
    bookmarks,
    capabilities,
    currentTime,
    statusFilter: 'all',
    typeFilter: null
  }).find((row) => row.item.id === selectedItemId && row.type === selectedItemType) ?? null
  const editingKey = editingBookmarkId
    ? `bookmark:${editingBookmarkId}`
    : editingRangeId && selectedItemType && selectedItemType !== 'bookmark'
      ? `${selectedItemType}:${editingRangeId}`
      : null
  const { hasSelection, isEditingSelectedLayer, showPreview, showEditor } = deriveLayerPanelState(
    selectedNavigationItem
      ? { id: selectedNavigationItem.item.id, type: selectedNavigationItem.type }
      : null,
    editingKey
  )
  const hasTransientEditorState = editingBookmarkId !== null || editingRangeId !== null

  useEffect(() => {
    if (!hasTransientEditorState || isEditingSelectedLayer) return
    setEditingBookmarkId(null)
    setEditingRangeId(null)
    setEditorDraftDirty(false)
  }, [hasTransientEditorState, isEditingSelectedLayer])

  const handleNavigateEscape = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape' || !showEditor) return
    if ((event.target as HTMLElement).classList?.contains('compact-range-timing__input')) return
    event.stopPropagation()
    if (editorDraftDirty && !confirmNative(t('dialog.discardChanges'), 'Discard unsaved editor changes?')) return
    event.preventDefault()
    setEditingBookmarkId(null)
    setEditingRangeId(null)
    setEditorDraftDirty(false)
  }
  const typeLabel = (filter: Exclude<InspectorTypeFilter, null>): string => {
    if (filter === 'mask') return t('layers.filterMasks')
    if (filter === 'mute') return t('layers.filterMutes')
    if (filter === 'skip') return t('layers.filterSkips')
    return t('trackTools.bookmarks')
  }
  const typeIcon = (filter: Exclude<InspectorTypeFilter, null>) => {
    if (filter === 'mask') return <MaskIcon />
    if (filter === 'mute') return <MuteIcon />
    if (filter === 'skip') return <SkipIcon />
    return <BookmarkIcon />
  }
  const openNavigationType = (type: Exclude<InspectorTypeFilter, null>): void => {
    setNavigationStatus('all')
    setNavigationType(type)
    setActiveView('navigate')
  }
  const selectNavigationItem = (row: InspectorNavigationItem): void => {
    const editingItemId = editingBookmarkId ?? editingRangeId
    if (editingItemId && editingItemId !== row.item.id && editorDraftDirty &&
      !confirmNative(t('dialog.discardChanges'), 'Discard unsaved editor changes?')) {
      return
    }
    if (editingItemId !== row.item.id) {
      setEditingBookmarkId(null)
      setEditingRangeId(null)
      setEditorDraftDirty(false)
    }
    if (onActivateItem) {
      onActivateItem(row.item.id, row.type, row.item.start)
      return
    }
    setSelectedItem(row.item.id, row.type)
    if (row.type === 'bookmark') requestBookmarkToast(row.item.id)
    onSeek(row.item.start)
  }
  const editNavigationItem = (row: InspectorNavigationItem): void => {
    const editingItemId = editingBookmarkId ?? editingRangeId
    if (editingItemId && editingItemId !== row.item.id && editorDraftDirty &&
      !confirmNative(t('dialog.discardChanges'), 'Discard unsaved editor changes?')) {
      return
    }
    if (editingItemId !== row.item.id) setEditorDraftDirty(false)
    setSelectedItem(row.item.id, row.type)
    if (row.type === 'bookmark') {
      setEditingRangeId(null)
      setEditingBookmarkId(row.item.id)
    } else {
      setEditingBookmarkId(null)
      setEditingRangeId(row.item.id)
    }
  }
  const removeNavigationItem = (row: InspectorNavigationItem): void => {
    if (row.type === 'bookmark') {
      removeBookmark(row.item.id)
      return
    }
    const label = row.type === 'mask'
      ? t('timeline.mask')
      : row.type === 'mute'
        ? t('timeline.mute')
        : t('timeline.skip')
    if (!confirmNative(t('dialog.deleteTitle', { type: label }), t('inspector.deleteConfirm', { type: label }))) return
    const state = useVeilStore.getState()
    const partOfMultiSelection = state.selectedItems.length > 1 && state.selectedItems.some(
      (item) => item.id === row.item.id && item.type === row.type
    )
    if (partOfMultiSelection) state.removeSelectedItem()
    else state.removeTrackItem(row.item.id, row.type)
    setEditingRangeId(null)
    setEditorDraftDirty(false)
    onAfterTimingMutation?.()
  }

  const tabs: Array<{ id: InspectorTab; label: string }> = [
    { id: 'overview', label: t('inspector.overview') },
    { id: 'navigate', label: t('inspector.navigate') },
    { id: 'details', label: t('inspector.details') }
  ]

  return (
    <aside className="inspector-panel inspector-panel--navigation" aria-label={t('inspector.ariaLabel')}>
      <header className="inspector-panel__header inspector-panel__header--navigation">
        <div className="inspector-panel__identity">
          <span className="inspector-panel__eyebrow">VEIL</span>
          <h2
            ref={titleRef}
            className={`inspector-panel__title${titleOverflow > 0 ? ' inspector-panel__title--overflow' : ''}`}
            title={trackName}
            tabIndex={titleOverflow > 0 ? 0 : undefined}
            style={titleScrollStyle}
          >
            <span ref={titleTextRef} className="inspector-panel__title-text">{trackName}</span>
          </h2>
          <p>{sourceLabel} · <span className="ltr-digits">{formatSeconds(duration)}</span></p>
        </div>
        <div className="inspector-panel__header-actions">
          {isTrackDirty ? <span className="inspector-panel__dirty-badge">{t('inspector.unsaved')}</span> : null}
          <button
            type="button"
            className="inspector-panel__collapse-action"
            onClick={onHide}
            title="Hide Inspector"
            aria-label="Hide Inspector"
          >
            <InspectorCollapseIcon />
          </button>
        </div>
      </header>

      <div className="inspector-tabs" role="tablist" aria-label={t('inspector.ariaLabel')}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tabPrefix}-${tab.id}-tab`}
            aria-selected={activeView === tab.id}
            aria-controls={`${tabPrefix}-${tab.id}-panel`}
            tabIndex={activeView === tab.id ? 0 : -1}
            className={`inspector-tabs__tab${activeView === tab.id ? ' inspector-tabs__tab--active' : ''}`}
            onClick={() => setActiveView(tab.id)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              event.preventDefault()
              const index = tabs.findIndex((item) => item.id === tab.id)
              const delta = event.key === 'ArrowRight' ? 1 : -1
              const next = tabs[(index + delta + tabs.length) % tabs.length]
              setActiveView(next.id)
              document.getElementById(`${tabPrefix}-${next.id}-tab`)?.focus()
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="inspector-panel__tab-content">
        <div
          role="tabpanel"
          id={`${tabPrefix}-overview-panel`}
          aria-labelledby={`${tabPrefix}-overview-tab`}
          className="inspector-panel__overview"
          hidden={activeView !== 'overview'}
        >
            {hasRangeAuthoring || capabilities.canCreateBookmark ? <section className="inspector-panel__section-block" aria-label={t('inspector.sectionCreate')}>
              <h3 className="inspector-panel__section-heading">{t('inspector.sectionCreate')}</h3>
              <div className="inspector-panel__create-actions">
                {capabilities.canCreateMask ? (
                  <button type="button" className="inspector-panel__create-btn inspector-panel__create-btn--mask" onClick={() => runAppMenuAction('addMask')}>
                    <span className="inspector-navigation-list__type inspector-navigation-list__type--mask" aria-hidden><MaskIcon /></span>
                    <span className="inspector-panel__create-btn-copy"><span className="inspector-panel__create-btn-label">{t('timeline.mask')}</span><span className="inspector-panel__create-btn-desc" title={t('inspector.addMaskDescription')}>{t('inspector.addMaskDescription')}</span></span>
                    <span className="inspector-panel__create-btn-shortcut" aria-hidden>M</span>
                  </button>
                ) : null}
                {capabilities.canCreateMuteRange ? (
                  <button type="button" className="inspector-panel__create-btn inspector-panel__create-btn--mute" onClick={() => runAppMenuAction('addMute')}>
                    <span className="inspector-navigation-list__type inspector-navigation-list__type--mute" aria-hidden><MuteIcon /></span>
                    <span className="inspector-panel__create-btn-copy"><span className="inspector-panel__create-btn-label">{t('timeline.mute')}</span><span className="inspector-panel__create-btn-desc" title={t('inspector.addMuteDescription')}>{t('inspector.addMuteDescription')}</span></span>
                    <span className="inspector-panel__create-btn-shortcut" aria-hidden>U</span>
                  </button>
                ) : null}
                {capabilities.canCreateSkipRange ? (
                  <button type="button" className="inspector-panel__create-btn inspector-panel__create-btn--skip" onClick={() => runAppMenuAction('addSkip')}>
                    <span className="inspector-navigation-list__type inspector-navigation-list__type--skip" aria-hidden><SkipIcon /></span>
                    <span className="inspector-panel__create-btn-copy"><span className="inspector-panel__create-btn-label">{t('timeline.skip')}</span><span className="inspector-panel__create-btn-desc" title={t('inspector.addSkipDescription')}>{t('inspector.addSkipDescription')}</span></span>
                    <span className="inspector-panel__create-btn-shortcut" aria-hidden>K</span>
                  </button>
                ) : null}
                {capabilities.canCreateBookmark ? (
                  <button type="button" className="inspector-panel__create-btn inspector-panel__create-btn--bookmark" onClick={onAddBookmark}>
                    <span className="inspector-navigation-list__type inspector-navigation-list__type--bookmark" aria-hidden><BookmarkIcon /></span>
                    <span className="inspector-panel__create-btn-copy"><span className="inspector-panel__create-btn-label">{t('inspector.bookmark')}</span><span className="inspector-panel__create-btn-desc" title={t('inspector.addBookmarkDescription')}>{t('inspector.addBookmarkDescription')}</span></span>
                    <span className="inspector-panel__create-btn-shortcut" aria-hidden>B</span>
                  </button>
                ) : null}
              </div>
            </section> : null}
            <section className="inspector-panel__section-block" aria-label={t('inspector.sectionSummary')}>
              <h3 className="inspector-panel__section-heading">{t('inspector.sectionSummary')}</h3>
              <ul className="inspector-panel__summary-grid">
                {capabilities.canCreateMask ? (
                  <li>
                    <button type="button" className="inspector-panel__summary-card" aria-label={t('inspector.masks')} title={t('inspector.masks')} onClick={() => openNavigationType('mask')}>
                      <span className="inspector-panel__summary-card-main"><span className="inspector-navigation-list__type inspector-navigation-list__type--mask" aria-hidden><MaskIcon /></span><strong className="inspector-panel__summary-card-value ltr-digits">{masks.length}</strong></span>
                      <span className="inspector-panel__summary-card-label">{t('inspector.masks')}</span>
                    </button>
                  </li>
                ) : null}
                {capabilities.canCreateMuteRange ? (
                  <li>
                    <button type="button" className="inspector-panel__summary-card" aria-label={t('inspector.mutes')} title={t('inspector.mutes')} onClick={() => openNavigationType('mute')}>
                      <span className="inspector-panel__summary-card-main"><span className="inspector-navigation-list__type inspector-navigation-list__type--mute" aria-hidden><MuteIcon /></span><strong className="inspector-panel__summary-card-value ltr-digits">{mutes.length}</strong></span>
                      <span className="inspector-panel__summary-card-label">{t('inspector.mutes')}</span>
                    </button>
                  </li>
                ) : null}
                {capabilities.canCreateSkipRange ? (
                  <li>
                    <button type="button" className="inspector-panel__summary-card" aria-label={t('inspector.skips')} title={t('inspector.skips')} onClick={() => openNavigationType('skip')}>
                      <span className="inspector-panel__summary-card-main"><span className="inspector-navigation-list__type inspector-navigation-list__type--skip" aria-hidden><SkipIcon /></span><strong className="inspector-panel__summary-card-value ltr-digits">{skips.length}</strong></span>
                      <span className="inspector-panel__summary-card-label">{t('inspector.skips')}</span>
                    </button>
                  </li>
                ) : null}
                {capabilities.canEditBookmark ? (
                  <li>
                    <button type="button" className="inspector-panel__summary-card" aria-label={t('overview.bookmarks')} title={t('overview.bookmarks')} onClick={() => openNavigationType('bookmark')}>
                      <span className="inspector-panel__summary-card-main"><span className="inspector-navigation-list__type inspector-navigation-list__type--bookmark" aria-hidden><BookmarkIcon /></span><strong className="inspector-panel__summary-card-value ltr-digits">{bookmarks.length}</strong></span>
                      <span className="inspector-panel__summary-card-label">{t('overview.bookmarks')}</span>
                    </button>
                  </li>
                ) : null}
              </ul>
            </section>
            {trackTools.length > 0 ? <section className="inspector-panel__section-block" aria-label={t('inspector.sectionManage')}>
              <h3 className="inspector-panel__section-heading">{t('inspector.sectionManage')}</h3>
              <div className="inspector-panel__manage-actions">
                {trackTools.map((item) => (
                  <button key={item.id} type="button" className="btn btn-secondary btn-compact inspector-panel__manage-button" title={item.label} onClick={item.action}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section> : null}
            {capabilities.canEditMediaNotes ? (
              <section className="inspector-panel__media-notes" aria-label={t('inspector.mediaNotes')}>
                <button
                  type="button"
                  className="inspector-panel__media-notes-toggle"
                  aria-expanded={mediaNotesExpanded}
                  aria-controls={`${tabPrefix}-media-notes-editor`}
                  onClick={() => setMediaNotesExpanded((expanded) => !expanded)}
                >
                  <span className="inspector-panel__media-notes-copy">
                    <strong>{t('inspector.mediaNotes')}</strong>
                    <small title={trackMetadata.summary?.trim() || t('inspector.mediaNotesEmpty')}>
                      {trackMetadata.summary?.trim() || t('inspector.mediaNotesEmpty')}
                    </small>
                  </span>
                  <span className="inspector-panel__media-notes-affordance" aria-hidden><EditIcon /></span>
                </button>
                {mediaNotesExpanded ? (
                  <label className="inspector-panel__summary-field" id={`${tabPrefix}-media-notes-editor`}>
                    <small>{t('inspector.mediaNotesHelper')}</small>
                    <textarea
                      className="inspector-panel__summary-textarea"
                      value={trackMetadata.summary ?? ''}
                      rows={8}
                      onChange={(event) => patchTrackMetadata({ summary: event.target.value })}
                      placeholder={t('inspector.mediaSummaryPlaceholder')}
                    />
                  </label>
                ) : null}
              </section>
            ) : null}
          </div>

          <div
            role="tabpanel"
            id={`${tabPrefix}-navigate-panel`}
            aria-labelledby={`${tabPrefix}-navigate-tab`}
            className={`inspector-panel__navigate${showEditor ? ' inspector-panel__navigate--editing' : ''}${showPreview ? ' inspector-panel__navigate--preview' : ''}`}
            onKeyDownCapture={handleNavigateEscape}
            hidden={activeView !== 'navigate'}
          >
            <div className="inspector-panel__navigate-controls">
            {unsupportedActionCount > 0 ? (
              <div className="inspector-panel__unsupported-notice" role="status">
                {t(unsupportedActionCount === 1 ? 'youtube.unsupportedActionNotice' : 'youtube.unsupportedActionsNotice', { count: unsupportedActionCount })}
              </div>
            ) : null}
            <div className="inspector-navigation-filter-groups">
              <div className="inspector-navigation-status" role="group" aria-label={t('inspector.statusFilters')}>
                {(['all', 'active'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`inspector-navigation-status__button${navigationStatus === status ? ' inspector-navigation-status__button--active' : ''}`}
                    aria-pressed={navigationStatus === status}
                    onClick={() => setNavigationStatus(status)}
                  >
                    {status === 'all' ? t('layers.filterAll') : t('layers.filterActive')}
                  </button>
                ))}
              </div>
              <div className="inspector-navigation-types" role="group" aria-label={t('inspector.typeFilters')}>
              {navigationTypes.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`inspector-navigation-types__button inspector-navigation-types__button--${filter}${navigationType === filter ? ' inspector-navigation-types__button--active' : ''}`}
                  aria-label={typeLabel(filter)}
                  title={typeLabel(filter)}
                  aria-pressed={navigationType === filter}
                  onClick={() => setNavigationType((current) => current === filter ? null : filter)}
                >
                  {typeIcon(filter)}
                </button>
              ))}
                <button
                  type="button"
                  className={`inspector-navigation-types__button inspector-navigation-types__button--search${navigationSearchVisible ? ' inspector-navigation-types__button--active' : ''}`}
                  aria-label={t('inspector.openSearch')}
                  title={t('inspector.openSearch')}
                  aria-pressed={navigationSearchVisible}
                  onClick={() => setNavigationSearchOpen(true)}
                >
                  <span aria-hidden="true">⌕</span>
                </button>
                <button
                  type="button"
                  className="inspector-navigation-types__button inspector-navigation-types__button--export"
                  aria-label={t('bookmarks.exportBookmarks')}
                  title={t('bookmarks.exportBookmarks')}
                  onClick={() => void exportBookmarks()}
                >
                  <span aria-hidden="true">CSV</span>
                </button>
              </div>
            </div>
            </div>
            <div className="inspector-panel__navigate-list" data-inspector-layer-list>
              {navigationSearchVisible ? (
                <div className="inspector-navigation-search-tools">
                <label className="inspector-navigation-search" onKeyDown={(event) => {
                  if (event.key === 'Escape' && navigationQuery.length === 0) {
                    event.stopPropagation()
                    setNavigationSearchOpen(false)
                  }
                }}>
                  <span className="sr-only">{navigationSearchPlaceholder}</span>
                  <input
                    ref={navigationSearchRef}
                    type="search"
                    value={navigationQuery}
                    dir="auto"
                    placeholder={navigationSearchPlaceholder}
                    aria-label={navigationSearchPlaceholder}
                    onChange={(event) => setNavigationQuery(event.target.value)}
                  />
                  <button type="button" className="btn btn-ghost btn-compact" onClick={() => {
                    setNavigationQuery('')
                    setNavigationSearchOpen(false)
                  }}>
                    {navigationQuery ? t('common.clear') : t('common.close')}
                  </button>
                </label>
                </div>
              ) : null}
            <ChapterNavigationList chapters={[]} onSeek={onSeek} />
            {navigationItems.length === 0 ? (
              <div className="bookmark-navigation__empty">
                <h3>{t(emptyState[0])}</h3>
                <p>{t(emptyState[1])}</p>
                {emptyStateAction && emptyStateActionLabel ? (
                  <button type="button" className="btn btn-compact" onClick={runEmptyStateAction}>
                    {emptyStateActionLabel}
                  </button>
                ) : null}
              </div>
            ) : (
              <ul className="bookmark-navigation__list inspector-navigation-list">
                {navigationItems.map((row) => {
                  const selected = includesTimelineSelectionItem(selectedItems, row.item.id, row.type)
                  const activeSelection = selectedItemId === row.item.id && selectedItemType === row.type
                  const enabled = row.item.enabled !== false
                  return (
                    <li
                      ref={activeSelection ? selectedNavigationRowRef : undefined}
                      key={`${row.type}:${row.item.id}`}
                      className={`bookmark-navigation__item inspector-navigation-list__item${selected ? ' inspector-navigation-list__item--selected' : ''}${!enabled ? ' inspector-navigation-list__item--disabled' : ''}`}
                    >
                      <button
                        type="button"
                        className="bookmark-navigation__row inspector-navigation-list__select"
                        aria-current={selected ? 'true' : undefined}
                        aria-pressed={selected}
                        onClick={() => selectNavigationItem(row)}
                      >
                        <span className={`inspector-navigation-list__type inspector-navigation-list__type--${row.type}`} aria-hidden="true">
                          {typeIcon(row.type)}
                        </span>
                        <span className="bookmark-navigation__text">
                          {row.type === 'bookmark' ? (
                            <strong className="bookmark-navigation__bookmark-heading">
                              <span className="bookmark-navigation__timestamp ltr-digits">{formatSeconds(row.item.start)} ·</span>
                              <span className="bookmark-navigation__label" dir="auto">{row.label}</span>
                            </strong>
                          ) : <strong>{row.label}</strong>}
                          {row.type === 'bookmark' ? (
                            <>
                              {row.item.notes?.trim() ? <small className="bookmark-navigation__note" dir="auto">{row.item.notes.trim()}</small> : null}
                            </>
                          ) : (
                            <small>
                              <span className="ltr-digits">{formatSeconds(row.item.start)}–{formatSeconds(row.item.end)}</span>
                              {' · '}{enabled ? t('inspector.enabled') : t('layers.disabled')}
                              {row.active ? ` · ${t('layers.active')}` : ''}
                            </small>
                          )}
                        </span>
                      </button>
                      <div className="bookmark-navigation__actions inspector-navigation-list__actions">
                        {row.type !== 'bookmark' ? (
                          <>
                            <button
                              type="button"
                              className={`inspector-navigation-list__icon-button inspector-navigation-list__icon-button--enabled${enabled ? ' inspector-navigation-list__icon-button--active' : ''}`}
                              aria-label={enabled ? 'Disable layer' : 'Enable layer'}
                              title={enabled ? 'Disable layer' : 'Enable layer'}
                              aria-pressed={enabled}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleItemEnabled(row.item.id, row.type)
                                onAfterTimingMutation?.()
                              }}
                            ><PowerIcon /></button>
                            <button
                              type="button"
                              className={`inspector-navigation-list__icon-button inspector-navigation-list__icon-button--lock${row.item.locked ? ' inspector-navigation-list__icon-button--active' : ''}`}
                              aria-label={row.item.locked ? 'Unlock layer' : 'Lock layer'}
                              title={row.item.locked ? 'Unlock layer' : 'Lock layer'}
                              aria-pressed={row.item.locked === true}
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleItemLocked(row.item.id, row.type)
                              }}
                            >{row.item.locked ? <LockIcon /> : <UnlockIcon />}</button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="inspector-navigation-list__icon-button"
                          aria-label={`${t('bookmarks.edit')} ${row.label}`}
                          title={t('bookmarks.edit')}
                          onClick={(event) => { event.stopPropagation(); editNavigationItem(row) }}
                        ><EditIcon /></button>
                        {row.type === 'bookmark' ? (
                          <button
                            type="button"
                            className="inspector-navigation-list__icon-button"
                            aria-label="Copy bookmark"
                            title="Copy bookmark"
                            onClick={(event) => { event.stopPropagation(); void copyBookmark(row.item) }}
                          ><CopyIcon /></button>
                        ) : null}
                        <button
                          type="button"
                          className="inspector-navigation-list__icon-button inspector-navigation-list__icon-button--delete"
                          aria-label={`Delete ${row.type}`}
                          title={`Delete ${row.type}`}
                          onClick={(event) => { event.stopPropagation(); removeNavigationItem(row) }}
                        ><TrashIcon /></button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            </div>
            {hasSelection ? (
            <div
              className={`inspector-panel__navigate-editor selected-layer-panel-region${showEditor ? ' selected-layer-panel-region--editor' : ' selected-layer-panel-region--preview'}`}
              data-inspector-layer-editor
              data-layer-editor-dirty={showEditor && editorDraftDirty ? 'true' : undefined}
            >
            {selectedBookmark && editingBookmarkId === selectedBookmark.id ? (
              <div className="inspector-panel__bookmark-detail">
                <BookmarkItemEditor
                  labelMode="inspector"
                  onApplyComplete={() => setEditingBookmarkId(null)}
                  onCancelComplete={() => setEditingBookmarkId(null)}
                  onDeleteRequest={removeBookmark}
                  onDirtyChange={setEditorDraftDirty}
                />
              </div>
            ) : null}
            {selectedItemId && selectedItemType && selectedItemType !== 'bookmark' && editingRangeId === selectedItemId ? (
              <div className="inspector-panel__item-editor inspector-panel__range-detail">
                <TrackEditor
                  labelMode="inspector"
                  onAfterTimingMutation={onAfterTimingMutation}
                  onApplyComplete={() => setEditingRangeId(null)}
                  onCancelComplete={() => setEditingRangeId(null)}
                  onDirtyChange={setEditorDraftDirty}
                />
              </div>
            ) : null}
            {showPreview && selectedNavigationItem ? (
              <LayerSelectionPreview
                className="inspector-panel__selected-layer-preview"
                item={{
                  id: selectedNavigationItem.item.id,
                  type: selectedNavigationItem.type,
                  label: selectedNavigationItem.label,
                  start: selectedNavigationItem.item.start,
                  end: selectedNavigationItem.item.end,
                  notes: selectedNavigationItem.item.notes,
                  enabled: selectedNavigationItem.item.enabled,
                  active: selectedNavigationItem.active
                }}
              />
            ) : null}
            </div>
            ) : null}
          </div>

          <div role="tabpanel" id={`${tabPrefix}-details-panel`} aria-labelledby={`${tabPrefix}-details-tab`} className="inspector-details" hidden={activeView !== 'details'}>
            <dl className="inspector-details__summary">
              <div><dt>{t('details.mediaTitle')}</dt><dd>{youtubeMetadata?.title || youtubeMedia?.title || videoMetadata?.name || videoFileName || trackName}</dd></div>
              <div><dt>{t('details.sourceType')}</dt><dd>{sourceLabel}</dd></div>
              <div><dt>{t('inspector.duration')}</dt><dd className="ltr-digits">{formatSeconds(duration)}</dd></div>
              <div><dt>{t('details.saveState')}</dt><dd>{isTrackDirty ? t('details.unsaved') : t('details.saved')}</dd></div>
              <div><dt>{t('details.playbackStatus')}</dt><dd>{youtubeMedia ? (youtubePlaybackAvailable ? t('details.available') : t('details.unavailable')) : (mediaSource ? t('details.available') : t('details.unavailable'))}</dd></div>
            </dl>
            {!youtubeMedia ? <p className="inspector-details__privacy">Local media — processed on this device.</p> : null}
            {youtubeMedia ? (
              <>
                <div className="inspector-details__primary-actions">
                  <button type="button" className="btn btn-secondary btn-compact" onClick={() => void window.veil?.openExternalUrl?.(youtubeMedia.canonicalUrl)}>
                    {t('youtube.openOnYouTube')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-compact" onClick={() => void copyLink()}>Copy Link</button>
                </div>
                <p className="inspector-details__privacy">YouTube — streamed through YouTube’s official player.</p>
                {youtubeMetadata?.status === 'loading' ? <div className="inspector-details__loading" role="status"><span /> Loading video details…</div> : null}
                <details className="inspector-details__disclosure">
                  <summary>Description</summary>
                  {youtubeMetadata?.description ? <div className="youtube-description">
                    <YouTubeDescription text={youtubeMetadata.description} expanded={descriptionExpanded} onActivateLink={activateDescriptionLink} />
                    <button type="button" className="btn btn-ghost btn-compact" onClick={() => setDescriptionExpanded((value) => !value)}>{descriptionExpanded ? 'Show Less' : 'Show More'}</button>
                  </div> : youtubeMetadata?.status !== 'loading' ? <p>Additional YouTube details are unavailable.</p> : null}
                </details>
              </>
            ) : null}
            <details className="inspector-details__disclosure">
              <summary>{t('inspector.sourceInformation')}</summary>
              <dl>
                {youtubeMedia ? <>
                  <div><dt>{t('youtube.fieldProvider')}</dt><dd>YouTube</dd></div>
                  {youtubeMetadata?.channelTitle ? <div><dt>Channel</dt><dd>{youtubeMetadata.channelTitle}</dd></div> : null}
                  {youtubeMetadata?.publishedAt ? <div><dt>Published</dt><dd>{new Date(youtubeMetadata.publishedAt).toLocaleDateString()}</dd></div> : null}
                  <div><dt>{t('youtube.fieldUrl')}</dt><dd className="ltr-digits">{youtubeMedia.canonicalUrl}</dd></div>
                </> : <>
                  <div><dt>{t('details.fileName')}</dt><dd>{videoFileName || videoMetadata?.name || '—'}</dd></div>
                  {videoFilePath ? <div><dt>{t('details.localPath')}</dt><dd>{videoFilePath}</dd></div> : null}
                </>}
              </dl>
              {youtubeMedia && youtubeMetadata?.source === 'youtube-data-api' ? <p className="inspector-details__privacy">Video details retrieved from YouTube.</p> : null}
            </details>
            <details className="inspector-details__disclosure">
              <summary>{t('inspector.advanced')}</summary>
              <dl>
                {youtubeMedia ? <div><dt>{t('youtube.fieldVideoId')}</dt><dd className="ltr-digits">{youtubeMedia.videoId}</dd></div> : null}
                {youtubeMedia ? <div><dt>Metadata source</dt><dd>{youtubeMetadata?.source ?? 'saved-veil'}</dd></div> : null}
                {youtubeMedia && typeof youtubeMedia.duration === 'number' ? <div><dt>Saved duration</dt><dd className="ltr-digits">{formatSeconds(youtubeMedia.duration)}</dd></div> : null}
                {trackFilePath ? <div><dt>{t('details.activeVeilPath')}</dt><dd>{trackFilePath}</dd></div> : null}
              </dl>
            </details>
            <div className="inspector-details__actions">
              <button type="button" className="btn btn-compact" onClick={() => runAppMenuAction('saveTrack')}>{t('inspector.saveTrack')}</button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={() => runAppMenuAction('loadTrack')}>{t('inspector.replaceTrack')}</button>
              {(masks.length + mutes.length + skips.length + bookmarks.length) > 0 ? (
                <button type="button" className="btn btn-ghost btn-compact inspector-panel__clear-track" onClick={() => runClearTrackAction({ runIfAllowed, onAfter: onAfterTimingMutation })}>{t('inspector.clearTrack')}</button>
              ) : null}
              {hasRangeAuthoring ? <button type="button" className="btn btn-ghost btn-compact" onClick={() => onOpenLayerManager('all')}>{t('trackTools.layers')}</button> : null}
            </div>
          </div>
      </div>
    </aside>
  )
}
