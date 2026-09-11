import { describe, expect, it } from 'vitest'
import { nearestVerticalScrollDelta } from './scrollReveal'

describe('nearestVerticalScrollDelta', () => {
  const viewport = { top: 100, bottom: 300 }

  it('does not scroll a visible row', () => {
    expect(nearestVerticalScrollDelta(viewport, { top: 120, bottom: 180 })).toBe(0)
  })

  it('uses nearest alignment above and below the viewport', () => {
    expect(nearestVerticalScrollDelta(viewport, { top: 40, bottom: 90 })).toBe(-60)
    expect(nearestVerticalScrollDelta(viewport, { top: 310, bottom: 360 })).toBe(60)
  })
})
