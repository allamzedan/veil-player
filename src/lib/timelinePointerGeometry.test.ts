import { describe, expect, it } from 'vitest'
import { clampTimelineHoverX, timelineTimeFromPointer } from './timelineMath'

const baseGeometry = {
  trackLeft: 100,
  visibleTrackWidth: 800,
  scrollLeft: 0,
  virtualTrackWidth: 800,
  duration: 100,
  usableInsetStart: 80,
  usableInsetEnd: 20
}

describe('timelineTimeFromPointer', () => {
  it('maps unzoomed pointer positions through the shared usable-track insets', () => {
    expect(timelineTimeFromPointer({ ...baseGeometry, clientX: 180 })).toBe(0)
    expect(timelineTimeFromPointer({ ...baseGeometry, clientX: 530 })).toBe(50)
    expect(timelineTimeFromPointer({ ...baseGeometry, clientX: 880 })).toBe(100)
  })

  it('maps the visible midpoint on a zoomed virtual track', () => {
    expect(timelineTimeFromPointer({
      ...baseGeometry,
      clientX: 500,
      virtualTrackWidth: 1480,
      duration: 200
    })).toBeCloseTo(46.377, 3)
  })

  it('incorporates logical horizontal scroll exactly', () => {
    expect(timelineTimeFromPointer({
      ...baseGeometry,
      clientX: 500,
      scrollLeft: 350,
      virtualTrackWidth: 1480,
      duration: 200
    })).toBeCloseTo(97.101, 3)
  })

  it('clamps both endpoints and rejects unusable measurements', () => {
    expect(timelineTimeFromPointer({ ...baseGeometry, clientX: -500 })).toBe(0)
    expect(timelineTimeFromPointer({ ...baseGeometry, clientX: 5000 })).toBe(100)
    expect(timelineTimeFromPointer({ ...baseGeometry, clientX: 500, visibleTrackWidth: 0 })).toBe(0)
  })
})

describe('timeline hover positioning', () => {
  it('keeps the timestamp inside the visible viewport without changing mapped time', () => {
    expect(clampTimelineHoverX(-20, 400)).toBe(28)
    expect(clampTimelineHoverX(200, 400)).toBe(200)
    expect(clampTimelineHoverX(500, 400)).toBe(372)
    expect(clampTimelineHoverX(20, 30)).toBe(15)
  })
})
