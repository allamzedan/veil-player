const STORAGE_KEY = 'veil:recentMaskColors'
const MAX_RECENT = 6
const FALLBACK_MASK_COLOR = '#000000'

const HEX6 = /^#([0-9a-f]{6})$/i
const HEX3 = /^#([0-9a-f]{3})$/i

export function normalizeMaskColor(color: string): string | null {
  const trimmed = color.trim()
  if (!trimmed) {
    return null
  }

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  const hex6 = withHash.match(HEX6)
  if (hex6) {
    return `#${hex6[1].toLowerCase()}`
  }

  const hex3 = withHash.match(HEX3)
  if (hex3) {
    const [r, g, b] = hex3[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }

  return null
}

export function getRecentMaskColors(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    const seen = new Set<string>()
    const colors: string[] = []

    for (const entry of parsed) {
      if (typeof entry !== 'string') {
        continue
      }
      const normalized = normalizeMaskColor(entry)
      if (!normalized || seen.has(normalized)) {
        continue
      }
      seen.add(normalized)
      colors.push(normalized)
      if (colors.length >= MAX_RECENT) {
        break
      }
    }

    return colors
  } catch {
    return []
  }
}

export function addRecentMaskColor(color: string): void {
  const normalized = normalizeMaskColor(color)
  if (!normalized) {
    return
  }

  const next = [
    normalized,
    ...getRecentMaskColors().filter((entry) => entry !== normalized)
  ].slice(0, MAX_RECENT)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function getDefaultMaskColor(): string {
  return getRecentMaskColors()[0] ?? FALLBACK_MASK_COLOR
}
