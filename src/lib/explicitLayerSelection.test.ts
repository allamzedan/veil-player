import { beforeEach, describe, expect, it } from 'vitest'
import { useVeilStore } from '../state/useVeilStore'
import {
  clearExplicitLayerSelection,
  shouldClearMaskSelectionFromStage,
  shouldToggleOffExplicitSelection
} from './explicitLayerSelection'

describe('explicit layer selection clearing', () => {
  beforeEach(() => {
    useVeilStore.setState({ selectedItemId: null, selectedItemType: null })
  })

  it('clears selection without mutating the selected layer', () => {
    const mask = useVeilStore.getState().masks[0]
    useVeilStore.setState({ selectedItemId: 'mask-1', selectedItemType: 'mask' })
    expect(clearExplicitLayerSelection()).toBe(true)
    expect(useVeilStore.getState().selectedItemId).toBeNull()
    expect(useVeilStore.getState().selectedItemType).toBeNull()
    expect(useVeilStore.getState().masks[0]).toEqual(mask)
    expect(clearExplicitLayerSelection()).toBe(false)
  })

  it('toggles off only the same pointer-activated item', () => {
    expect(shouldToggleOffExplicitSelection('mask-1', 'mask', 'mask-1', 'mask')).toBe(true)
    expect(shouldToggleOffExplicitSelection('mask-1', 'mask', 'mask-2', 'mask')).toBe(false)
    expect(shouldToggleOffExplicitSelection('mask-1', 'mask', 'mask-1', 'mute')).toBe(false)
  })

  it('clears a selected mask only for an outside-stage activation', () => {
    expect(shouldClearMaskSelectionFromStage('mask', false)).toBe(true)
    expect(shouldClearMaskSelectionFromStage('mask', true)).toBe(false)
    expect(shouldClearMaskSelectionFromStage('mute', false)).toBe(false)
  })
})
