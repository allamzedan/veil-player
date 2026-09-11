import { describe, expect, it, vi } from 'vitest'
import { executeUnsavedChangesDecision } from './unsavedChangesDecision'

function actions(saveResult: 'saved' | 'canceled' | 'failed' = 'saved') {
  return {
    save: vi.fn(async () => saveResult),
    discard: vi.fn(),
    proceed: vi.fn()
  }
}

describe('existing unsaved-changes decision flow', () => {
  it('saves successfully before proceeding', async () => {
    const callbacks = actions()
    await expect(executeUnsavedChangesDecision('save', callbacks)).resolves.toBe('saved-and-continue')
    expect(callbacks.save).toHaveBeenCalledOnce()
    expect(callbacks.proceed).toHaveBeenCalledOnce()
    expect(callbacks.discard).not.toHaveBeenCalled()
  })

  it.each(['canceled', 'failed'] as const)('keeps the current source when saving is %s', async (result) => {
    const callbacks = actions(result)
    await expect(executeUnsavedChangesDecision('save', callbacks)).resolves.toBe('cancelled')
    expect(callbacks.proceed).not.toHaveBeenCalled()
  })

  it('discards before proceeding', async () => {
    const callbacks = actions()
    await expect(executeUnsavedChangesDecision('discard', callbacks)).resolves.toBe('discarded-and-continue')
    expect(callbacks.discard).toHaveBeenCalledOnce()
    expect(callbacks.proceed).toHaveBeenCalledOnce()
    expect(callbacks.save).not.toHaveBeenCalled()
  })

  it('cancels without mutating or proceeding', async () => {
    const callbacks = actions()
    await expect(executeUnsavedChangesDecision('cancel', callbacks)).resolves.toBe('cancelled')
    expect(callbacks.save).not.toHaveBeenCalled()
    expect(callbacks.discard).not.toHaveBeenCalled()
    expect(callbacks.proceed).not.toHaveBeenCalled()
  })
})
