import type {
  MaskTrackItem,
  MuteTrackItem,
  SkipTrackItem,
  VeilTrack
} from '../types/track'

export interface ReconciledPlayback {
  activeMasks: MaskTrackItem[]
  activeMutes: MuteTrackItem[]
  activeSkips: SkipTrackItem[]
}

export function reconcilePlayback(
  track: Pick<VeilTrack, 'items' | 'globalOffsetSeconds'>,
  currentTime: number
): ReconciledPlayback {
  const adjustedTime = currentTime + track.globalOffsetSeconds

  const activeMasks: MaskTrackItem[] = []
  const activeMutes: MuteTrackItem[] = []
  const activeSkips: SkipTrackItem[] = []

  for (const item of track.items) {
    if (item.enabled === false) {
      continue
    }

    if (item.start > adjustedTime || adjustedTime > item.end) {
      continue
    }

    if (item.type === 'mask') {
      activeMasks.push(item)
    } else if (item.type === 'mute') {
      activeMutes.push(item)
    } else if (item.type === 'skip') {
      activeSkips.push(item)
    } else if (item.type === 'bookmark') {
      continue
    }
  }

  return { activeMasks, activeMutes, activeSkips }
}
