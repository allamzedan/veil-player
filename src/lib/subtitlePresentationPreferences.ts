export type SubtitleBackgroundMode = 'off' | 'box'
export type SubtitleFontFamily = 'default' | 'sans-serif' | 'serif' | 'monospace'

export interface SubtitlePresentationPreferences {
  fontScale: number
  textOpacity: number
  shadowStrength: number
  bottomOffsetPercent: number
  textColor: string
  backgroundMode: SubtitleBackgroundMode
  backgroundColor: string
  backgroundOpacity: number
  fontFamily: SubtitleFontFamily
}

const STORAGE_KEY = 'veil:subtitlePresentation'
export const SUBTITLE_PRESENTATION_EVENT = 'veil:subtitle-presentation'

const CSS_HEX_COLOR = /^#[0-9a-f]{6}$/i
const FONT_FAMILIES = new Set<SubtitleFontFamily>(['default', 'sans-serif', 'serif', 'monospace'])
export const DEFAULT_SUBTITLE_PRESENTATION: SubtitlePresentationPreferences = {
  fontScale: 1,
  textOpacity: 1,
  shadowStrength: 0.65,
  bottomOffsetPercent: 12,
  textColor: '#ffffff',
  backgroundMode: 'off',
  backgroundColor: '#000000',
  backgroundOpacity: 0.65,
  fontFamily: 'default'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && CSS_HEX_COLOR.test(value) ? value.toLowerCase() : fallback
}
export function normalizeSubtitlePresentation(
  parsed: Partial<SubtitlePresentationPreferences>
): SubtitlePresentationPreferences {
  const backgroundMode = parsed.backgroundMode === 'box' ? 'box' : 'off'
  const fontFamily = FONT_FAMILIES.has(parsed.fontFamily as SubtitleFontFamily)
    ? parsed.fontFamily as SubtitleFontFamily
    : 'default'
  return {
    fontScale: clamp(finiteNumber(parsed.fontScale, 1), 0.8, 1.4),
    textOpacity: clamp(finiteNumber(parsed.textOpacity, 1), 0.5, 1),
    shadowStrength: clamp(finiteNumber(parsed.shadowStrength, 0.65), 0, 1),
    bottomOffsetPercent: clamp(finiteNumber(parsed.bottomOffsetPercent, 12), 4, 24),
    textColor: color(parsed.textColor, DEFAULT_SUBTITLE_PRESENTATION.textColor),
    backgroundMode,
    backgroundColor: color(parsed.backgroundColor, DEFAULT_SUBTITLE_PRESENTATION.backgroundColor),
    backgroundOpacity: clamp(finiteNumber(parsed.backgroundOpacity, 0.65), 0, 1),
    fontFamily
  }
}

export function readSubtitlePresentation(): SubtitlePresentationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_SUBTITLE_PRESENTATION }
    }
    const parsed = JSON.parse(raw) as Partial<SubtitlePresentationPreferences>
    return normalizeSubtitlePresentation(parsed)
  } catch {
    return { ...DEFAULT_SUBTITLE_PRESENTATION }
  }
}

export function writeSubtitlePresentation(prefs: SubtitlePresentationPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    window.dispatchEvent(new Event(SUBTITLE_PRESENTATION_EVENT))
  } catch {
    // ignore
  }
}

export function subscribeSubtitlePresentation(onChange: () => void): () => void {
  const handler = (): void => onChange()
  window.addEventListener(SUBTITLE_PRESENTATION_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(SUBTITLE_PRESENTATION_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
