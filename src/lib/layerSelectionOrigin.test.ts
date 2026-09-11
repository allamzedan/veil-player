import { describe, expect, it } from 'vitest'
import { suppressLocalBookmarkToastForSelection } from './layerSelectionOrigin'

describe('fullscreen Layers bookmark presentation', () => {
  it('suppresses only local bookmark selections originating in fullscreen Layers', () => {
    expect(suppressLocalBookmarkToastForSelection('bookmark', false, 'fullscreen-layers-row')).toBe(true)
    expect(suppressLocalBookmarkToastForSelection('bookmark', false, 'fullscreen-layers-edit')).toBe(true)
    expect(suppressLocalBookmarkToastForSelection('bookmark', false, 'standard')).toBe(false)
  })

  it('retains YouTube activity and non-bookmark selection behavior', () => {
    expect(suppressLocalBookmarkToastForSelection('bookmark', true, 'fullscreen-layers-row')).toBe(false)
    expect(suppressLocalBookmarkToastForSelection('skip', false, 'fullscreen-layers-row')).toBe(false)
  })
})
