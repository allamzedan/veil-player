import { describe, expect, it } from 'vitest'
import { compareTrackVideoToCurrent } from './fingerprint'
import { classifyMismatches } from './trackMatching'
import { deserializeVeilTrackToStorePayload, parseAndDeserializeTrackJson } from './trackSerialization'

/** Mobile-export shape: shorter track on a different video than desktop session. */
export const MOBILE_VEIL_TRACK_JSON = JSON.stringify({
  version: '1.4.0',
  app: 'VEIL',
  appVersion: 'VEIL Mobile 0.1.0',
  exportedAt: '2026-05-19T12:00:00.000Z',
  subtitleCover: {
    mode: 'smartCover',
    regionRect: {
      xPercent: 10,
      yPercent: 78,
      widthPercent: 80,
      heightPercent: 18
    }
  },
  video: {
    name: 'mobile-clip.mp4',
    duration: 34.943,
    fileSize: 5120000,
    resolution: { width: 1080, height: 1920 },
    fingerprint: { method: 'metadata-v1', value: 'mobile|5120000|34.943|1080|1920' }
  },
  globalOffsetSeconds: 0,
  trackMetadata: { title: 'Mobile test' },
  items: [
    {
      id: 'mask-mobile-1',
      type: 'mask',
      start: 10.021,
      end: 15.021,
      enabled: true,
      rect: { xPercent: 5, yPercent: 10, widthPercent: 90, heightPercent: 20 },
      style: { mode: 'solid', color: '#000000', opacity: 0.85, presentation: 'solid' }
    },
    {
      id: 'skip-mobile-1',
      type: 'skip',
      start: 22.577,
      end: 25.577,
      enabled: true
    }
  ]
})

describe('trackMatching mobile compatibility', () => {
  it('classifies large duration mismatch as critical but importable', () => {
    const parsed = parseAndDeserializeTrackJson(MOBILE_VEIL_TRACK_JSON)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok || !parsed.track) {
      return
    }

    const mismatches = compareTrackVideoToCurrent(parsed.track.video, 'desktop-long.mp4', {
      name: 'desktop-long.mp4',
      duration: 179.374,
      fileSize: 99000000,
      width: 1920,
      height: 1080
    })
    const classified = classifyMismatches(mismatches)

    expect(classified.hard.length).toBeGreaterThan(0)
    expect(classified.hard.some((m) => m.field === 'duration')).toBe(true)
    expect(classified.soft.some((m) => m.field === 'name')).toBe(true)
  })

  it('deserializes mobile track with subtitleCover smartCover', () => {
    const parsed = parseAndDeserializeTrackJson(MOBILE_VEIL_TRACK_JSON)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok || !parsed.payload) {
      return
    }

    expect(parsed.track.appVersion).toBe('VEIL Mobile 0.1.0')
    expect(parsed.payload.masks).toHaveLength(1)
    expect(parsed.payload.skips).toHaveLength(1)
    expect(parsed.payload.masks[0]?.start).toBe(10.021)
    expect(parsed.payload.masks[0]?.end).toBe(15.021)
    expect(parsed.payload.skips[0]?.start).toBe(22.577)
    expect(parsed.payload.skips[0]?.end).toBe(25.577)
    expect(parsed.payload.subtitleCoverMode).toBe('smartCover')
    expect(parsed.payload.regionCoverRect).toEqual({
      xPercent: 10,
      yPercent: 78,
      widthPercent: 80,
      heightPercent: 18
    })
  })

  it('deserializes mobile items independently of video mismatch', () => {
    const parsed = parseAndDeserializeTrackJson(MOBILE_VEIL_TRACK_JSON)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    const payload = deserializeVeilTrackToStorePayload(parsed.track)
    expect(payload.masks).toHaveLength(1)
    expect(payload.skips).toHaveLength(1)
    expect(payload.globalOffsetSeconds).toBe(0)
  })
})
