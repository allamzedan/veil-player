import type { MediaKind } from './mediaKind'
import type { MediaSource } from '../types/mediaSource'
import {
  canCreateMasks as capabilitiesCanCreateMasks,
  canRenderMaskOverlays as capabilitiesCanRenderMaskOverlays,
  canUseRegionSubtitleCover as capabilitiesCanUseRegionSubtitleCover,
  hasPlayableMediaLoaded as capabilitiesHasPlayableMediaLoaded,
  isAudioOnlySession as capabilitiesIsAudioOnlySession
} from './playbackCapabilities'

/**
 * Legacy audio-session helpers — backed by playbackCapabilities so local audio
 * behavior stays unchanged for existing call sites.
 */
export function isAudioOnlySession(mediaKind: MediaKind | null | undefined): boolean {
  return capabilitiesIsAudioOnlySession(mediaKind)
}

export function canCreateMasks(mediaKind: MediaKind | null | undefined): boolean {
  return capabilitiesCanCreateMasks(mediaKind)
}

export function canRenderMaskOverlays(mediaKind: MediaKind | null | undefined): boolean {
  return capabilitiesCanRenderMaskOverlays(mediaKind)
}

export function canUseRegionSubtitleCover(mediaKind: MediaKind | null | undefined): boolean {
  return capabilitiesCanUseRegionSubtitleCover(mediaKind)
}

export function hasPlayableMediaLoaded(
  videoSrc: string | null,
  mediaKind: MediaKind | null | undefined,
  mediaSource: MediaSource | null | undefined = null
): boolean {
  return capabilitiesHasPlayableMediaLoaded(videoSrc, mediaKind, mediaSource)
}
