import { describe, expect, it } from 'vitest'
import { buildTrackManifest, formatManifestSummary } from './trackManifest'
import type { VeilTrack } from '../types/track'

function minimalTrack(overrides: Partial<VeilTrack> = {}): VeilTrack {
  return {
    version: '1.2.0',
    app: 'VEIL',
    video: {
      name: 'movie.mp4',
      duration: 120,
      fileSize: 1000,
      resolution: { width: 1920, height: 1080 },
      fingerprint: { method: 'metadata-v1', value: 'test' }
    },
    globalOffsetSeconds: 0,
    items: [],
    ...overrides
  }
}

describe('buildTrackManifest', () => {
  it('counts manual vs subtitle masks', () => {
    const manifest = buildTrackManifest(
      minimalTrack({
        items: [
          {
            id: 'm1',
            type: 'mask',
            start: 0,
            end: 1,
            rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
            style: { mode: 'solid', color: '#000', opacity: 1 },
            source: { kind: 'manual' }
          },
          {
            id: 'm2',
            type: 'mask',
            start: 1,
            end: 2,
            rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
            style: { mode: 'solid', color: '#000', opacity: 1 },
            source: { kind: 'srt' }
          },
          { id: 'u1', type: 'mute', start: 0, end: 1 }
        ]
      })
    )

    expect(manifest.manualMaskCount).toBe(1)
    expect(manifest.subtitleMaskCount).toBe(1)
    expect(manifest.muteCount).toBe(1)
    expect(manifest.groupCount).toBe(0)
  })

  it('formats summary lines', () => {
    const lines = formatManifestSummary(
      buildTrackManifest(
        minimalTrack({
          trackMetadata: { title: 'Study copy' },
          groups: [{ id: 'g1', label: 'Intro', itemIds: [] }],
          items: [
            {
              id: 'm1',
              type: 'mask',
              start: 0,
              end: 1,
              rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
              style: { mode: 'solid', color: '#000', opacity: 1 }
            }
          ]
        })
      )
    )

    expect(lines[0]).toBe('Study copy')
    expect(lines.some((line) => line.includes('1 manual mask'))).toBe(true)
    expect(lines.some((line) => line.includes('1 group'))).toBe(true)
  })
})
