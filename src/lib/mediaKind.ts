export type MediaKind = 'video' | 'audio'

export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv'] as const
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'] as const

export const APPROVED_MEDIA_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS] as const

const VIDEO_EXT_SET = new Set<string>(VIDEO_EXTENSIONS)
const AUDIO_EXT_SET = new Set<string>(AUDIO_EXTENSIONS)

export function extensionFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0 || dot === fileName.length - 1) {
    return ''
  }
  return fileName.slice(dot + 1).toLowerCase()
}

export function inferMediaKindFromFileName(fileName: string): MediaKind | null {
  const ext = extensionFromFileName(fileName)
  if (AUDIO_EXT_SET.has(ext)) {
    return 'audio'
  }
  if (VIDEO_EXT_SET.has(ext)) {
    return 'video'
  }
  return null
}

export function inferMediaKindFromMime(mime: string): MediaKind | null {
  const normalized = mime.trim().toLowerCase()
  if (normalized.startsWith('audio/')) {
    return 'audio'
  }
  if (normalized.startsWith('video/')) {
    return 'video'
  }
  return null
}

export function isApprovedMediaExtension(ext: string): boolean {
  const normalized = ext.replace(/^\./, '').toLowerCase()
  return VIDEO_EXT_SET.has(normalized) || AUDIO_EXT_SET.has(normalized)
}

export function isAudioMediaKind(kind: MediaKind | null | undefined): boolean {
  return kind === 'audio'
}

export function isVideoMediaKind(kind: MediaKind | null | undefined): boolean {
  return kind === 'video'
}

export function visualMaskFeaturesEnabled(kind: MediaKind | null | undefined): boolean {
  return kind !== 'audio'
}

export function acceptsBrowserMediaMime(mime: string): boolean {
  return inferMediaKindFromMime(mime) !== null
}

export function isZeroResolution(width: number, height: number): boolean {
  return width === 0 && height === 0
}
