import { describe, expect, it } from 'vitest'
import { clampPercentRect, moveRect, resizeRectFromCorner } from './geometry'

const rect = {
  xPercent: 20,
  yPercent: 20,
  widthPercent: 30,
  heightPercent: 30
}

describe('mask percent bounds', () => {
  it('clamps drag x to the exact left edge', () => {
    expect(moveRect(rect, { dxPercent: -100, dyPercent: 0 }).xPercent).toBe(0)
  })

  it('clamps drag y to the exact top edge', () => {
    expect(moveRect(rect, { dxPercent: 0, dyPercent: -100 }).yPercent).toBe(0)
  })

  it('keeps the exact right edge reachable', () => {
    const moved = moveRect(rect, { dxPercent: 100, dyPercent: 0 })
    expect(moved.xPercent + moved.widthPercent).toBe(100)
  })

  it('keeps the exact bottom edge reachable', () => {
    const moved = moveRect(rect, { dxPercent: 0, dyPercent: 100 })
    expect(moved.yPercent + moved.heightPercent).toBe(100)
  })

  it('resizes to the exact top-left corner without changing the opposite edges', () => {
    expect(resizeRectFromCorner(rect, 'top-left', {
      dxPercent: -20,
      dyPercent: -20
    })).toEqual({
      xPercent: 0,
      yPercent: 0,
      widthPercent: 50,
      heightPercent: 50
    })
  })

  it('resizes to the exact bottom-right corner and never escapes the bounds', () => {
    expect(resizeRectFromCorner(rect, 'bottom-right', {
      dxPercent: 50,
      dyPercent: 50
    })).toEqual({
      xPercent: 20,
      yPercent: 20,
      widthPercent: 80,
      heightPercent: 80
    })
    expect(clampPercentRect({
      xPercent: -10,
      yPercent: -10,
      widthPercent: 120,
      heightPercent: 120
    })).toEqual({
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100
    })
  })
})
