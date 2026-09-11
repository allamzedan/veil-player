import { describe, expect, it } from 'vitest'
import { timelineViewportForSelection } from './timelineSelectionViewport'

describe('timelineViewportForSelection', () => {
  it('pads a long range by 20 percent on both sides', () => {
    expect(timelineViewportForSelection({ start: 40, end: 60 }, 120)).toEqual({
      viewStart: 36,
      viewEnd: 64
    })
  })

  it('centers a bookmark in a deterministic 20-second context window', () => {
    expect(timelineViewportForSelection({ start: 60 }, 120)).toEqual({
      viewStart: 50,
      viewEnd: 70
    })
    expect(timelineViewportForSelection({ start: 60 }, 120)).toEqual(
      timelineViewportForSelection({ start: 60 }, 120)
    )
  })

  it('expands bookmark context to at most 30 seconds for long media', () => {
    expect(timelineViewportForSelection({ start: 300 }, 600)).toEqual({
      viewStart: 285,
      viewEnd: 315
    })
  })

  it('shifts bookmark windows at media boundaries instead of shrinking them', () => {
    expect(timelineViewportForSelection({ start: 0 }, 100)).toEqual({ viewStart: 0, viewEnd: 20 })
    expect(timelineViewportForSelection({ start: 99 }, 100)).toEqual({ viewStart: 80, viewEnd: 100 })
  })

  it('adds five seconds of context around short ranges and enforces a useful minimum', () => {
    expect(timelineViewportForSelection({ start: 40, end: 42 }, 120)).toEqual({
      viewStart: 35,
      viewEnd: 47
    })
    const tiny = timelineViewportForSelection({ start: 50, end: 50.01 }, 120)
    expect(tiny).not.toBeNull()
    expect((tiny?.viewEnd ?? 0) - (tiny?.viewStart ?? 0)).toBeGreaterThanOrEqual(10)
  })

  it('returns null without a usable duration or selection', () => {
    expect(timelineViewportForSelection({ start: 2 }, 0)).toBeNull()
    expect(timelineViewportForSelection({ start: Number.NaN }, 100)).toBeNull()
  })
})
