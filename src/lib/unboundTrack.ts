import { APP_VERSION } from './appVersion'
import type { ManualTrackBuilderBatch } from './manualTrackBuilder'
import type { TrackVideoSnapshot } from './fingerprint'
import type { VeilTrack, VideoFingerprint } from '../types/track'
import { EMPTY_TRACK_METADATA, SUPPORTED_TRACK_VERSION } from '../types/track'

export const UNBOUND_TRACK_BINDING = 'unbound' as const
export const METADATA_TRACK_BINDING = 'metadata' as const

export type VideoBinding = typeof UNBOUND_TRACK_BINDING | typeof METADATA_TRACK_BINDING

export const MANUAL_UNBOUND_FINGERPRINT: VideoFingerprint = {
  method: 'manual-unbound',
  value: 'manual-unbound'
}

export function isUnboundTrackVideo(
  video: TrackVideoSnapshot | VeilTrack['video'] | null | undefined
): boolean {
  if (!video) {
    return false
  }
  return (
    video.binding === UNBOUND_TRACK_BINDING ||
    video.fingerprint.method === 'manual-unbound'
  )
}

export function isUnboundVeilTrack(track: VeilTrack): boolean {
  if (track.media?.kind === 'youtube') {
    return false
  }
  return isUnboundTrackVideo(track.video)
}

export function computeManualBuilderTrackDuration(batch: ManualTrackBuilderBatch): number {
  const ends = [
    ...batch.masks.map((item) => item.end),
    ...batch.mutes.map((item) => item.end),
    ...batch.skips.map((item) => item.end)
  ]

  if (ends.length === 0) {
    return 0
  }

  return Math.max(...ends)
}

export function buildUnboundVideoSnapshot(durationSeconds: number): VeilTrack['video'] {
  return {
    binding: UNBOUND_TRACK_BINDING,
    name: '',
    duration: Math.max(0, durationSeconds),
    fileSize: null,
    resolution: { width: 0, height: 0 },
    fingerprint: { ...MANUAL_UNBOUND_FINGERPRINT }
  }
}

export function buildVeilTrackFromManualBuilderBatch(
  batch: ManualTrackBuilderBatch
): VeilTrack {
  const now = new Date().toISOString()
  const duration = computeManualBuilderTrackDuration(batch)

  return {
    version: SUPPORTED_TRACK_VERSION,
    app: 'VEIL',
    appVersion: APP_VERSION,
    exportedAt: now,
    video: buildUnboundVideoSnapshot(duration),
    globalOffsetSeconds: 0,
    trackMetadata: {
      ...EMPTY_TRACK_METADATA,
      title: 'Manual track',
      createdAt: now,
      updatedAt: now
    },
    items: [...batch.masks, ...batch.mutes, ...batch.skips]
  }
}
