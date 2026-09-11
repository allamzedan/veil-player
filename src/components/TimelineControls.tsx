import type { ReactNode } from 'react'
import { usePlaybackActivityPreferences } from '../hooks/usePlaybackActivityPreferences'
import { moveIntervalToStart } from '../lib/timelineMath'
import type { SelectableItemType } from '../lib/trackItems'
import { useLanguage } from '../hooks/useLanguage'
import { setCurrentTimeDebug } from '../lib/debugState'
import { t } from '../i18n'
import { canCreateRangeActions } from '../lib/authoringCapabilities'
import type { PlaybackCapabilities } from '../lib/playbackCapabilities'
import { readUiRefreshV1 } from '../lib/uiRefreshV1'
import {
  preserveInspectorTabForSelection,
  type InspectorSelectionNavigationIntent
} from '../lib/inspectorSelectionNavigation'
import { useVeilStore } from '../state/useVeilStore'
import { BookmarkIcon, CenterOnPlayheadIcon, JumpToStartIcon, MaskIcon, MoveToPlayheadIcon, MuteIcon, SetEndIcon, SetStartIcon, SkipIcon, SnapToSubtitlesIcon, ZoomInIcon, ZoomOutIcon, ZoomToSelectionIcon } from './icons'

interface TimelineControlsProps {
  capabilities: PlaybackCapabilities
  duration: number
  getCurrentTime: () => number
  videoRef: React.RefObject<HTMLVideoElement | null>
  snapToSubtitles: boolean
  hasSubtitleCues: boolean
  onToggleSnapToSubtitles: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFineIn: () => void
  onZoomFineOut: () => void
  onFit: () => void
  onZoomToSelection: () => void
  onCenterOnPlayhead: () => void
  onSeekToTime?: (time: number) => void
  onAfterTimingMutation?: () => void
  onAddBookmark?: (intent?: InspectorSelectionNavigationIntent) => void
}

interface ToolbarButtonProps {
  label: string
  title: string
  ariaLabel?: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  icon?: ReactNode
  shortcut?: string
  tone?: 'mask' | 'mute' | 'skip' | 'bookmark'
  iconOnly?: boolean
}

function ToolbarButton({
  label,
  title,
  ariaLabel,
  onClick,
  disabled = false,
  pressed,
  icon,
  shortcut,
  tone,
  iconOnly = false
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`timeline-controls__button btn btn-compact btn-ghost${iconOnly ? ' timeline-controls__button--icon' : ''}${pressed ? ' timeline-controls__button--pressed' : ''}${tone ? ` timeline-controls__action timeline-controls__action--${tone}` : ''}`}
      title={title}
      aria-label={ariaLabel ?? title}
      {...(pressed !== undefined ? { 'aria-pressed': pressed } : {})}
      disabled={disabled}
      onClick={onClick}
    >
      {icon ? <span className="timeline-controls__action-icon" aria-hidden>{icon}</span> : null}
      {!iconOnly && (icon || shortcut) ? <span>{label}</span> : !iconOnly ? label : null}
      {shortcut ? <kbd className="timeline-controls__shortcut" aria-hidden>{shortcut}</kbd> : null}
    </button>
  )
}

function ToolbarSeparator() {
  return <span className="timeline-controls__sep" aria-hidden />
}

export default function TimelineControls({
  capabilities,
  duration,
  getCurrentTime,
  videoRef,
  snapToSubtitles,
  hasSubtitleCues,
  onToggleSnapToSubtitles,
  onZoomIn,
  onZoomOut,
  onZoomFineIn,
  onZoomFineOut,
  onFit,
  onZoomToSelection,
  onCenterOnPlayhead,
  onSeekToTime,
  onAfterTimingMutation,
  onAddBookmark
}: TimelineControlsProps) {
  useLanguage()
  const playbackActivityPreferences = usePlaybackActivityPreferences()
  const refreshedTimeline = readUiRefreshV1()
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const setMaskStart = useVeilStore((state) => state.setMaskStart)
  const setMaskEnd = useVeilStore((state) => state.setMaskEnd)
  const setMuteStart = useVeilStore((state) => state.setMuteStart)
  const setMuteEnd = useVeilStore((state) => state.setMuteEnd)
  const setSkipStart = useVeilStore((state) => state.setSkipStart)
  const setSkipEnd = useVeilStore((state) => state.setSkipEnd)
  const patchTrackItemTiming = useVeilStore((state) => state.patchTrackItemTiming)
  const addMask = useVeilStore((state) => state.addMask)
  const addMute = useVeilStore((state) => state.addMute)
  const addSkip = useVeilStore((state) => state.addSkip)
  const hasRangeAuthoring = canCreateRangeActions(capabilities)

  const selectedItem =
    selectedItemId && selectedItemType
      ? selectedItemType === 'mask'
        ? masks.find((m) => m.id === selectedItemId)
        : selectedItemType === 'mute'
          ? mutes.find((m) => m.id === selectedItemId)
          : selectedItemType === 'skip'
            ? skips.find((m) => m.id === selectedItemId)
            : bookmarks.find((m) => m.id === selectedItemId)
      : null

  const hasSelection = Boolean(selectedItem && selectedItemType && selectedItemType !== 'bookmark')
  const hasZoomableSelection = Boolean(selectedItem && selectedItemType && Number.isFinite(duration) && duration > 0)

  const zoomToSelectionButton = (
    <button
      type="button"
      className="timeline-controls__button timeline-controls__button--icon btn btn-compact btn-ghost"
      title={t('timeline.zoomSelection')}
      aria-label={t('timeline.zoomSelection')}
      onClick={onZoomToSelection}
      disabled={!hasZoomableSelection}
    >
      <ZoomToSelectionIcon className="timeline-controls__zoom-icon" />
    </button>
  )

  const applyStart = (): void => {
    if (!selectedItem || !selectedItemType) {
      return
    }
    const time = getCurrentTime()
    if (selectedItemType === 'mask') {
      setMaskStart(selectedItem.id, time)
    } else if (selectedItemType === 'mute') {
      setMuteStart(selectedItem.id, time)
    } else {
      setSkipStart(selectedItem.id, time)
    }
    onAfterTimingMutation?.()
  }

  const applyEnd = (): void => {
    if (!selectedItem || !selectedItemType) {
      return
    }
    const time = getCurrentTime()
    if (selectedItemType === 'mask') {
      setMaskEnd(selectedItem.id, time)
    } else if (selectedItemType === 'mute') {
      setMuteEnd(selectedItem.id, time)
    } else {
      setSkipEnd(selectedItem.id, time)
    }
    onAfterTimingMutation?.()
  }

  const moveToNow = (): void => {
    if (!selectedItem || !selectedItemType) {
      return
    }
    const next = moveIntervalToStart(
      selectedItem.start,
      selectedItem.end,
      getCurrentTime(),
      duration
    )
    patchTrackItemTiming(selectedItem.id, selectedItemType as SelectableItemType, next.start, next.end)
    onAfterTimingMutation?.()
  }

  const jumpToStart = (): void => {
    if (!selectedItem) {
      return
    }
    if (onSeekToTime) {
      onSeekToTime(selectedItem.start)
      onAfterTimingMutation?.()
      return
    }
    const video = videoRef.current
    if (!video) {
      return
    }
    setCurrentTimeDebug(video, 'other', selectedItem.start)
    onAfterTimingMutation?.()
  }

  const handleZoomOut = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (event.shiftKey) {
      onZoomOut()
    } else {
      onZoomFineOut()
    }
  }

  const handleZoomIn = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (event.shiftKey) {
      onZoomIn()
    } else {
      onZoomFineIn()
    }
  }

  const canCreateItems = duration > 0

  const addAtPlayhead = (
    action: (start: number, end: number) => void,
    defaultDurationSeconds: number,
    preserveInspectorTabForType?: Exclude<SelectableItemType, 'bookmark'>
  ): void => {
    const start = getCurrentTime()
    action(start, start + defaultDurationSeconds)
    if (preserveInspectorTabForType) {
      const state = useVeilStore.getState()
      if (state.selectedItemId && state.selectedItemType === preserveInspectorTabForType) {
        preserveInspectorTabForSelection(state.selectedItemId, preserveInspectorTabForType)
      }
    }
    onAfterTimingMutation?.()
  }

  if (refreshedTimeline) {
    return (
      <div className="timeline-controls timeline-controls--concept-a" aria-label={t('timeline.title')}>
        <div className="timeline-controls__concept-group timeline-controls__concept-group--zoom" data-timeline-group="zoom">
          <span className="timeline-controls__concept-label">{t('timeline.groupZoom')}</span>
          <div className="timeline-controls__concept-actions">
            <button
              type="button"
              className="timeline-controls__button timeline-controls__button--icon btn btn-compact btn-ghost"
              title={t('timeline.zoomOut')}
              aria-label={t('timeline.zoomOut')}
              onClick={handleZoomOut}
            >
              <ZoomOutIcon className="timeline-controls__zoom-icon" />
            </button>
            <button
              type="button"
              className="timeline-controls__button timeline-controls__button--icon btn btn-compact btn-ghost"
              title={t('timeline.zoomIn')}
              aria-label={t('timeline.zoomIn')}
              onClick={handleZoomIn}
            >
              <ZoomInIcon className="timeline-controls__zoom-icon" />
            </button>
            <ToolbarButton label={t('timeline.fit')} title={t('timeline.fitToDuration')} onClick={onFit} />
          </div>
        </div>

        <div className="timeline-controls__concept-group timeline-controls__concept-group--navigate" data-timeline-group="navigate-edit">
          <span className="timeline-controls__concept-label">{t('timeline.groupNavigateEdit')}</span>
          <div className="timeline-controls__concept-actions">
            {hasRangeAuthoring || capabilities.canCreateBookmark ? (
              zoomToSelectionButton
            ) : null}
            <ToolbarButton
              label={t('timeline.center')}
              title={t('timeline.centerPlayhead')}
              ariaLabel={t('timeline.centerPlayhead')}
              onClick={onCenterOnPlayhead}
              icon={<CenterOnPlayheadIcon />}
              iconOnly
            />
            {capabilities.canImportCustomSubtitles && capabilities.sourceDisclosure !== 'youtube' ? (
              <ToolbarButton
                label={t('timeline.snap')}
                title={t('timeline.snapToSubtitles')}
                ariaLabel={t('timeline.snapToSubtitles')}
                onClick={onToggleSnapToSubtitles}
                disabled={!hasSubtitleCues}
                pressed={snapToSubtitles}
                icon={<SnapToSubtitlesIcon />}
                iconOnly
              />
            ) : null}
            {hasRangeAuthoring ? (
              <>
                <ToolbarButton label={t('timeline.start')} title={t('timeline.setStartAtPlayhead')} onClick={applyStart} disabled={!hasSelection} icon={<SetStartIcon />} iconOnly />
                <ToolbarButton label={t('timeline.end')} title={t('timeline.setEndAtPlayhead')} onClick={applyEnd} disabled={!hasSelection} icon={<SetEndIcon />} iconOnly />
                <ToolbarButton label={t('timeline.move')} title={t('timeline.moveToPlayhead')} onClick={moveToNow} disabled={!hasSelection} icon={<MoveToPlayheadIcon />} iconOnly />
                <ToolbarButton label={t('timeline.jump')} title={t('timeline.jumpToStart')} onClick={jumpToStart} disabled={!hasSelection} icon={<JumpToStartIcon />} iconOnly />
              </>
            ) : null}
          </div>
        </div>

        {hasRangeAuthoring || (capabilities.canCreateBookmark && onAddBookmark) ? (
          <div className="timeline-controls__concept-group timeline-controls__concept-group--layers" data-timeline-group="layers">
            <span className="timeline-controls__concept-label">{t('timeline.groupLayers')}</span>
            <div className="timeline-controls__concept-actions">
              {capabilities.canCreateMask ? <ToolbarButton label={t('timeline.mask')} title={t('timeline.addMaskAtTime')} onClick={() => addAtPlayhead(addMask, playbackActivityPreferences.defaultMaskDurationSeconds, 'mask')} disabled={!canCreateItems} icon={<MaskIcon />} tone="mask" /> : null}
              {capabilities.canCreateMuteRange ? <ToolbarButton label={t('timeline.mute')} title={t('timeline.addMuteAtTime')} onClick={() => addAtPlayhead(addMute, playbackActivityPreferences.defaultMuteDurationSeconds, 'mute')} disabled={!canCreateItems} icon={<MuteIcon />} tone="mute" /> : null}
              {capabilities.canCreateSkipRange ? <ToolbarButton label={t('timeline.skip')} title={t('timeline.addSkipAtTime')} onClick={() => addAtPlayhead(addSkip, playbackActivityPreferences.defaultSkipDurationSeconds, 'skip')} disabled={!canCreateItems} icon={<SkipIcon />} tone="skip" /> : null}
              {capabilities.canCreateBookmark && onAddBookmark ? (
                <ToolbarButton
                  label={t('inspector.bookmark')}
                  title={`${t('bookmarks.add')} (B)`}
                  ariaLabel={t('bookmarks.add')}
                  onClick={() => onAddBookmark({ preserveInspectorTab: true })}
                  disabled={!canCreateItems}
                  icon={<BookmarkIcon />}
                  tone="bookmark"
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="timeline-controls" aria-label={t('timeline.title')}>
      <div className="timeline-controls__group">
        <button
          type="button"
          className="timeline-controls__button timeline-controls__button--icon btn btn-compact btn-ghost"
          title={t('timeline.zoomOut')}
          aria-label={t('timeline.zoomOut')}
          onClick={handleZoomOut}
        >
          <ZoomOutIcon className={refreshedTimeline ? 'timeline-controls__zoom-icon' : undefined} />
        </button>
        <button
          type="button"
          className="timeline-controls__button timeline-controls__button--icon btn btn-compact btn-ghost"
          title={t('timeline.zoomIn')}
          aria-label={t('timeline.zoomIn')}
          onClick={handleZoomIn}
        >
          <ZoomInIcon className={refreshedTimeline ? 'timeline-controls__zoom-icon' : undefined} />
        </button>
        <ToolbarButton label={t('timeline.fit')} title={t('timeline.fitToDuration')} onClick={onFit} />
        {hasRangeAuthoring || capabilities.canCreateBookmark ? (
          zoomToSelectionButton
        ) : null}
        <ToolbarButton
          label={t('timeline.center')}
          title={t('timeline.centerPlayhead')}
          ariaLabel={t('timeline.centerPlayhead')}
          onClick={onCenterOnPlayhead}
          icon={<CenterOnPlayheadIcon />}
          iconOnly
        />
      </div>

      {capabilities.canImportCustomSubtitles && capabilities.sourceDisclosure !== 'youtube' ? (
        <>
          <ToolbarSeparator />
          <div className="timeline-controls__group">
            <ToolbarButton
              label={t('timeline.snap')}
              title={t('timeline.snapToSubtitles')}
              ariaLabel={t('timeline.snapToSubtitles')}
              onClick={onToggleSnapToSubtitles}
              disabled={!hasSubtitleCues}
              pressed={snapToSubtitles}
              icon={<SnapToSubtitlesIcon />}
              iconOnly
            />
          </div>
        </>
      ) : null}

      {hasRangeAuthoring ? (
        <>
          <ToolbarSeparator />
          <div className="timeline-controls__group">
            <ToolbarButton label={t('timeline.start')} title={t('timeline.setStartAtPlayhead')} onClick={applyStart} disabled={!hasSelection} icon={<SetStartIcon />} iconOnly />
            <ToolbarButton label={t('timeline.end')} title={t('timeline.setEndAtPlayhead')} onClick={applyEnd} disabled={!hasSelection} icon={<SetEndIcon />} iconOnly />
            <ToolbarButton label={t('timeline.move')} title={t('timeline.moveToPlayhead')} onClick={moveToNow} disabled={!hasSelection} icon={<MoveToPlayheadIcon />} iconOnly />
            <ToolbarButton label={t('timeline.jump')} title={t('timeline.jumpToStart')} onClick={jumpToStart} disabled={!hasSelection} icon={<JumpToStartIcon />} iconOnly />
          </div>
        </>
      ) : null}

      {hasRangeAuthoring || (capabilities.canCreateBookmark && onAddBookmark) ? (
        <>
          <ToolbarSeparator />
          <div className="timeline-controls__group">
            {capabilities.canCreateMask ? <ToolbarButton label={t('timeline.mask')} title={t('timeline.addMaskAtTime')} onClick={() => addAtPlayhead(addMask, playbackActivityPreferences.defaultMaskDurationSeconds)} disabled={!canCreateItems} icon={refreshedTimeline ? <MaskIcon /> : undefined} tone={refreshedTimeline ? 'mask' : undefined} /> : null}
            {capabilities.canCreateMuteRange ? <ToolbarButton label={t('timeline.mute')} title={t('timeline.addMuteAtTime')} onClick={() => addAtPlayhead(addMute, playbackActivityPreferences.defaultMuteDurationSeconds)} disabled={!canCreateItems} icon={refreshedTimeline ? <MuteIcon /> : undefined} tone={refreshedTimeline ? 'mute' : undefined} /> : null}
            {capabilities.canCreateSkipRange ? <ToolbarButton label={t('timeline.skip')} title={t('timeline.addSkipAtTime')} onClick={() => addAtPlayhead(addSkip, playbackActivityPreferences.defaultSkipDurationSeconds)} disabled={!canCreateItems} icon={refreshedTimeline ? <SkipIcon /> : undefined} tone={refreshedTimeline ? 'skip' : undefined} /> : null}
            {capabilities.canCreateBookmark && onAddBookmark && (!hasRangeAuthoring || refreshedTimeline) ? (
              <ToolbarButton
                label={t('inspector.bookmark')}
                title={`${t('bookmarks.add')} (B)`}
                ariaLabel={t('bookmarks.add')}
                onClick={onAddBookmark}
                disabled={!canCreateItems}
                icon={refreshedTimeline ? <BookmarkIcon /> : undefined}
                shortcut={refreshedTimeline ? 'B' : undefined}
                tone={refreshedTimeline ? 'bookmark' : undefined}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
