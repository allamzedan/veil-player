import { describe, expect, it } from 'vitest'
import {
  APPROVED_MEDIA_EXTENSIONS,
  AUDIO_EXTENSIONS,
  inferMediaKindFromFileName,
  isApprovedMediaExtension,
  VIDEO_EXTENSIONS
} from './mediaKind'
import {
  APPROVED_AUDIO_EXTENSIONS as IPC_AUDIO_EXTENSIONS,
  APPROVED_MEDIA_EXTENSIONS as IPC_MEDIA_EXTENSIONS,
  APPROVED_VIDEO_EXTENSIONS as IPC_VIDEO_EXTENSIONS
} from '../../electron/ipc/approvedMedia'

/** MIME map keys in electron/lib/mediaRangeResponse.ts (must stay aligned). */
const MIME_MAP_EXTENSIONS = [
  'aac',
  'avi',
  'flac',
  'm4a',
  'm4v',
  'mkv',
  'mov',
  'mp3',
  'mp4',
  'ogg',
  'ogv',
  'wav',
  'webm'
] as const

const UNSUPPORTED_EXTENSIONS = ['ts', 'mpeg', 'mpg', '3gp', 'vob', 'wmv', 'flv', 'txt'] as const

describe('media allowlist consistency', () => {
  it('keeps renderer and main-process extension lists aligned', () => {
    expect([...IPC_MEDIA_EXTENSIONS]).toEqual([...APPROVED_MEDIA_EXTENSIONS])
    expect([...IPC_VIDEO_EXTENSIONS]).toEqual([...VIDEO_EXTENSIONS])
    expect([...IPC_AUDIO_EXTENSIONS]).toEqual([...AUDIO_EXTENSIONS])
  })

  it('maps every approved extension to a veil-media MIME entry', () => {
    for (const ext of APPROVED_MEDIA_EXTENSIONS) {
      expect(MIME_MAP_EXTENSIONS).toContain(ext)
    }
  })

  it('does not map MIME entries for unapproved extensions', () => {
    const approvedSet = new Set<string>(APPROVED_MEDIA_EXTENSIONS)
    for (const ext of MIME_MAP_EXTENSIONS) {
      expect(approvedSet.has(ext)).toBe(true)
    }
  })

  it('classifies known video and audio extensions', () => {
    for (const ext of VIDEO_EXTENSIONS) {
      expect(inferMediaKindFromFileName(`clip.${ext}`)).toBe('video')
      expect(isApprovedMediaExtension(ext)).toBe(true)
    }
    for (const ext of AUDIO_EXTENSIONS) {
      expect(inferMediaKindFromFileName(`track.${ext}`)).toBe('audio')
      expect(isApprovedMediaExtension(ext)).toBe(true)
    }
  })

  it('rejects common unsupported container extensions', () => {
    for (const ext of UNSUPPORTED_EXTENSIONS) {
      expect(isApprovedMediaExtension(ext)).toBe(false)
      expect(inferMediaKindFromFileName(`sample.${ext}`)).toBeNull()
    }
  })
})
