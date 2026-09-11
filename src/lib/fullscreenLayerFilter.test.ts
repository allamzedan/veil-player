import { describe, expect, it } from 'vitest'
import {
  defaultFullscreenLayerFilter,
  FULLSCREEN_LAYER_SHOW_ALL_THRESHOLD
} from './fullscreenLayerFilter'

describe('fullscreenLayerFilter', () => {
  it('defaults to all layers when count is at threshold', () => {
    expect(defaultFullscreenLayerFilter(FULLSCREEN_LAYER_SHOW_ALL_THRESHOLD)).toBe('all')
  })

  it('defaults to active when count exceeds threshold', () => {
    expect(defaultFullscreenLayerFilter(FULLSCREEN_LAYER_SHOW_ALL_THRESHOLD + 1)).toBe('active')
  })
})
