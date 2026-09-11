import { describe, expect, it } from 'vitest'
import { computeVirtualTimelineDuration } from './virtualTimeline'
import type { MuteTrackItem } from '../types/track'

function mute(start: number, end: number): MuteTrackItem {
  return {
    id: `mute-${start}-${end}`,
    type: 'mute',
    start,
    end,
    enabled: true
  }
}

describe('computeVirtualTimelineDuration', () => {
  it('uses a five minute minimum without metadata or items', () => {
    expect(computeVirtualTimelineDuration({ masks: [], mutes: [], skips: [] })).toBe(300)
  })

  it('prefers longer track metadata duration when available', () => {
    expect(
      computeVirtualTimelineDuration({
        masks: [],
        mutes: [mute(10, 20)],
        skips: [],
        metadataDuration: 900
      })
    ).toBe(900)
  })

  it('extends past metadata when an item reaches beyond it', () => {
    expect(
      computeVirtualTimelineDuration({
        masks: [],
        mutes: [mute(590, 620)],
        skips: [],
        metadataDuration: 600
      })
    ).toBe(650)
  })
})
