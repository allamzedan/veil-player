const HIDDEN_GROUPS_KEY = 'veil:hidden-groups'
const SOLO_GROUP_KEY = 'veil:solo-group'
const COLLAPSED_GROUPS_KEY = 'veil:collapsed-groups'

function storageKey(fingerprint: string, suffix: string): string {
  return `${suffix}:${fingerprint}`
}

export function readHiddenGroupIds(fingerprint: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(storageKey(fingerprint, HIDDEN_GROUPS_KEY))
    if (!raw) {
      return new Set()
    }
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function writeHiddenGroupIds(fingerprint: string, ids: Set<string>): void {
  sessionStorage.setItem(storageKey(fingerprint, HIDDEN_GROUPS_KEY), JSON.stringify([...ids]))
}

export function readSoloGroupId(fingerprint: string): string | null {
  return sessionStorage.getItem(storageKey(fingerprint, SOLO_GROUP_KEY))
}

export function writeSoloGroupId(fingerprint: string, groupId: string | null): void {
  const key = storageKey(fingerprint, SOLO_GROUP_KEY)
  if (groupId === null) {
    sessionStorage.removeItem(key)
    return
  }
  sessionStorage.setItem(key, groupId)
}

export function readCollapsedGroupIds(fingerprint: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(storageKey(fingerprint, COLLAPSED_GROUPS_KEY))
    if (!raw) {
      return new Set()
    }
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function writeCollapsedGroupIds(fingerprint: string, ids: Set<string>): void {
  sessionStorage.setItem(storageKey(fingerprint, COLLAPSED_GROUPS_KEY), JSON.stringify([...ids]))
}

export function buildTrackSessionFingerprint(fileName: string | null, duration: number): string {
  return `${fileName ?? 'none'}|${Math.round(duration * 1000)}`
}
