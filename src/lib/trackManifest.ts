import type { MaskTrackItem, TrackItem, VeilTrack } from '../types/track'

export interface TrackManifest {
  schemaVersion: string
  savedForFileName: string
  savedDuration: number
  manualMaskCount: number
  subtitleMaskCount: number
  muteCount: number
  skipCount: number
  groupCount: number
  anchorCount: number
  appVersion?: string
  exportedAt?: string
  trackTitle?: string
}

function countMasksBySource(masks: MaskTrackItem[]): {
  manual: number
  subtitle: number
} {
  let manual = 0
  let subtitle = 0
  for (const mask of masks) {
    if (mask.source?.kind === 'srt') {
      subtitle += 1
    } else {
      manual += 1
    }
  }
  return { manual, subtitle }
}

export function buildTrackManifest(track: VeilTrack): TrackManifest {
  const masks = track.items.filter((item): item is MaskTrackItem => item.type === 'mask')
  const mutes = track.items.filter((item) => item.type === 'mute')
  const skips = track.items.filter((item) => item.type === 'skip')
  const { manual, subtitle } = countMasksBySource(masks)

  const isYouTube = track.media?.kind === 'youtube'
  const savedForFileName = isYouTube
    ? track.media?.title?.trim() || track.media?.videoId || ''
    : track.video?.name ?? ''
  const savedDuration = isYouTube
    ? track.media?.duration ?? 0
    : track.video?.duration ?? 0

  return {
    schemaVersion: track.version,
    savedForFileName,
    savedDuration,
    manualMaskCount: manual,
    subtitleMaskCount: subtitle,
    muteCount: mutes.length,
    skipCount: skips.length,
    groupCount: track.groups?.length ?? 0,
    anchorCount: track.anchors?.length ?? 0,
    appVersion: track.appVersion,
    exportedAt: track.exportedAt,
    trackTitle: track.trackMetadata?.title
  }
}

export function formatManifestSummary(manifest: TrackManifest): string[] {
  const lines: string[] = []

  if (manifest.trackTitle) {
    lines.push(manifest.trackTitle)
  }

  const itemParts: string[] = []
  if (manifest.manualMaskCount > 0) {
    itemParts.push(`${manifest.manualMaskCount} manual mask(s)`)
  }
  if (manifest.subtitleMaskCount > 0) {
    itemParts.push(`${manifest.subtitleMaskCount} subtitle mask(s)`)
  }
  if (manifest.muteCount > 0) {
    itemParts.push(`${manifest.muteCount} mute interval(s)`)
  }
  if (manifest.skipCount > 0) {
    itemParts.push(`${manifest.skipCount} skip interval(s)`)
  }

  if (itemParts.length > 0) {
    lines.push(itemParts.join(', '))
  } else {
    lines.push('No track items')
  }

  if (manifest.groupCount > 0) {
    lines.push(`${manifest.groupCount} group(s)`)
  }
  if (manifest.anchorCount > 0) {
    lines.push(`${manifest.anchorCount} timing anchor(s)`)
  }

  return lines
}

export function summarizeItems(items: TrackItem[]): Pick<
  TrackManifest,
  'manualMaskCount' | 'subtitleMaskCount' | 'muteCount' | 'skipCount'
> {
  const masks = items.filter((item): item is MaskTrackItem => item.type === 'mask')
  const { manual, subtitle } = countMasksBySource(masks)
  return {
    manualMaskCount: manual,
    subtitleMaskCount: subtitle,
    muteCount: items.filter((item) => item.type === 'mute').length,
    skipCount: items.filter((item) => item.type === 'skip').length
  }
}
