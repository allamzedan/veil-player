import { describe, expect, it } from 'vitest'
import { shouldApplyLoopJump, type SessionLoop } from './sessionLoop'

const loop: SessionLoop = { start: 0, end: 30, enabled: true }

describe('shouldApplyLoopJump', () => {
  it('does not loop when paused even if time is past loop end', () => {
    expect(shouldApplyLoopJump(0, 60, loop, true)).toBe(false)
    expect(shouldApplyLoopJump(55, 60, loop, true)).toBe(false)
  })

  it('does not loop when seeking while playing to a time already past loop end', () => {
    expect(shouldApplyLoopJump(60, 60, loop, false)).toBe(false)
  })

  it('loops when playback crosses loop end while playing', () => {
    expect(shouldApplyLoopJump(29.5, 30, loop, false)).toBe(true)
    expect(shouldApplyLoopJump(29.9, 30.1, loop, false)).toBe(true)
  })

  it('does not loop before reaching loop end', () => {
    expect(shouldApplyLoopJump(10, 20, loop, false)).toBe(false)
  })

  it('does not loop when resuming after seek landed past loop end', () => {
    expect(shouldApplyLoopJump(45, 45.05, loop, false)).toBe(false)
  })
})
