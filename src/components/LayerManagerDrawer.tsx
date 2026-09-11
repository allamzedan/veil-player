import LayerList from './LayerList'
import TrackToolDialog from './TrackToolDialog'
import type { TrackGroupSession } from '../hooks/useTrackGroupSession'
import { useLanguage } from '../hooks/useLanguage'
import type { FilterMode } from '../lib/trackItems'
import { t } from '../i18n'

interface LayerManagerDrawerProps {
  open: boolean
  onClose: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  activeMaskIds: ReadonlySet<string>
  activeMuteIds: ReadonlySet<string>
  activeSkipIds: ReadonlySet<string>
  groupSession: TrackGroupSession
  onReconcile: () => void
  onAfterTimingMutation: () => void
  closeOnSelect?: boolean
  initialFilterMode?: FilterMode
}

export default function LayerManagerDrawer({
  open,
  onClose,
  videoRef,
  activeMaskIds,
  activeMuteIds,
  activeSkipIds,
  groupSession,
  onReconcile,
  onAfterTimingMutation,
  closeOnSelect = true,
  initialFilterMode = 'all'
}: LayerManagerDrawerProps) {
  useLanguage()

  return (
    <TrackToolDialog title={t('trackTools.layers')} open={open} onClose={onClose} size="lg">
      <div className="layer-manager-drawer">
        <LayerList
          embedded
          includeBookmarks
          videoRef={videoRef}
          activeMaskIds={activeMaskIds}
          activeMuteIds={activeMuteIds}
          activeSkipIds={activeSkipIds}
          hiddenGroupIds={groupSession.hiddenGroupIds}
          soloGroupId={groupSession.soloGroupId}
          collapsedGroupIds={groupSession.collapsedGroupIds}
          onToggleGroupCollapsed={groupSession.onToggleGroupCollapsed}
          onCollapseAllGroups={groupSession.onCollapseAllGroups}
          onExpandAllGroups={groupSession.onExpandAllGroups}
          onAfterChange={onReconcile}
          onAfterTimingMutation={onAfterTimingMutation}
          onItemSelected={closeOnSelect ? onClose : undefined}
          initialFilterMode={initialFilterMode}
        />
      </div>
    </TrackToolDialog>
  )
}
