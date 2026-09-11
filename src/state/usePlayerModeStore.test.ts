import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerModeStore } from './usePlayerModeStore'

describe('usePlayerModeStore', () => {
  beforeEach(() => {
    usePlayerModeStore.getState().resetPlayerMode()
  })

  it('defaults to watch', () => {
    expect(usePlayerModeStore.getState().playerMode).toBe('watch')
  })

  it('setPlayerMode updates mode', () => {
    usePlayerModeStore.getState().setPlayerMode('edit')
    expect(usePlayerModeStore.getState().playerMode).toBe('edit')
    usePlayerModeStore.getState().setPlayerMode('watch')
    expect(usePlayerModeStore.getState().playerMode).toBe('watch')
  })

  it('togglePlayerMode alternates', () => {
    usePlayerModeStore.getState().togglePlayerMode()
    expect(usePlayerModeStore.getState().playerMode).toBe('edit')
    usePlayerModeStore.getState().togglePlayerMode()
    expect(usePlayerModeStore.getState().playerMode).toBe('watch')
  })

  it('resetPlayerMode returns to watch', () => {
    usePlayerModeStore.getState().setPlayerMode('edit')
    usePlayerModeStore.getState().resetPlayerMode()
    expect(usePlayerModeStore.getState().playerMode).toBe('watch')
  })
})
