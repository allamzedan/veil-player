import { describe, expect, it } from 'vitest'
import { resolvePlaybackCapabilities } from './playbackCapabilities'
import type { MediaSource } from '../types/mediaSource'

const localVideo: MediaSource = {
  kind: 'local',
  path: 'C:\\media\\a.mp4',
  mediaType: 'video'
}

const localAudio: MediaSource = {
  kind: 'local',
  path: 'C:\\media\\a.mp3',
  mediaType: 'audio'
}

const youtube: MediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
}

describe('resolvePlaybackCapabilities', () => {
  it('keeps local video capabilities unchanged', () => {
    const caps = resolvePlaybackCapabilities(localVideo, 'video')
    expect(caps.canCreateMask).toBe(true)
    expect(caps.canCreateMuteRange).toBe(true)
    expect(caps.canCreateSkipRange).toBe(true)
    expect(caps.canUseVisualSelection).toBe(true)
    expect(caps.canUseVisualOverlays).toBe(true)
    expect(caps.canCreateBookmark).toBe(true)
    expect(caps.canEditBookmark).toBe(true)
    expect(caps.canEditMediaNotes).toBe(true)
    expect(caps.canImportCustomSubtitles).toBe(true)
    expect(caps.canUseSmartCover).toBe(true)
    expect(caps.canUseRegionCover).toBe(true)
    expect(caps.canSaveVeil).toBe(true)
    expect(caps.canShareVeil).toBe(true)
    expect(caps.canChangePlaybackRate).toBe(true)
    expect(caps.sourceDisclosure).toBe('local')
  })

  it('keeps local audio capabilities unchanged', () => {
    const caps = resolvePlaybackCapabilities(localAudio, 'audio')
    expect(caps.canCreateMask).toBe(false)
    expect(caps.canUseVisualSelection).toBe(false)
    expect(caps.canUseVisualOverlays).toBe(false)
    expect(caps.canCreateMuteRange).toBe(true)
    expect(caps.canCreateSkipRange).toBe(true)
    expect(caps.canCreateBookmark).toBe(true)
    expect(caps.canEditBookmark).toBe(true)
    expect(caps.canEditMediaNotes).toBe(true)
    expect(caps.canImportCustomSubtitles).toBe(true)
    expect(caps.canUseSmartCover).toBe(false)
    expect(caps.canUseRegionCover).toBe(false)
    expect(caps.canFullscreen).toBe(false)
    expect(caps.canChangePlaybackRate).toBe(true)
    expect(caps.canSaveVeil).toBe(true)
    expect(caps.canShareVeil).toBe(true)
    expect(caps.sourceDisclosure).toBe('local')
  })

  it('applies YouTube product capabilities for this phase', () => {
    const caps = resolvePlaybackCapabilities(youtube, null)
    expect(caps.canCreateMask).toBe(false)
    expect(caps.canUseVisualSelection).toBe(false)
    expect(caps.canUseVisualOverlays).toBe(false)
    expect(caps.canCreateMuteRange).toBe(true)
    expect(caps.canCreateSkipRange).toBe(true)
    expect(caps.canCreateBookmark).toBe(true)
    expect(caps.canEditBookmark).toBe(true)
    expect(caps.canEditMediaNotes).toBe(true)
    expect(caps.canImportCustomSubtitles).toBe(true)
    expect(caps.canUseSmartCover).toBe(false)
    expect(caps.canUseRegionCover).toBe(false)
    expect(caps.canFullscreen).toBe(true)
    expect(caps.canChangePlaybackRate).toBe(true)
    expect(caps.canSaveVeil).toBe(true)
    expect(caps.canShareVeil).toBe(true)
    expect(caps.sourceDisclosure).toBe('youtube')
  })
})
