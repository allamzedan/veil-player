import { describe, expect, it } from 'vitest'
import { deriveLayerPanelState } from './layerPanelState'

describe('shared layer panel state', () => {
  const mask = { id: 'mask-1', type: 'mask' as const }
  const mute = { id: 'mute-1', type: 'mute' as const }

  it('moves none → preview → editor → preview → none without retaining a lower shell', () => {
    expect(deriveLayerPanelState(null, null)).toEqual({
      hasSelection: false, isEditingSelectedLayer: false, showPreview: false, showEditor: false
    })
    expect(deriveLayerPanelState(mask, null).showPreview).toBe(true)
    expect(deriveLayerPanelState(mask, 'mask:mask-1').showEditor).toBe(true)
    expect(deriveLayerPanelState(mask, null).showPreview).toBe(true)
    expect(deriveLayerPanelState(null, null).hasSelection).toBe(false)
  })

  it('shows the new selection preview and rejects a stale editor key', () => {
    const state = deriveLayerPanelState(mute, 'mask:mask-1')
    expect(state).toEqual({
      hasSelection: true, isEditingSelectedLayer: false, showPreview: true, showEditor: false
    })
  })

  it('reproduces the packaged stale-editor path without allocating editor space', () => {
    const state = deriveLayerPanelState(null, 'skip:deleted-skip')
    expect(state.hasSelection).toBe(false)
    expect(state.showPreview).toBe(false)
    expect(state.showEditor).toBe(false)
  })

  it('keeps every repeated clear transition free of preview and editor state', () => {
    const transitions = [
      deriveLayerPanelState(mask, null),
      deriveLayerPanelState(null, null),
      deriveLayerPanelState(mask, 'mask:mask-1'),
      deriveLayerPanelState(mask, null),
      deriveLayerPanelState(null, 'mask:mask-1'),
      deriveLayerPanelState(mute, 'mask:mask-1'),
      deriveLayerPanelState(null, null)
    ]
    for (const state of transitions.filter((candidate) => !candidate.hasSelection)) {
      expect(state).toEqual({
        hasSelection: false, isEditingSelectedLayer: false, showPreview: false, showEditor: false
      })
    }
  })
})
