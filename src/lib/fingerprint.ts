import { isUnboundTrackVideo } from './unboundTrack'
import type { VideoFingerprint } from '../types/track'
import type { VideoMetadata } from '../state/useVeilStore'

export const DURATION_MISMATCH_TOLERANCE_SECONDS = 0.5

export interface FingerprintMismatch {
  field: string
  message: string
}

export function normalizeDurationSeconds(duration: number): number {
  if (!Number.isFinite(duration)) {
    return 0
  }
  return Math.round(duration * 1000) / 1000
}

export function canonicalFiniteDecimal(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Expected a finite number')
  if (Object.is(value, -0)) return '0'
  const rendered = String(value)
  if (!/[eE]/.test(rendered)) return rendered
  const [coefficient, exponentText] = rendered.toLowerCase().split('e')
  const exponent = Number(exponentText)
  const negative = coefficient.startsWith('-')
  const unsigned = coefficient.replace('-', '')
  const digits = unsigned.replace('.', '')
  const point = unsigned.indexOf('.')
  const integerDigits = point < 0 ? digits.length : point
  const target = integerDigits + exponent
  const magnitude = target <= 0 ? `0.${'0'.repeat(-target)}${digits}` : target >= digits.length ? `${digits}${'0'.repeat(target-digits.length)}` : `${digits.slice(0,target)}.${digits.slice(target)}`
  return negative ? `-${magnitude}` : magnitude
}

export function durationToken(duration: number): string {
  if (!Number.isFinite(duration)) throw new Error('Expected a finite duration')
  const milliseconds = Math.floor(duration * 1000 + 0.5)
  const negative = milliseconds < 0
  const absolute = Math.abs(milliseconds)
  return `${negative ? '-' : ''}${Math.floor(absolute/1000)}.${String(absolute%1000).padStart(3,'0')}`
}

export function normalizeFileSizeToken(fileSize: number | null): string {
  if (fileSize === null) return 'null'
  return canonicalFiniteDecimal(fileSize)
}

export function buildMetadataFingerprint(
  fileName: string,
  metadata: VideoMetadata
): VideoFingerprint {
  const fileSizeToken = normalizeFileSizeToken(metadata.fileSize)
  const value = [
    fileName,
    fileSizeToken,
    durationToken(metadata.duration),
    canonicalFiniteDecimal(metadata.width),
    canonicalFiniteDecimal(metadata.height)
  ].join('|')

  return {
    method: 'metadata-v1',
    value
  }
}

export interface TrackVideoSnapshot {
  binding?: 'metadata' | 'unbound'
  name: string
  duration: number
  fileSize: number | null
  resolution: { width: number; height: number }
  fingerprint: VideoFingerprint
}

export function compareTrackVideoToCurrent(
  trackVideo: TrackVideoSnapshot | null | undefined,
  fileName: string,
  metadata: VideoMetadata
): FingerprintMismatch[] {
  if (!trackVideo) {
    return []
  }

  if (isUnboundTrackVideo(trackVideo)) {
    return [
      {
        field: 'binding',
        message:
          'This track was created without source video metadata. Timings will be applied as-is.'
      }
    ]
  }

  const mismatches: FingerprintMismatch[] = []
  const currentFingerprint = buildMetadataFingerprint(fileName, metadata)

  if (trackVideo.name !== fileName) {
    mismatches.push({
      field: 'name',
      message: `Filename differs (track: "${trackVideo.name}", current: "${fileName}")`
    })
  }

  const trackSize = normalizeFileSizeToken(trackVideo.fileSize)
  const currentSize = normalizeFileSizeToken(metadata.fileSize)
  if (trackSize !== currentSize) {
    mismatches.push({
      field: 'fileSize',
      message: `File size differs (track: ${trackSize}, current: ${currentSize})`
    })
  }

  const trackDuration = normalizeDurationSeconds(trackVideo.duration)
  const currentDuration = normalizeDurationSeconds(metadata.duration)
  if (Math.abs(trackDuration - currentDuration) > DURATION_MISMATCH_TOLERANCE_SECONDS) {
    mismatches.push({
      field: 'duration',
      message: `Duration differs (track: ${trackDuration}s, current: ${currentDuration}s)`
    })
  }

  if (
    trackVideo.resolution.width !== metadata.width ||
    trackVideo.resolution.height !== metadata.height
  ) {
    const trackIsAudio =
      trackVideo.resolution.width === 0 && trackVideo.resolution.height === 0
    const currentIsAudio = metadata.width === 0 && metadata.height === 0
    if (!(trackIsAudio && currentIsAudio)) {
      mismatches.push({
        field: 'resolution',
        message: `Resolution differs (track: ${trackVideo.resolution.width}x${trackVideo.resolution.height}, current: ${metadata.width}x${metadata.height})`
      })
    }
  }

  if (trackVideo.fingerprint.value !== currentFingerprint.value) {
    mismatches.push({
      field: 'fingerprint',
      message: 'Metadata fingerprint differs'
    })
  }

  return mismatches
}

export function formatFingerprintMismatchPrompt(mismatches: FingerprintMismatch[]): string {
  const lines = mismatches.map((m) => `- ${m.message}`)
  return [
    'This track was saved for a different video.',
    '',
    ...lines,
    '',
    'Load masks anyway?'
  ].join('\n')
}
