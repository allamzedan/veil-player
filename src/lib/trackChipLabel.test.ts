import { describe, expect, it } from 'vitest'
import {
  hasTrackChipContent,
  resolveTrackDisplayName,
  truncateTrackChipName
} from './trackChipLabel'

describe('trackChipLabel', () => {
  it('truncates long names', () => {
    const long = 'A'.repeat(40)
    expect(truncateTrackChipName(long).endsWith('…')).toBe(true)
    expect(truncateTrackChipName(long).length).toBe(28)
  })

  it('prefers metadata title', () => {
    expect(
      resolveTrackDisplayName({
        trackMetadataTitle: 'Family Safe',
        videoFileName: 'clip.mp4',
        untitledLabel: 'Untitled Track'
      })
    ).toBe('Family Safe')
  })

  it('falls back to video stem .veil', () => {
    expect(
      resolveTrackDisplayName({
        videoFileName: 'Planet Earth.mkv',
        untitledLabel: 'Untitled Track'
      })
    ).toBe('Planet Earth.veil')
  })

  it('uses untitled when no sources', () => {
    expect(
      resolveTrackDisplayName({
        untitledLabel: 'Untitled Track'
      })
    ).toBe('Untitled Track')
  })

  it('detects track content from items or dirty state', () => {
    expect(
      hasTrackChipContent({
        maskCount: 0,
        muteCount: 0,
        skipCount: 0,
        isTrackDirty: false,
        trackMetadataTitle: ''
      })
    ).toBe(false)
    expect(
      hasTrackChipContent({
        maskCount: 1,
        muteCount: 0,
        skipCount: 0,
        isTrackDirty: false
      })
    ).toBe(true)
    expect(
      hasTrackChipContent({
        maskCount: 0,
        muteCount: 0,
        skipCount: 0,
        bookmarkCount: 1,
        isTrackDirty: false
      })
    ).toBe(true)
    expect(
      hasTrackChipContent({
        maskCount: 0,
        muteCount: 0,
        skipCount: 0,
        isTrackDirty: true
      })
    ).toBe(true)
  })
})
