import { mergeAnchorsForSave } from './trackAnchors'
import { resolveTrackDisplayName } from './trackChipLabel'
import { isUnboundTrackVideo } from './unboundTrack'
import { buildVeilTrackFromStore, isYouTubeBoundTrack } from './trackSerialization'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'
import type { VeilTrack } from '../types/track'
import { SUPPORTED_TRACK_VERSION } from '../types/track'

export interface TrackExportSnapshot {
  track: VeilTrack | null
  json: string | null
  estimatedBytes: number | null
  title: string
  description: string | null
  author: string | null
  tags: string[]
  maskCount: number
  muteCount: number
  skipCount: number
  videoLabel: string
  isUnbound: boolean
  hasFingerprint: boolean
  desktopCompatible: boolean
  mobileCompatible: boolean
}

function buildAnchorsForExport(): ReturnType<typeof mergeAnchorsForSave> {
  const state = useVeilStore.getState()
  const manualAnchors = state.anchors.filter((anchor) => anchor.kind !== 'cue')
  return mergeAnchorsForSave(manualAnchors, state.subtitleCues)
}

export function buildTrackForExport(): VeilTrack | null {
  const state = useVeilStore.getState()
  return buildVeilTrackFromStore({
    masks: state.masks,
    mutes: state.mutes,
    skips: state.skips,
    bookmarks: state.bookmarks,
    preservedUnsupportedItems: state.preservedUnsupportedItems,
    preservedUnknownItems: state.preservedUnknownItems,
    preservedUnknownRootFields: state.preservedUnknownRootFields,
    globalOffsetSeconds: state.globalOffsetSeconds,
    trackMetadata: state.trackMetadata,
    groups: state.groups,
    anchors: buildAnchorsForExport(),
    subtitleCoverMode: state.subtitleCoverMode,
    regionCoverRect: state.regionCoverRect,
    videoMetadata: state.videoMetadata,
    videoFileName: state.videoFileName,
    mediaSource: state.mediaSource
  })
}

function resolveExportVideoLabel(track: VeilTrack): string {
  if (isYouTubeBoundTrack(track) && track.media) {
    return track.media.title?.trim() || track.media.videoId || t('export.youtubeSource')
  }
  if (!track.video) {
    return t('export.unboundTrack')
  }
  return isUnboundTrackVideo(track.video)
    ? t('export.unboundTrack')
    : track.video.name || t('export.unboundTrack')
}

export function serializeTrackForExport(track: VeilTrack): string {
  return JSON.stringify(track, null, 2)
}

export function estimateUtf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length
}

export function formatEstimatedFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const kb = bytes / 1024
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb).toString()} KB`
  }
  return `${(kb / 1024).toFixed(1)} MB`
}

export function formatTrackExportSummary(track: VeilTrack, title: string): string {
  const hideUnsupportedCounts = isYouTubeBoundTrack(track)
  const masks = track.items.filter((item) => item.type === 'mask').length
  const mutes = track.items.filter((item) => item.type === 'mute').length
  const skips = track.items.filter((item) => item.type === 'skip').length
  const videoLabel = resolveExportVideoLabel(track)

  return [
    t('export.summaryPrefix', { title }),
    hideUnsupportedCounts
      ? null
      : `${t('export.actionsSummaryLabel')}: ${t('export.actionsSummary', { masks, mutes, skips })}`,
    `${t('export.summaryVideo')}: ${videoLabel}`,
    `${t('export.summaryFormat')}: VEIL Track ${SUPPORTED_TRACK_VERSION}`
  ].filter((line): line is string => line !== null).join('\n')
}

export function buildTrackExportSnapshot(): TrackExportSnapshot {
  const state = useVeilStore.getState()
  const track = buildTrackForExport()
  const json = track ? serializeTrackForExport(track) : null
  const title = resolveTrackDisplayName({
    trackMetadataTitle: state.trackMetadata.title,
    videoFileName: state.videoFileName,
    untitledLabel: t('trackChip.untitledTrack')
  })

  const isYouTube = track ? isYouTubeBoundTrack(track) : false
  const isUnbound = track && !isYouTube ? isUnboundTrackVideo(track.video) : false
  const hasFingerprint = Boolean(
    !isYouTube &&
      track?.video?.fingerprint?.value &&
      track.video.fingerprint.method !== 'manual-unbound'
  )

  return {
    track,
    json,
    estimatedBytes: json ? estimateUtf8Bytes(json) : null,
    title,
    description: state.trackMetadata.description?.trim() || null,
    author: state.trackMetadata.author?.trim() || null,
    tags: state.trackMetadata.tags ?? [],
    maskCount: isYouTube ? 0 : state.masks.length,
    muteCount: isYouTube ? 0 : state.mutes.length,
    skipCount: isYouTube ? 0 : state.skips.length,
    videoLabel: track
      ? resolveExportVideoLabel(track)
      : state.videoFileName?.trim() || t('export.unboundTrack'),
    isUnbound,
    hasFingerprint,
    desktopCompatible: true,
    mobileCompatible: track?.version === SUPPORTED_TRACK_VERSION
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
