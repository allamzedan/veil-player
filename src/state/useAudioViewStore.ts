import { create } from 'zustand'
import {
  readAudioViewMode,
  writeAudioViewMode,
  type AudioViewMode
} from '../lib/audioViewPreferences'

interface AudioViewState {
  audioViewMode: AudioViewMode
  preEditAudioViewMode: AudioViewMode | null
  setAudioViewMode: (mode: AudioViewMode) => void
  expandWorkspace: () => void
  compactView: () => void
  enterAudioEdit: () => void
  exitAudioEdit: () => void
  resetForSession: () => void
}

export const useAudioViewStore = create<AudioViewState>((set, get) => ({
  audioViewMode: readAudioViewMode(),
  preEditAudioViewMode: null,

  setAudioViewMode: (mode) => {
    writeAudioViewMode(mode)
    set({ audioViewMode: mode })
  },

  expandWorkspace: () => {
    get().setAudioViewMode('workspace')
  },

  compactView: () => {
    get().setAudioViewMode('compact')
  },

  enterAudioEdit: () => {
    const current = get().audioViewMode
    set({
      preEditAudioViewMode: current,
      audioViewMode: 'workspace'
    })
  },

  exitAudioEdit: () => {
    const prior = get().preEditAudioViewMode
    if (prior === 'compact') {
      writeAudioViewMode('compact')
      set({ audioViewMode: 'compact', preEditAudioViewMode: null })
      return
    }
    set({ preEditAudioViewMode: null })
  },

  resetForSession: () => {
    set({
      audioViewMode: readAudioViewMode(),
      preEditAudioViewMode: null
    })
  }
}))
