import { describe, expect, it, beforeEach } from 'vitest'
import { captureTrackSnapshot } from '../lib/historySnapshot'
import { useHistoryStore } from './useHistoryStore'

import { emptyTrackSnapshotSource } from '../lib/historySnapshot'

const emptySource = emptyTrackSnapshotSource()

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear()
  })

  it('pushes snapshots and undoes', () => {
    const baseline = captureTrackSnapshot(emptySource)
    useHistoryStore.getState().pushSnapshot(baseline)

    const current = {
      ...emptySource,
      globalOffsetSeconds: 2
    }

    const restored = useHistoryStore.getState().undo(current)
    expect(restored?.globalOffsetSeconds).toBe(0)
    expect(useHistoryStore.getState().canRedo()).toBe(true)
  })

  it('limits history to 100 entries', () => {
    for (let index = 0; index < 105; index += 1) {
      useHistoryStore
        .getState()
        .pushSnapshot(
          captureTrackSnapshot({
            ...emptySource,
            globalOffsetSeconds: index
          })
        )
    }

    expect(useHistoryStore.getState().past.length).toBe(100)
    expect(useHistoryStore.getState().past[0]?.globalOffsetSeconds).toBe(5)
  })

  it('coalesces drag updates into one undo step', () => {
    useHistoryStore.getState().beginCoalescedUpdate(emptySource)
    useHistoryStore
      .getState()
      .pushSnapshot(captureTrackSnapshot({ ...emptySource, globalOffsetSeconds: 99 }))
    useHistoryStore.getState().endCoalescedUpdate(true)

    expect(useHistoryStore.getState().past).toHaveLength(1)
    expect(useHistoryStore.getState().past[0]?.globalOffsetSeconds).toBe(0)
  })
})
