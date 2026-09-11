import BookmarkControls from './BookmarkControls'
import LayerManagerDrawer from './LayerManagerDrawer'
import TrackAnchorsPanel from './TrackAnchorsPanel'
import TrackGroupsPanel from './TrackGroupsPanel'
import TrackMetadataPanel from './TrackMetadataPanel'
import TrackOffsetControls from './TrackOffsetControls'
import TrackToolDialog from './TrackToolDialog'
import type { TrackGroupSession } from '../hooks/useTrackGroupSession'
import { useLanguage } from '../hooks/useLanguage'
import type { ActiveTrackTool } from '../lib/trackTools'
import type { FilterMode } from '../lib/trackItems'
import { t } from '../i18n'
import type { PlaybackCapabilities } from '../lib/playbackCapabilities'
import { canCreateRangeActions } from '../lib/authoringCapabilities'

interface TrackToolDialogsProps {
  capabilities: PlaybackCapabilities
  activeTool: ActiveTrackTool | null
  onClose: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  activeMaskIds: ReadonlySet<string>
  activeMuteIds: ReadonlySet<string>
  activeSkipIds: ReadonlySet<string>
  getCurrentTime: () => number
  hasVideo: boolean
  groupSession: TrackGroupSession
  onReconcile: () => void
  onAfterTimingMutation: () => void
  onAfterSeek: () => void
  onSeekToTime?: (time: number) => void
  layerManagerFilter?: FilterMode
}

export default function TrackToolDialogs({
  capabilities,
  activeTool,
  onClose,
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
  layerManagerFilter = 'all'
}: TrackToolDialogsProps) {
  useLanguage()
  const hasRangeAuthoring = canCreateRangeActions(capabilities)

  return (
    <>
      <LayerManagerDrawer
        open={hasRangeAuthoring && activeTool === 'layers'}
        onClose={onClose}
        videoRef={videoRef}
        activeMaskIds={activeMaskIds}
        activeMuteIds={activeMuteIds}
        activeSkipIds={activeSkipIds}
        groupSession={groupSession}
        onReconcile={onReconcile}
        onAfterTimingMutation={onAfterTimingMutation}
        initialFilterMode={layerManagerFilter}
      />

      <TrackToolDialog
        title={t('trackTools.groups')}
        open={hasRangeAuthoring && activeTool === 'groups'}
        onClose={onClose}
        size="md"
      >
        <TrackGroupsPanel
          hiddenGroupIds={groupSession.hiddenGroupIds}
          soloGroupId={groupSession.soloGroupId}
          totalItemCount={groupSession.totalItems}
          onToggleHidden={groupSession.onToggleHidden}
          onSetSoloGroup={groupSession.onSetSoloGroup}
          onCollapseAll={groupSession.onCollapseAllGroups}
          onExpandAll={groupSession.onExpandAllGroups}
          onClearSolo={groupSession.onClearSolo}
        />
      </TrackToolDialog>

      <TrackToolDialog
        title={t('trackTools.anchors')}
        open={hasRangeAuthoring && activeTool === 'anchors'}
        onClose={onClose}
        size="md"
      >
        <TrackAnchorsPanel getCurrentTime={getCurrentTime} hasVideo={hasVideo} />
      </TrackToolDialog>

      <TrackToolDialog
        title={t('trackTools.bookmarks')}
        open={activeTool === 'bookmarks'}
        onClose={onClose}
        size="sm"
      >
        <BookmarkControls
          getCurrentTime={getCurrentTime}
          onJump={(time) => {
            onSeekToTime?.(time)
            onAfterSeek()
          }}
        />
      </TrackToolDialog>

      <TrackToolDialog
        title={t('trackTools.offsetShift')}
        open={hasRangeAuthoring && activeTool === 'offset'}
        onClose={onClose}
        size="md"
      >
        <TrackOffsetControls onAfterTimingMutation={onAfterTimingMutation} />
      </TrackToolDialog>

      <TrackToolDialog
        title={t('trackTools.trackInfo')}
        open={activeTool === 'track-info'}
        onClose={onClose}
        size="md"
      >
        <TrackMetadataPanel />
      </TrackToolDialog>
    </>
  )
}
