import { describe, expect, it } from 'vitest'
import {
  canEditItemType,
  canInvokeAuthoringCommand,
  countUnsupportedActions,
  filterExecutableActions,
  resolveAuthoringUiVisibility
} from './authoringCapabilities'
import { resolvePlaybackCapabilities } from './playbackCapabilities'
import type { MediaSource } from '../types/mediaSource'
import type { MaskTrackItem, MuteTrackItem, SkipTrackItem } from '../types/track'

const youtube: MediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'abc123def45',
  canonicalUrl: 'https://www.youtube.com/watch?v=abc123def45'
}

const localVideo: MediaSource = {
  kind: 'local',
  path: 'C:\\media\\sample.mp4',
  mediaType: 'video'
}

const mask: MaskTrackItem = {
  id: 'mask-1',
  type: 'mask',
  start: 1,
  end: 2,
  rect: { xPercent: 10, yPercent: 10, widthPercent: 20, heightPercent: 20 },
  style: { mode: 'solid', color: '#000000', opacity: 1 }
}
const mute: MuteTrackItem = { id: 'mute-1', type: 'mute', start: 2, end: 3 }
const skip: SkipTrackItem = { id: 'skip-1', type: 'skip', start: 3, end: 4 }

describe('capability-correct authoring UI', () => {
  it('shows only YouTube-supported range lanes and creation tools', () => {
    const caps = resolvePlaybackCapabilities(youtube, 'video')
    expect(resolveAuthoringUiVisibility(caps)).toEqual({
      showRangeLanes: true,
      showRangeSelectionControls: true,
      showSubtitleSnap: false,
      showMaskCreation: false,
      showMuteRangeCreation: true,
      showSkipRangeCreation: true,
      showBookmarkLane: true,
      showRuler: true,
      showPlayhead: true
    })
  })

  it('keeps local-video range lanes and authoring tools', () => {
    const caps = resolvePlaybackCapabilities(localVideo, 'video')
    const visibility = resolveAuthoringUiVisibility(caps)
    expect(visibility.showRangeLanes).toBe(true)
    expect(visibility.showMaskCreation).toBe(true)
    expect(visibility.showMuteRangeCreation).toBe(true)
    expect(visibility.showSkipRangeCreation).toBe(true)
    expect(visibility.showSubtitleSnap).toBe(true)
    expect(canInvokeAuthoringCommand(caps, 'mask')).toBe(true)
    expect(canInvokeAuthoringCommand(caps, 'mute-range')).toBe(true)
    expect(canInvokeAuthoringCommand(caps, 'skip-range')).toBe(true)
  })

  it('permits YouTube Mute, Skip, and Bookmark commands while blocking Mask', () => {
    const caps = resolvePlaybackCapabilities(youtube, 'video')
    expect(canInvokeAuthoringCommand(caps, 'mask')).toBe(false)
    expect(canInvokeAuthoringCommand(caps, 'mute-range')).toBe(true)
    expect(canInvokeAuthoringCommand(caps, 'skip-range')).toBe(true)
    expect(canInvokeAuthoringCommand(caps, 'bookmark')).toBe(true)
    expect(canEditItemType(caps, 'skip')).toBe(true)
    expect(canEditItemType(caps, 'bookmark')).toBe(true)
  })

  it('excludes only unsupported YouTube masks from execution and active counts', () => {
    const caps = resolvePlaybackCapabilities(youtube, 'video')
    expect(filterExecutableActions(caps, [mask], [mute], [skip])).toEqual({
      masks: [],
      mutes: [mute],
      skips: [skip]
    })
    expect(countUnsupportedActions(caps, [mask, mute, skip])).toBe(1)
  })
})
