import { describe, expect, it } from 'vitest'
import { DEFAULT_REGION_COVER_RECT } from './subtitleCoverDefaults'
import { buildMetadataFingerprint, compareTrackVideoToCurrent } from './fingerprint'
import { buildVeilTrackFromStore } from './trackSerialization'
import { EMPTY_TRACK_METADATA } from '../types/track'

describe('audio track serialization', () => {
  it('serializes audio metadata with zero resolution without crashing', () => {
    const track = buildVeilTrackFromStore({
      masks: [],
      mutes: [],
      skips: [],
      bookmarks: [],
      globalOffsetSeconds: 0,
      trackMetadata: { ...EMPTY_TRACK_METADATA },
      groups: [],
      anchors: [],
      subtitleCoverMode: 'show',
      regionCoverRect: { ...DEFAULT_REGION_COVER_RECT },
      videoMetadata: {
        name: 'podcast.mp3',
        duration: 183.4,
        fileSize: 4_500_000,
        width: 0,
        height: 0
      },
      videoFileName: 'podcast.mp3'
    })

    expect(track).not.toBeNull()
    expect(track?.video?.resolution).toEqual({ width: 0, height: 0 })
    expect(track?.video?.duration).toBe(183.4)
    expect(track?.video?.fingerprint.value).toContain('podcast.mp3')
  })

  it('does not flag resolution mismatch when both sides are audio zero resolution', () => {
    const metadata = {
      name: 'song.flac',
      duration: 240,
      fileSize: 12_000_000,
      width: 0,
      height: 0
    }

    const mismatches = compareTrackVideoToCurrent(
      {
        binding: 'metadata',
        name: 'song.flac',
        duration: 240,
        fileSize: 12_000_000,
        resolution: { width: 0, height: 0 },
        fingerprint: buildMetadataFingerprint('song.flac', metadata)
      },
      'song.flac',
      metadata
    )

    expect(mismatches.some((entry) => entry.field === 'resolution')).toBe(false)
  })

  it('still flags resolution mismatch for video tracks', () => {
    const metadata = {
      name: 'clip.mp4',
      duration: 60,
      fileSize: 8_000_000,
      width: 1920,
      height: 1080
    }

    const mismatches = compareTrackVideoToCurrent(
      {
        binding: 'metadata',
        name: 'clip.mp4',
        duration: 60,
        fileSize: 8_000_000,
        resolution: { width: 1280, height: 720 },
        fingerprint: buildMetadataFingerprint('clip.mp4', metadata)
      },
      'clip.mp4',
      metadata
    )

    expect(mismatches.some((entry) => entry.field === 'resolution')).toBe(true)
  })
})
