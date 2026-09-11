import type { MediaKind } from './mediaKind'
import { isAudioMediaKind } from './mediaKind'
import type { MediaSource } from '../types/mediaSource'
import { isYouTubeMediaSource } from '../types/mediaSource'
import type { PlayerMode } from '../state/usePlayerModeStore'
import { useAudioViewStore } from '../state/useAudioViewStore'
import { usePlayerModeStore } from '../state/usePlayerModeStore'
import { useVeilStore } from '../state/useVeilStore'
import { captureAudioPlaybackTransitionFromVideo } from './audioPlaybackTransition'
import { hasPlayableMediaLoaded } from './playbackCapabilities'

export function isAudioOnlyMedia(mediaKind: MediaKind | null | undefined): boolean {
  return isAudioMediaKind(mediaKind)
}

export function shouldShowAudioCompact(
  mediaKind: MediaKind | null | undefined,
  playerMode: PlayerMode
): boolean {
  return isAudioOnlyMedia(mediaKind) && playerMode === 'watch'
}

export function shouldUseAudioWorkspaceLayout(
  mediaKind: MediaKind | null | undefined,
  playerMode: PlayerMode
): boolean {
  return isAudioOnlyMedia(mediaKind) && playerMode === 'edit'
}

export function shouldShowMediaWorkspace(
  videoSrc: string | null,
  uiRefreshV1: boolean,
  veilSessionActive: boolean,
  playerMode: PlayerMode,
  mediaSource: MediaSource | null | undefined = null
): boolean {
  if (hasPlayableMediaLoaded(videoSrc, null, mediaSource)) {
    return true
  }
  if (mediaSource && isYouTubeMediaSource(mediaSource) && mediaSource.videoId) {
    return true
  }
  return Boolean(videoSrc) || (uiRefreshV1 && veilSessionActive && playerMode === 'edit')
}

export function enterAudioVeilEditIfNeeded(): void {
  if (!isAudioOnlyMedia(useVeilStore.getState().mediaKind)) {
    return
  }
  useAudioViewStore.getState().enterAudioEdit()
}

export function exitAudioVeilEditIfNeeded(): void {
  if (!isAudioOnlyMedia(useVeilStore.getState().mediaKind)) {
    return
  }
  useAudioViewStore.getState().exitAudioEdit()
}

function captureActiveMediaPlayback(fallbackTime = 0): void {
  const store = useVeilStore.getState()
  const mediaSrc = store.videoSrc
  if (!isAudioOnlyMedia(store.mediaKind) || !mediaSrc) {
    return
  }
  const video =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLVideoElement>('video.player-video')
      : null
  captureAudioPlaybackTransitionFromVideo(video, mediaSrc, fallbackTime)
}

export function setPlayerModeWatchWithAudio(fallbackTime = 0): void {
  captureActiveMediaPlayback(fallbackTime)
  usePlayerModeStore.getState().setPlayerMode('watch')
  exitAudioVeilEditIfNeeded()
}

export function setPlayerModeEditWithAudio(fallbackTime = 0): void {
  captureActiveMediaPlayback(fallbackTime)
  enterAudioVeilEditIfNeeded()
  usePlayerModeStore.getState().setPlayerMode('edit')
}

export function togglePlayerModeWithAudio(fallbackTime = 0): void {
  const mode = usePlayerModeStore.getState().playerMode
  if (mode === 'watch') {
    setPlayerModeEditWithAudio(fallbackTime)
    return
  }
  setPlayerModeWatchWithAudio(fallbackTime)
}
