import { useEffect } from 'react'
import { isAudioMediaKind, type MediaKind } from '../lib/mediaKind'
import { shouldShowAudioCompact } from '../lib/audioWorkspace'
import type { PlayerMode } from '../state/usePlayerModeStore'

/**
 * Sync Electron window size with Audio Watch Mode.
 * No-ops outside the desktop shell.
 */
export function useAudioWatchWindowLayout(
  mediaKind: MediaKind | null | undefined,
  playerMode: PlayerMode,
  hasMedia: boolean
): void {
  useEffect(() => {
    const api = window.veil?.applyLayoutPreset
    if (!api || !hasMedia) {
      return
    }

    const audioWatch = shouldShowAudioCompact(mediaKind, playerMode)
    void api(audioWatch ? 'audio-watch' : 'video-default')
  }, [hasMedia, mediaKind, playerMode])

  useEffect(() => {
    return () => {
      if (isAudioMediaKind(mediaKind) && window.veil?.applyLayoutPreset) {
        void window.veil.applyLayoutPreset('video-default')
      }
    }
  }, [mediaKind])
}
