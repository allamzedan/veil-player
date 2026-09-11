import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runClearTrackAction } from './clearTrackAction'
import { useVeilStore } from '../state/useVeilStore'

describe('clearTrackAction', () => {
  beforeEach(() => {
    useVeilStore.setState({
      masks: [],
      mutes: [],
      skips: []
    })
    vi.stubGlobal('window', { confirm: vi.fn(() => true) })
  })

  it('no-ops when track is empty', () => {
    const runIfAllowed = vi.fn()
    runClearTrackAction({ runIfAllowed })
    expect(runIfAllowed).not.toHaveBeenCalled()
  })

  it('clears items after confirm', () => {
    useVeilStore.setState({
      skips: [{ id: 's1', type: 'skip', enabled: true, start: 0, end: 1 }]
    })

    const onAfter = vi.fn()
    runClearTrackAction({
      runIfAllowed: (action) => action(),
      onAfter
    })

    expect(useVeilStore.getState().skips).toHaveLength(0)
    expect(onAfter).toHaveBeenCalled()
  })
})
