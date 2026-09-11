import { describe, expect, it } from 'vitest'
import {
  computeAspectFitContentLayout,
  getRenderedVideoRect,
  getRenderedVideoRectInStage
} from './videoRect'

function mockVideo(options: {
  elementWidth: number
  elementHeight: number
  videoWidth: number
  videoHeight: number
  left?: number
  top?: number
}): HTMLVideoElement {
  const left = options.left ?? 0
  const top = options.top ?? 0

  return {
    getBoundingClientRect: () => ({
      left,
      top,
      width: options.elementWidth,
      height: options.elementHeight
    }),
    videoWidth: options.videoWidth,
    videoHeight: options.videoHeight
  } as HTMLVideoElement
}

describe('getRenderedVideoRect', () => {
  it('returns null without intrinsic dimensions', () => {
    const video = mockVideo({
      elementWidth: 800,
      elementHeight: 450,
      videoWidth: 0,
      videoHeight: 0
    })

    expect(getRenderedVideoRect(video)).toBeNull()
  })

  it('letterboxes a wide video in a tall element', () => {
    const video = mockVideo({
      elementWidth: 800,
      elementHeight: 600,
      videoWidth: 1920,
      videoHeight: 1080
    })

    const rect = getRenderedVideoRect(video)
    expect(rect).not.toBeNull()
    if (!rect) {
      return
    }

    expect(rect.width).toBeCloseTo(800, 1)
    expect(rect.height).toBeCloseTo(450, 1)
    expect(rect.top).toBeCloseTo(75, 1)
    expect(rect.left).toBeCloseTo(0, 1)
  })

  it('pillarboxes a tall video in a wide element', () => {
    const video = mockVideo({
      elementWidth: 800,
      elementHeight: 600,
      videoWidth: 1080,
      videoHeight: 1920
    })

    const rect = getRenderedVideoRect(video)
    expect(rect).not.toBeNull()
    if (!rect) {
      return
    }

    expect(rect.height).toBeCloseTo(600, 1)
    expect(rect.width).toBeCloseTo(337.5, 1)
    expect(rect.left).toBeCloseTo(231.25, 1)
    expect(rect.top).toBeCloseTo(0, 1)
  })
})

describe('computeAspectFitContentLayout', () => {
  it('letterboxes 16:9 inside a taller container', () => {
    const layout = computeAspectFitContentLayout(800, 600, 16 / 9)
    expect(layout).not.toBeNull()
    if (!layout) {
      return
    }

    expect(layout.width).toBeCloseTo(800, 1)
    expect(layout.height).toBeCloseTo(450, 1)
    expect(layout.top).toBeCloseTo(75, 1)
    expect(layout.left).toBeCloseTo(0, 1)
  })

  it('pillarboxes 16:9 inside a wider container', () => {
    const layout = computeAspectFitContentLayout(900, 400, 16 / 9)
    expect(layout).not.toBeNull()
    if (!layout) {
      return
    }

    expect(layout.height).toBeCloseTo(400, 1)
    expect(layout.width).toBeCloseTo(711.11, 1)
    expect(layout.left).toBeCloseTo(94.44, 1)
    expect(layout.top).toBeCloseTo(0, 1)
  })
})

describe('getRenderedVideoRectInStage', () => {
  it('uses the stage client origin so a bordered stage has no top/left mask inset', () => {
    const video = mockVideo({
      elementWidth: 800,
      elementHeight: 450,
      videoWidth: 16,
      videoHeight: 9,
      left: 101,
      top: 51
    })
    const stage = {
      clientLeft: 1,
      clientTop: 1,
      getBoundingClientRect: () => ({ left: 100, top: 50 })
    } as HTMLElement

    expect(getRenderedVideoRectInStage(video, stage)).toEqual({
      left: 0,
      top: 0,
      width: 800,
      height: 450
    })
  })
})
