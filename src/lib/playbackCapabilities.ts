import type { MediaKind } from './mediaKind'
import { isAudioMediaKind, visualMaskFeaturesEnabled } from './mediaKind'
import type { MediaSource } from '../types/mediaSource'
import { isYouTubeMediaSource } from '../types/mediaSource'

/**
 * Capability-driven UI gates — prefer these over scattering `source.kind === 'youtube'` checks.
 */
export interface PlaybackCapabilities {
  canCreateMask: boolean
  canCreateMuteRange: boolean
  canCreateSkipRange: boolean
  canUseVisualSelection: boolean
  canUseVisualOverlays: boolean
  canCreateBookmark: boolean
  canEditBookmark: boolean
  canEditMediaNotes: boolean
  canImportCustomSubtitles: boolean
  canUseSmartCover: boolean
  canUseRegionCover: boolean
  canFullscreen: boolean
  canChangePlaybackRate: boolean
  canSaveVeil: boolean
  canShareVeil: boolean
  /** Concise source disclosure for the chrome indicator. */
  sourceDisclosure: 'local' | 'youtube'
}

const LOCAL_VIDEO_CAPABILITIES: PlaybackCapabilities = {
  canCreateMask: true,
  canCreateMuteRange: true,
  canCreateSkipRange: true,
  canUseVisualSelection: true,
  canUseVisualOverlays: true,
  canCreateBookmark: true,
  canEditBookmark: true,
  canEditMediaNotes: true,
  canImportCustomSubtitles: true,
  canUseSmartCover: true,
  canUseRegionCover: true,
  canFullscreen: true,
  canChangePlaybackRate: true,
  canSaveVeil: true,
  canShareVeil: true,
  sourceDisclosure: 'local'
}

const LOCAL_AUDIO_CAPABILITIES: PlaybackCapabilities = {
  canCreateMask: false,
  canCreateMuteRange: true,
  canCreateSkipRange: true,
  canUseVisualSelection: false,
  canUseVisualOverlays: false,
  canCreateBookmark: true,
  canEditBookmark: true,
  canEditMediaNotes: true,
  canImportCustomSubtitles: true,
  canUseSmartCover: false,
  canUseRegionCover: false,
  canFullscreen: false,
  canChangePlaybackRate: true,
  canSaveVeil: true,
  canShareVeil: true,
  sourceDisclosure: 'local'
}

const YOUTUBE_CAPABILITIES: PlaybackCapabilities = {
  canCreateMask: false,
  canCreateMuteRange: true,
  canCreateSkipRange: true,
  canUseVisualSelection: false,
  canUseVisualOverlays: false,
  canCreateBookmark: true,
  canEditBookmark: true,
  canEditMediaNotes: true,
  canImportCustomSubtitles: true,
  canUseSmartCover: false,
  canUseRegionCover: false,
  /** Official iframe fullscreen when the player reports support. */
  canFullscreen: true,
  canChangePlaybackRate: true,
  canSaveVeil: true,
  canShareVeil: true,
  sourceDisclosure: 'youtube'
}

export function resolvePlaybackCapabilities(
  mediaSource: MediaSource | null | undefined,
  mediaKind: MediaKind | null | undefined = null
): PlaybackCapabilities {
  if (mediaSource && isYouTubeMediaSource(mediaSource)) {
    return { ...YOUTUBE_CAPABILITIES }
  }

  if (isAudioMediaKind(mediaKind) || (mediaSource?.kind === 'local' && mediaSource.mediaType === 'audio')) {
    return { ...LOCAL_AUDIO_CAPABILITIES }
  }

  if (mediaSource?.kind === 'local' || mediaKind === 'video') {
    return { ...LOCAL_VIDEO_CAPABILITIES }
  }

  // No media — default to local video capabilities for empty chrome (actions still gated elsewhere).
  return { ...LOCAL_VIDEO_CAPABILITIES }
}

/** Keep legacy audioMode helpers consistent with the capability model. */
export function isAudioOnlySession(mediaKind: MediaKind | null | undefined): boolean {
  return isAudioMediaKind(mediaKind)
}

export function canCreateMasks(mediaKind: MediaKind | null | undefined): boolean {
  return visualMaskFeaturesEnabled(mediaKind)
}

export function canRenderMaskOverlays(mediaKind: MediaKind | null | undefined): boolean {
  return visualMaskFeaturesEnabled(mediaKind)
}

export function canUseRegionSubtitleCover(mediaKind: MediaKind | null | undefined): boolean {
  return visualMaskFeaturesEnabled(mediaKind)
}

export function hasPlayableMediaLoaded(
  videoSrc: string | null,
  mediaKind: MediaKind | null | undefined,
  mediaSource: MediaSource | null | undefined = null
): boolean {
  if (mediaSource && isYouTubeMediaSource(mediaSource)) {
    return Boolean(mediaSource.videoId)
  }
  return Boolean(videoSrc) && (mediaKind === 'video' || mediaKind === 'audio')
}
