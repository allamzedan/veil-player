import { describe, expect, it, vi } from 'vitest'
import { runGuardedRecentOpen } from './recentOpen'

describe('runGuardedRecentOpen', () => {
  it.each(['saved-and-continue', 'discarded-and-continue', 'clean-and-continue'] as const)(
    'opens and records after %s',
    async (guardOutcome) => {
      const open = vi.fn()
      const onOpened = vi.fn()
      const outcome = await runGuardedRecentOpen({
        runIfAllowed: async (action) => {
          await action()
          return guardOutcome
        },
        open,
        onOpened
      })
      expect(outcome).toBe('opened')
      expect(open).toHaveBeenCalledOnce()
      expect(onOpened).toHaveBeenCalledOnce()
    }
  )

  it('does not open or reorder history when Cancel is chosen', async () => {
    const open = vi.fn()
    const onOpened = vi.fn()
    const outcome = await runGuardedRecentOpen({
      runIfAllowed: async () => 'cancelled',
      open,
      onOpened
    })
    expect(outcome).toBe('cancelled')
    expect(open).not.toHaveBeenCalled()
    expect(onOpened).not.toHaveBeenCalled()
  })

  it('removes a missing path before entering the dirty-state guard', async () => {
    const runIfAllowed = vi.fn()
    const onMissing = vi.fn()
    const outcome = await runGuardedRecentOpen({
      validate: async () => false,
      runIfAllowed,
      open: vi.fn(),
      onMissing
    })
    expect(outcome).toBe('missing')
    expect(onMissing).toHaveBeenCalledOnce()
    expect(runIfAllowed).not.toHaveBeenCalled()
  })
})