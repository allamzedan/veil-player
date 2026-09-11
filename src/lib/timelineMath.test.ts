import { describe, expect, it } from 'vitest'
import { shiftViewport, zoomViewportAtTime } from './timelineMath'

describe('shiftViewport', () => {
  it('pans forward and clamps at duration end', () => {
    expect(shiftViewport(10, 30, 60, 5)).toEqual({ viewStart: 15, viewEnd: 35 })
    expect(shiftViewport(50, 60, 60, 10)).toEqual({ viewStart: 50, viewEnd: 60 })
  })

  it('pans backward and clamps at zero', () => {
    expect(shiftViewport(5, 15, 60, -10)).toEqual({ viewStart: 0, viewEnd: 10 })
  })
})

describe('zoomViewportAtTime', () => {
  it('zooms around anchor time', () => {
    const result = zoomViewportAtTime(0, 60, 60, 30, 0.5, 0.5, 1)
    expect(result.viewStart).toBeCloseTo(15, 5)
    expect(result.viewEnd).toBeCloseTo(45, 5)
  })
})
