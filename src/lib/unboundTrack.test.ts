import { describe, expect, it } from 'vitest'
import { parseVeilTrackJson } from './trackSchema'
import { buildVeilTrackFromManualBuilderBatch, isUnboundVeilTrack } from './unboundTrack'
import type { ManualTrackBuilderBatch } from './manualTrackBuilder'

const sampleBatch: ManualTrackBuilderBatch = {
  masks: [
    {
      id: 'm1',
      type: 'mask',
      enabled: true,
      start: 0,
      end: 5,
      rect: { xPercent: 35, yPercent: 44, widthPercent: 30, heightPercent: 12 },
      style: { mode: 'solid', color: '#000000', opacity: 1 },
      source: { kind: 'manual' }
    }
  ],
  mutes: [],
  skips: [],
  firstMaskId: 'm1'
}

describe('unbound track', () => {
  it('builds an unbound veil track', () => {
    const track = buildVeilTrackFromManualBuilderBatch(sampleBatch)
    expect(isUnboundVeilTrack(track)).toBe(true)
    expect(track.video?.name).toBe('')
    expect(track.video?.duration).toBe(5)
  })

  it('round-trips through the schema parser', () => {
    const track = buildVeilTrackFromManualBuilderBatch(sampleBatch)
    const parsed = parseVeilTrackJson(JSON.stringify(track))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(isUnboundVeilTrack(parsed.track)).toBe(true)
    }
  })
})
