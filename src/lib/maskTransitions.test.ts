import { describe, expect, it } from 'vitest'
import {
  clampFadeMs,
  computeMaskEffectiveOpacity,
  filterMasksForPlaybackRender,
  maskNeedsPlaybackOpacityAnimation
} from './maskTransitions'
import type { MaskTrackItem } from '../types/track'

function mask(overrides: Partial<MaskTrackItem> = {}): MaskTrackItem {
  return {
    id: 'm1',
    type: 'mask',
    start: 10,
    end: 20,
    rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
    style: { mode: 'solid', color: '#000', opacity: 1 },
    ...overrides
  }
}

describe('maskTransitions', () => {
  it('clampFadeMs bounds values', () => {
    expect(clampFadeMs(undefined)).toBe(0)
    expect(clampFadeMs(-100)).toBe(0)
    expect(clampFadeMs(300)).toBe(300)
    expect(clampFadeMs(99999)).toBe(5000)
  })

  it('maskNeedsPlaybackOpacityAnimation when any fade set', () => {
    expect(maskNeedsPlaybackOpacityAnimation([mask()])).toBe(false)
    expect(maskNeedsPlaybackOpacityAnimation([mask({ fadeInMs: 200 })])).toBe(true)
  })

  it('fades in before start', () => {
    const item = mask({ fadeInMs: 1000 })
    expect(computeMaskEffectiveOpacity(item, 9)).toBe(0)
    expect(computeMaskEffectiveOpacity(item, 9.5)).toBeCloseTo(0.5, 2)
    expect(computeMaskEffectiveOpacity(item, 10)).toBe(1)
  })

  it('fades out after end', () => {
    const item = mask({ fadeOutMs: 1000 })
    expect(computeMaskEffectiveOpacity(item, 20)).toBe(1)
    expect(computeMaskEffectiveOpacity(item, 20.5)).toBeCloseTo(0.5, 2)
    expect(computeMaskEffectiveOpacity(item, 21)).toBe(0)
  })

  it('filterMasksForPlaybackRender skips disabled masks', () => {
    const entries = filterMasksForPlaybackRender(
      [mask({ enabled: false, fadeInMs: 500 })],
      9.5
    )
    expect(entries).toHaveLength(0)
  })
})
