import { useEffect, useRef } from 'react'
import CollapsiblePanel, { type CollapsiblePanelHandle } from './CollapsiblePanel'
import LayerList from './LayerList'
import TrackActionControls from './TrackActionControls'
import TrackEditor from './TrackEditor'
import BookmarkItemEditor from './BookmarkItemEditor'
import TrackFileControls from './TrackFileControls'
import TrackMetadataPanel from './TrackMetadataPanel'
import TrackOffsetControls from './TrackOffsetControls'
import BookmarkControls from './BookmarkControls'
import { useLanguage } from '../hooks/useLanguage'
import { runAppMenuAction } from '../lib/appMenuBridge'
import { t } from '../i18n'
import {
  flushPendingSidebarPanel,
  registerSidebarPanel
} from '../lib/sidebarPanelBridge'
import { requestOpenSubtitleSheet } from '../lib/subtitleSheetBridge'
import type { TrackGroupSession } from '../hooks/useTrackGroupSession'
import { useVeilStore } from '../state/useVeilStore'

interface TrackSidebarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  activeMaskIds: ReadonlySet<string>
  activeMuteIds: ReadonlySet<string>
  activeSkipIds: ReadonlySet<string>
  getCurrentTime: () => number
  hasVideo: boolean
  groupSession: TrackGroupSession
  onReconcile?: () => void
  onAfterTimingMutation?: () => void
  onAfterSeek?: () => void
  onSeekToTime?: (time: number) => void
  onCollapseSidebar?: () => void
  hideSubtitlesPanel?: boolean
}

export default function TrackSidebar({
  videoRef,
  activeMaskIds,
  activeMuteIds,
  activeSkipIds,
  getCurrentTime,
  hasVideo,
  groupSession,
  onReconcile,
  onAfterTimingMutation,
  onAfterSeek,
  onSeekToTime,
  onCollapseSidebar,
  hideSubtitlesPanel = false
}: TrackSidebarProps) {
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)

  const {
    hiddenGroupIds,
    soloGroupId,
    collapsedGroupIds,
    onToggleGroupCollapsed,
    onCollapseAllGroups,
    onExpandAllGroups,
  } = groupSession
  const createPanelRef = useRef<CollapsiblePanelHandle>(null)
  const selectedPanelRef = useRef<CollapsiblePanelHandle>(null)
  const subtitlesPanelRef = useRef<CollapsiblePanelHandle>(null)
  const layersPanelRef = useRef<CollapsiblePanelHandle>(null)
  const organizationPanelRef = useRef<CollapsiblePanelHandle>(null)
  const trackInfoPanelRef = useRef<CollapsiblePanelHandle>(null)
  const offsetPanelRef = useRef<CollapsiblePanelHandle>(null)
  const trackPanelRef = useRef<CollapsiblePanelHandle>(null)
  const hasSelection = selectedItemId !== null

  useEffect(() => {
    if (hasSelection) {
      selectedPanelRef.current?.expand()
    }
  }, [hasSelection, selectedItemId])

  useEffect(() => {
    const openOrganizationChild = (child: CollapsiblePanelHandle | null): void => {
      organizationPanelRef.current?.expand()
      child?.expand()
    }

    const unsubs = [
      registerSidebarPanel('track', () => trackPanelRef.current?.expand()),
      registerSidebarPanel('create', () => createPanelRef.current?.expand()),
      registerSidebarPanel('selected', () => selectedPanelRef.current?.expand()),
      ...(hideSubtitlesPanel
        ? []
        : [registerSidebarPanel('subtitles', () => subtitlesPanelRef.current?.expand())]),
      registerSidebarPanel('layers', () => layersPanelRef.current?.expand()),
      registerSidebarPanel('organization', () => organizationPanelRef.current?.expand()),
      registerSidebarPanel('track-info', () => openOrganizationChild(trackInfoPanelRef.current)),
      registerSidebarPanel('offset-shift', () => openOrganizationChild(offsetPanelRef.current))
    ]

    flushPendingSidebarPanel()

    return () => {
      for (const unsub of unsubs) {
        unsub()
      }
    }
  }, [hideSubtitlesPanel])

  const afterTiming = (): void => {
    onAfterTimingMutation?.()
  }

  useLanguage()

  return (
    <aside className="track-sidebar">
      {onCollapseSidebar ? (
        <div className="track-sidebar__chrome">
          <button
            type="button"
            className="track-sidebar__collapse btn btn-ghost btn-compact"
            title={t('sidebar.hide')}
            aria-label={t('sidebar.hide')}
            onClick={onCollapseSidebar}
          >
            ▶
          </button>
        </div>
      ) : null}
      <CollapsiblePanel
        ref={trackPanelRef}
        title={t('sidebar.track')}
        panelId="sidebar-track"
        defaultExpanded
      >
        <TrackFileControls
          onAfterTrackMutation={onReconcile}
          showClearTrack
          showDirtyStatus
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        ref={createPanelRef}
        title={t('sidebar.create')}
        panelId="sidebar-create"
        defaultExpanded
      >
        <TrackActionControls
          getCurrentTime={getCurrentTime}
          hasVideo={hasVideo}
          onAfterChange={onReconcile}
          compact
        />
      </CollapsiblePanel>

      <CollapsiblePanel
        ref={selectedPanelRef}
        title={t('sidebar.selected')}
        panelId="sidebar-selected"
        defaultExpanded={hasSelection}
      >
        {selectedItemType === 'bookmark' ? (
          <BookmarkItemEditor onApplyComplete={() => undefined} />
        ) : (
          <TrackEditor onAfterTimingMutation={afterTiming} />
        )}
      </CollapsiblePanel>

      {!hideSubtitlesPanel ? (
        <CollapsiblePanel
          ref={subtitlesPanelRef}
          title={t('sidebar.subtitles')}
          panelId="sidebar-subtitles"
          defaultExpanded={false}
        >
          <div className="track-sidebar__subtitle-entry">
            <p className="srt-import-controls__hint">{t('subtitles.openSheetHint')}</p>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              onClick={() => requestOpenSubtitleSheet()}
            >
              {t('subtitles.openSheet')}
            </button>
          </div>
        </CollapsiblePanel>
      ) : null}

      <CollapsiblePanel
        ref={organizationPanelRef}
        title={t('sidebar.organization')}
        panelId="sidebar-organization"
        defaultExpanded={false}
      >
        <div className="track-sidebar__stack track-sidebar__stack--nested">
          <CollapsiblePanel
            ref={trackInfoPanelRef}
            title={t('sidebar.trackInfo')}
            panelId="track-info"
            defaultExpanded={false}
            nested
          >
            <TrackMetadataPanel />
          </CollapsiblePanel>
          <CollapsiblePanel
            title={t('sidebar.bookmarks')}
            panelId="session-bookmarks"
            defaultExpanded={false}
            nested
          >
            <BookmarkControls
              getCurrentTime={getCurrentTime}
              onJump={(time) => {
                onSeekToTime?.(time)
                onAfterSeek?.()
              }}
            />
          </CollapsiblePanel>
          <CollapsiblePanel
            ref={offsetPanelRef}
            title={t('sidebar.offsetShift')}
            panelId="offset-shift"
            defaultExpanded={false}
            nested
          >
            <TrackOffsetControls onAfterTimingMutation={afterTiming} />
          </CollapsiblePanel>
          <CollapsiblePanel
            title={t('sidebar.motion')}
            panelId="motion-settings"
            defaultExpanded={false}
            nested
          >
            <p className="srt-import-controls__hint">{t('sidebar.motionHint')}</p>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              onClick={() => runAppMenuAction('openSettings')}
            >
              {t('sidebar.openSettings')}
            </button>
          </CollapsiblePanel>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        ref={layersPanelRef}
        title={t('sidebar.layers')}
        panelId="sidebar-layers"
        defaultExpanded
      >
        <LayerList
          videoRef={videoRef}
          activeMaskIds={activeMaskIds}
          activeMuteIds={activeMuteIds}
          activeSkipIds={activeSkipIds}
          hiddenGroupIds={hiddenGroupIds}
          soloGroupId={soloGroupId}
          collapsedGroupIds={collapsedGroupIds}
          onToggleGroupCollapsed={onToggleGroupCollapsed}
          onCollapseAllGroups={onCollapseAllGroups}
          onExpandAllGroups={onExpandAllGroups}
          onAfterTimingMutation={afterTiming}
          onAfterChange={onReconcile}
          embedded
        />
      </CollapsiblePanel>
    </aside>
  )
}
