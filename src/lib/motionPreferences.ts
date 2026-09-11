export interface MotionPreferences {
  reduceMotion: boolean
  disableBlurEffects: boolean
  disableTransitions: boolean
}

const STORAGE_KEY = 'veil:motionPreferences'
export const MOTION_PREFERENCES_EVENT = 'veil:motion-preferences'

function systemPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const DEFAULT_MOTION_PREFERENCES: MotionPreferences = {
  reduceMotion: systemPrefersReducedMotion(),
  disableBlurEffects: false,
  disableTransitions: false
}

export function readMotionPreferences(): MotionPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_MOTION_PREFERENCES, reduceMotion: systemPrefersReducedMotion() }
    }
    const parsed = JSON.parse(raw) as Partial<MotionPreferences>
    return {
      reduceMotion: parsed.reduceMotion === true,
      disableBlurEffects: parsed.disableBlurEffects === true,
      disableTransitions: parsed.disableTransitions === true
    }
  } catch {
    return { ...DEFAULT_MOTION_PREFERENCES }
  }
}

export function writeMotionPreferences(prefs: MotionPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    window.dispatchEvent(new Event(MOTION_PREFERENCES_EVENT))
  } catch {
    // ignore
  }
}

export function shouldAnimateTransitions(prefs: MotionPreferences = readMotionPreferences()): boolean {
  return !prefs.disableTransitions && !prefs.reduceMotion
}

export function shouldUseBlurEffects(prefs: MotionPreferences = readMotionPreferences()): boolean {
  return !prefs.disableBlurEffects && shouldAnimateTransitions(prefs)
}

export function subscribeMotionPreferences(onChange: () => void): () => void {
  const handler = (): void => onChange()
  window.addEventListener(MOTION_PREFERENCES_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(MOTION_PREFERENCES_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
