import type { PlaybackCapabilities } from './playbackCapabilities'
import type { SelectableItemType } from './trackItems'
import type {
  MaskTrackItem,
  MuteTrackItem,
  SkipTrackItem,
  TrackItem
} from '../types/track'

export function canCreateRangeActions(capabilities: PlaybackCapabilities): boolean {
  return (
    capabilities.canCreateMask ||
    capabilities.canCreateMuteRange ||
    capabilities.canCreateSkipRange
  )
}

export type AuthoringCommand = 'mask' | 'mute-range' | 'skip-range' | 'bookmark'

export function canInvokeAuthoringCommand(
  capabilities: PlaybackCapabilities,
  command: AuthoringCommand
): boolean {
  if (command === 'mask') {
    return capabilities.canCreateMask
  }
  if (command === 'mute-range') {
    return capabilities.canCreateMuteRange
  }
  if (command === 'skip-range') {
    return capabilities.canCreateSkipRange
  }
  return capabilities.canCreateBookmark
}

export function resolveAuthoringUiVisibility(capabilities: PlaybackCapabilities): {
  showRangeLanes: boolean
  showRangeSelectionControls: boolean
  showSubtitleSnap: boolean
  showMaskCreation: boolean
  showMuteRangeCreation: boolean
  showSkipRangeCreation: boolean
  showBookmarkLane: boolean
  showRuler: boolean
  showPlayhead: boolean
} {
  const showRangeAuthoring = canCreateRangeActions(capabilities)
  return {
    showRangeLanes: showRangeAuthoring,
    showRangeSelectionControls: showRangeAuthoring,
    showSubtitleSnap: capabilities.canImportCustomSubtitles && capabilities.sourceDisclosure !== 'youtube',
    showMaskCreation: capabilities.canCreateMask,
    showMuteRangeCreation: capabilities.canCreateMuteRange,
    showSkipRangeCreation: capabilities.canCreateSkipRange,
    showBookmarkLane: true,
    showRuler: true,
    showPlayhead: true
  }
}

export function canEditItemType(
  capabilities: PlaybackCapabilities,
  type: SelectableItemType | null
): boolean {
  if (type === 'bookmark') {
    return capabilities.canEditBookmark
  }
  if (type === 'mask') {
    return capabilities.canCreateMask
  }
  if (type === 'mute') {
    return capabilities.canCreateMuteRange
  }
  if (type === 'skip') {
    return capabilities.canCreateSkipRange
  }
  return false
}

export function filterExecutableActions(
  capabilities: PlaybackCapabilities,
  masks: MaskTrackItem[],
  mutes: MuteTrackItem[],
  skips: SkipTrackItem[]
): { masks: MaskTrackItem[]; mutes: MuteTrackItem[]; skips: SkipTrackItem[] } {
  return {
    masks: capabilities.canCreateMask ? masks : [],
    mutes: capabilities.canCreateMuteRange ? mutes : [],
    skips: capabilities.canCreateSkipRange ? skips : []
  }
}

export function countUnsupportedActions(
  capabilities: PlaybackCapabilities,
  items: readonly TrackItem[]
): number {
  return items.reduce((count, item) => {
    if (item.type === 'mask' && !capabilities.canCreateMask) {
      return count + 1
    }
    if (item.type === 'mute' && !capabilities.canCreateMuteRange) {
      return count + 1
    }
    if (item.type === 'skip' && !capabilities.canCreateSkipRange) {
      return count + 1
    }
    return count
  }, 0)
}
