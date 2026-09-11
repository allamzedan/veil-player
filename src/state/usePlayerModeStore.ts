import { create } from 'zustand'

export type PlayerMode = 'watch' | 'edit'

interface PlayerModeState {
  playerMode: PlayerMode
  setPlayerMode: (mode: PlayerMode) => void
  togglePlayerMode: () => void
  resetPlayerMode: () => void
}

export const usePlayerModeStore = create<PlayerModeState>((set) => ({
  playerMode: 'watch',
  setPlayerMode: (mode) => set({ playerMode: mode }),
  togglePlayerMode: () =>
    set((state) => ({
      playerMode: state.playerMode === 'watch' ? 'edit' : 'watch'
    })),
  resetPlayerMode: () => set({ playerMode: 'watch' })
}))
