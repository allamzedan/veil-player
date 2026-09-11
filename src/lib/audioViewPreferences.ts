export type AudioViewMode = 'compact' | 'workspace'

const AUDIO_VIEW_MODE_KEY = 'veil:audioViewMode:v1'

export const DEFAULT_AUDIO_VIEW_MODE: AudioViewMode = 'compact'

export function readAudioViewMode(): AudioViewMode {
  try {
    const raw = localStorage.getItem(AUDIO_VIEW_MODE_KEY)
    if (raw === 'workspace' || raw === 'compact') {
      return raw
    }
  } catch {
    // ignore
  }
  return DEFAULT_AUDIO_VIEW_MODE
}

export function writeAudioViewMode(mode: AudioViewMode): void {
  try {
    localStorage.setItem(AUDIO_VIEW_MODE_KEY, mode)
  } catch {
    // ignore
  }
}
