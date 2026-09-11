import { afterEach, describe, expect, it, vi } from 'vitest'
import { runConfirmedAction } from './nativeConfirm'

afterEach(() => vi.unstubAllGlobals())

describe('native deletion actions', () => {
  it.each(['Mask', 'Mute', 'Skip', 'Bookmark'])('deletes one %s only after confirmation', (type) => {
    const action = vi.fn()
    const confirmDialog = vi.fn(() => true)
    vi.stubGlobal('window', { veil: { confirmDialog }, confirm: vi.fn() })

    expect(runConfirmedAction(`Delete ${type}`, `Delete this ${type}?`, action)).toBe(true)
    expect(action).toHaveBeenCalledTimes(1)

    action.mockClear()
    confirmDialog.mockReturnValue(false)
    expect(runConfirmedAction(`Delete ${type}`, `Delete this ${type}?`, action)).toBe(false)
    expect(action).not.toHaveBeenCalled()
  })
})
