import { APP_VERSION } from './appVersion'

/** Public version metadata only — no telemetry or user data is sent. */
export const UPDATE_CHECK_URL =
  'https://raw.githubusercontent.com/allamzedan/veil-player/main/update.json'

const LAST_CHECK_KEY = 'veil:lastUpdateCheckAt'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 8000

export interface UpdateInfo {
  version: string
  title: string
  notes: string[]
  url: string
}

export type UpdateCheckResult =
  | { ok: true; updateAvailable: false }
  | { ok: true; updateAvailable: true; info: UpdateInfo }
  | { ok: false; error: string }

export function getAppVersion(): string {
  return APP_VERSION
}

/** Parse "0.6.0" / "v1.2.3-rc.1" into numeric segments for comparison. */
export function parseVersionSegments(version: string): number[] {
  const core = version.trim().replace(/^v/i, '').split('-')[0] ?? ''
  const parts = core.split('.')
  const segments: number[] = []

  for (const part of parts) {
    const match = /^(\d+)/.exec(part)
    if (!match) {
      break
    }
    segments.push(Number.parseInt(match[1], 10))
  }

  return segments.length > 0 ? segments : [0]
}

/** Negative if a < b, positive if a > b, zero if equal. */
export function compareVersionStrings(a: string, b: string): number {
  const left = parseVersionSegments(a)
  const right = parseVersionSegments(b)
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const lv = left[index] ?? 0
    const rv = right[index] ?? 0
    if (lv !== rv) {
      return lv < rv ? -1 : 1
    }
  }

  return 0
}

export function isRemoteVersionNewer(remote: string, current: string): boolean {
  return compareVersionStrings(remote, current) > 0
}

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export function parseUpdateMetadata(data: unknown): UpdateInfo | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const record = data as Record<string, unknown>
  const version = typeof record.version === 'string' ? record.version.trim() : ''
  const title =
    typeof record.title === 'string' && record.title.trim().length > 0
      ? record.title.trim()
      : version
        ? `VEIL Player ${version} is available`
        : ''
  const url = typeof record.url === 'string' ? record.url.trim() : ''

  if (!version || !title || !url || !isHttpsUrl(url)) {
    return null
  }

  const notes = Array.isArray(record.notes)
    ? record.notes.filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
    : []

  return { version, title, notes, url }
}

export function readLastUpdateCheckAt(): number | null {
  try {
    const raw = localStorage.getItem(LAST_CHECK_KEY)
    if (!raw) {
      return null
    }
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function writeLastUpdateCheckAt(timestampMs: number): void {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(timestampMs))
  } catch {
    // ignore storage failures
  }
}

export function shouldRunAutomaticUpdateCheck(nowMs = Date.now()): boolean {
  const last = readLastUpdateCheckAt()
  if (last === null) {
    return true
  }
  return nowMs - last >= CHECK_INTERVAL_MS
}

async function fetchUpdateMetadata(): Promise<unknown> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(UPDATE_CHECK_URL, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })

    if (!response.ok) {
      throw new Error(`http_${response.status}`)
    }

    return await response.json()
  } finally {
    window.clearTimeout(timeoutId)
  }
}

/**
 * Downloads public version metadata from UPDATE_CHECK_URL and compares to APP_VERSION.
 * Never throws — failures return { ok: false }.
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const payload = await fetchUpdateMetadata()
    const info = parseUpdateMetadata(payload)

    if (!info) {
      return { ok: false, error: 'invalid_metadata' }
    }

    if (!isRemoteVersionNewer(info.version, getAppVersion())) {
      return { ok: true, updateAvailable: false }
    }

    return { ok: true, updateAvailable: true, info }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    return { ok: false, error: message }
  }
}

export async function openReleaseUrl(url: string): Promise<boolean> {
  if (!isHttpsUrl(url)) {
    return false
  }

  if (window.veil?.openExternalUrl) {
    const result = await window.veil.openExternalUrl(url)
    return result.ok
  }

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}
