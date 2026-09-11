import { randomUUID } from 'node:crypto'
import { extname, isAbsolute, normalize } from 'node:path'
import { ipcMain } from 'electron'
import {
  APPROVED_MEDIA_EXTENSIONS,
  AUDIO_EXTENSIONS,
  VIDEO_EXTENSIONS
} from '../../src/lib/mediaKind'

/** Allowed video extensions (no leading dot) — dialog filters should stay aligned. */
export const APPROVED_VIDEO_EXTENSIONS = [...VIDEO_EXTENSIONS] as const

/** Allowed audio extensions (no leading dot). */
export const APPROVED_AUDIO_EXTENSIONS = [...AUDIO_EXTENSIONS] as const

export { APPROVED_MEDIA_EXTENSIONS }

const ALLOWED_EXT_WITH_DOT = new Set(
  APPROVED_MEDIA_EXTENSIONS.map((ext) => `.${ext}`)
)

const approvedNormalizedPathsByMediaId = new Map<string, string>()

/** Hostname segment for privileged local media URLs (renderer receives only mediaUrl). */
export const PRIVILEGED_VEIL_MEDIA_HOSTNAME = 'local' as const

/** Main-owned URL handed to the renderer after native open + allowlist registration. */
export function buildPrivilegedVeilMediaUrl(mediaId: string): string {
  return `veil-media://${PRIVILEGED_VEIL_MEDIA_HOSTNAME}/${encodeURIComponent(mediaId)}`
}

function assertRegisterableApprovedPath(absolutePath: string): string {
  if (!isAbsolute(absolutePath)) {
    throw new Error('Approved media path must be absolute')
  }

  const normalizedPath = normalize(absolutePath)

  const ext = extname(normalizedPath).toLowerCase()
  if (!ALLOWED_EXT_WITH_DOT.has(ext)) {
    throw new Error(`Approved media must use a supported media extension, received "${ext || '(none)'}"`)
  }

  return normalizedPath
}

/**
 * Register a filesystem path approved via a trusted path (native dialog).
 * Never expose the absolute path to the renderer.
 */
export function registerApprovedMediaPath(absolutePath: string): string {
  const normalizedPath = assertRegisterableApprovedPath(absolutePath)
  const mediaId = randomUUID()
  approvedNormalizedPathsByMediaId.set(mediaId, normalizedPath)
  return mediaId
}

export function getApprovedAbsolutePath(mediaId: string): string | null {
  const path = approvedNormalizedPathsByMediaId.get(mediaId)
  return path ?? null
}

export function releaseApprovedMedia(mediaId: string): void {
  approvedNormalizedPathsByMediaId.delete(mediaId)
}

export function registerApprovedMediaHandlers(): void {
  ipcMain.removeHandler('media:release')

  ipcMain.handle('media:release', (_, mediaId: unknown) => {
    if (typeof mediaId !== 'string' || mediaId.length === 0) {
      return { ok: false as const }
    }
    releaseApprovedMedia(mediaId)
    return { ok: true as const }
  })
}
