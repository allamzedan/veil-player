import { describe, expect, it } from 'vitest'
import {
  clampSeekTooltipX,
  playbackSeekHoverFromPointer,
  playbackTimeFromSeekPointer
} from './playbackSeekHover'

const rect = { left: 100, width: 216 }

describe('playback seek hover geometry', () => {
  it('maps the start of the seek bar to zero', () => {
    expect(playbackTimeFromSeekPointer(100, rect, 366)).toBe(0)
  })

  it('maps the midpoint to half the duration', () => {
    expect(playbackTimeFromSeekPointer(208, rect, 366)).toBe(183)
  })

  it('maps the end of the seek bar to the duration', () => {
    expect(playbackTimeFromSeekPointer(316, rect, 366)).toBe(366)
  })

  it('clamps pointer positions outside the seek bar', () => {
    expect(playbackTimeFromSeekPointer(-50, rect, 366)).toBe(0)
    expect(playbackTimeFromSeekPointer(500, rect, 366)).toBe(366)
  })

  it('hides hover time for unavailable or invalid duration', () => {
    expect(playbackTimeFromSeekPointer(208, rect, 0)).toBeNull()
    expect(playbackTimeFromSeekPointer(208, rect, Number.NaN)).toBeNull()
    expect(playbackTimeFromSeekPointer(208, { left: 100, width: 0 }, 366)).toBeNull()
    expect(playbackSeekHoverFromPointer(208, rect, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('clamps the tooltip fully inside the visible seek bar', () => {
    expect(clampSeekTooltipX(0, 216, 48)).toBe(24)
    expect(clampSeekTooltipX(108, 216, 48)).toBe(108)
    expect(clampSeekTooltipX(216, 216, 48)).toBe(192)
  })
})
