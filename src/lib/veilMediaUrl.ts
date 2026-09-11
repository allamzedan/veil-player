/**
 * Parses privileged veil-media URLs for the approved local host + path segment.
 * Must stay in sync with electron/main.ts and electron/ipc/approvedMedia.ts.
 */

const PRIVILEGED_VEIL_MEDIA_HOSTNAME = 'local'

export function parseVeilApprovedMediaId(src: string | null): string | null {
  if (!src) {
    return null
  }

  try {
    const url = new URL(src)
    if (url.protocol !== 'veil-media:') {
      return null
    }
    if (url.hostname !== PRIVILEGED_VEIL_MEDIA_HOSTNAME) {
      return null
    }

    const pathOnly = url.pathname.replace(/^\/+/, '')
    const segments = pathOnly.split('/').filter((s) => s.length > 0)
    if (segments.length !== 1) {
      return null
    }

    const id = decodeURIComponent(segments[0])
    return id.length > 0 ? id : null
  } catch {
    return null
  }
}
