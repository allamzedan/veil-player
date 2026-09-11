import { describe, expect, it, vi } from 'vitest'
import {
  isNativeFileDialogInFlight,
  withOpenTrackDialogGuard,
  withOpenVideoDialogGuard,
  withSaveTrackDialogGuard
} from './nativeDialogGuard'

function parent() {
  return {
    isDestroyed: vi.fn(() => false),
    focus: vi.fn()
  }
}

describe('main-process native file dialog guard', () => {
  it('serializes Open Media and Load VEIL across the shared category', async () => {
    let release: (() => void) | undefined
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    const owner = parent()
    const first = withOpenVideoDialogGuard(owner, async () => {
      await blocked
      return 'video'
    })

    await Promise.resolve()
    expect(isNativeFileDialogInFlight()).toBe(true)
    await expect(withOpenTrackDialogGuard(parent(), async () => 'track')).resolves.toBeNull()
    release?.()
    await expect(first).resolves.toBe('video')
    expect(owner.focus).toHaveBeenCalledOnce()
    expect(isNativeFileDialogInFlight()).toBe(false)
  })

  it('clears and returns focus after cancellation and success', async () => {
    const canceledParent = parent()
    await expect(withOpenTrackDialogGuard(canceledParent, async () => ({ canceled: true })))
      .resolves.toEqual({ canceled: true })
    expect(canceledParent.focus).toHaveBeenCalledOnce()

    const savedParent = parent()
    await expect(withSaveTrackDialogGuard(savedParent, async () => ({ canceled: false })))
      .resolves.toEqual({ canceled: false })
    expect(savedParent.focus).toHaveBeenCalledOnce()
    expect(isNativeFileDialogInFlight()).toBe(false)
  })

  it('clears after errors and does not focus a destroyed parent', async () => {
    const failedParent = parent()
    await expect(withOpenVideoDialogGuard(failedParent, async () => {
      throw new Error('dialog failed')
    })).rejects.toThrow('dialog failed')
    expect(failedParent.focus).toHaveBeenCalledOnce()
    expect(isNativeFileDialogInFlight()).toBe(false)

    const destroyedParent = {
      isDestroyed: vi.fn(() => true),
      focus: vi.fn()
    }
    await expect(withOpenVideoDialogGuard(destroyedParent, async () => 'done')).resolves.toBe('done')
    expect(destroyedParent.focus).not.toHaveBeenCalled()
  })
})
