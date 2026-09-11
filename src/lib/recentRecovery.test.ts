import { describe, expect, it, vi } from 'vitest'
import { runRecentRecovery } from './recentRecovery'

describe('recent file recovery', () => {
  it('validates before the dirty guard and commits only after activation', async () => {
    const order: string[] = []
    const outcome = await runRecentRecovery({
      pick: async () => { order.push('pick'); return 'replacement' },
      validate: () => { order.push('validate'); return true },
      runIfAllowed: async (action) => { order.push('guard'); await action(); return 'clean-and-continue' },
      activate: () => { order.push('activate'); return true },
      commit: () => { order.push('commit') }
    })

    expect(outcome).toBe('opened')
    expect(order).toEqual(['pick', 'validate', 'guard', 'activate', 'commit'])
  })

  it('does not run the dirty guard for an invalid replacement', async () => {
    const runIfAllowed = vi.fn()
    const outcome = await runRecentRecovery({
      pick: async () => 'invalid', validate: () => false, runIfAllowed,
      activate: vi.fn(), commit: vi.fn()
    })
    expect(outcome).toBe('invalid')
    expect(runIfAllowed).not.toHaveBeenCalled()
  })

  it('leaves history untouched when the dirty guard is cancelled', async () => {
    const activate = vi.fn()
    const commit = vi.fn()
    const outcome = await runRecentRecovery({
      pick: async () => 'replacement', validate: () => true,
      runIfAllowed: async () => 'cancelled', activate, commit
    })
    expect(outcome).toBe('guard-cancelled')
    expect(activate).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
  })

  it('cancels without validation, activation, or history mutation', async () => {
    const validate = vi.fn()
    const activate = vi.fn()
    const commit = vi.fn()
    const outcome = await runRecentRecovery({
      pick: async () => null, validate, runIfAllowed: vi.fn(), activate, commit
    })
    expect(outcome).toBe('cancelled')
    expect(validate).not.toHaveBeenCalled()
    expect(activate).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
  })
})
