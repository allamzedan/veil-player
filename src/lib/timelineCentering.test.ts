import { describe, expect, it } from 'vitest'
import { timelineScrollLeftForPlayhead } from './timelineCentering'

const geometry = {
  duration: 100,
  viewportWidth: 400,
  virtualTrackWidth: 1200,
  usableInsetStart: 100,
  usableInsetEnd: 20
}

describe('timelineScrollLeftForPlayhead', () => {
  it('centers the authoritative playhead without changing virtual width', () => {
    expect(timelineScrollLeftForPlayhead({ ...geometry, playheadTime: 50 })).toBe(440)
  })

  it('clamps deterministically near media start and end', () => {
    expect(timelineScrollLeftForPlayhead({ ...geometry, playheadTime: 0 })).toBe(0)
    expect(timelineScrollLeftForPlayhead({ ...geometry, playheadTime: 100 })).toBe(800)
    expect(timelineScrollLeftForPlayhead({ ...geometry, playheadTime: 100 })).toBe(800)
  })

  it('does not create scrolling in Fit mode or with invalid geometry', () => {
    expect(timelineScrollLeftForPlayhead({ ...geometry, playheadTime: 50, virtualTrackWidth: 400 })).toBe(0)
    expect(timelineScrollLeftForPlayhead({ ...geometry, playheadTime: 50, duration: 0 })).toBe(0)
  })
})
