import { describe, expect, it } from 'vitest'
import { getDebugSnapshot, updateSeekDebug } from './debugState'

describe('debugState', () => {
  it('returns a stable snapshot reference until debug state changes', () => {
    const first = getDebugSnapshot()
    const second = getDebugSnapshot()
    expect(second).toBe(first)

    updateSeekDebug({ displayTime: 12.5 })
    const third = getDebugSnapshot()
    expect(third).not.toBe(first)
    expect(third.seek.displayTime).toBe(12.5)
  })
})
