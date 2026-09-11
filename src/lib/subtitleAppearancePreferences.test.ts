import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SUBTITLE_PRESENTATION,
  normalizeSubtitlePresentation,
  readSubtitlePresentation,
  writeSubtitlePresentation
} from './subtitlePresentationPreferences'

const stored = new Map<string, string>()

beforeEach(() => {
  stored.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value)
  })
  vi.stubGlobal('window', { dispatchEvent: vi.fn() })
})

afterEach(() => vi.unstubAllGlobals())

describe('subtitle appearance preferences', () => {
  it('preserves existing rendering defaults and adds appearance-only defaults', () => {
    expect(DEFAULT_SUBTITLE_PRESENTATION).toEqual({
      fontScale: 1,
      textOpacity: 1,
      shadowStrength: 0.65,
      bottomOffsetPercent: 12,
      textColor: '#ffffff',
      backgroundMode: 'off',
      backgroundColor: '#000000',
      backgroundOpacity: 0.65,
      fontFamily: 'default'
    })
    expect(normalizeSubtitlePresentation({ fontScale: 1.2, textOpacity: 0.8 })).toMatchObject({
      fontScale: 1.2,
      textOpacity: 0.8,
      backgroundMode: 'off',
      fontFamily: 'default'
    })
  })

  it('persists text, box, opacity, and constrained font choices without a schema migration', () => {
    const preferences = {
      ...DEFAULT_SUBTITLE_PRESENTATION,
      textColor: '#12ABef',
      backgroundMode: 'box' as const,
      backgroundColor: '#234567',
      backgroundOpacity: 0.4,
      fontFamily: 'serif' as const
    }
    writeSubtitlePresentation(preferences)
    expect(readSubtitlePresentation()).toEqual({ ...preferences, textColor: '#12abef' })
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1)
  })

  it('rejects unsafe colors and unconstrained font families and clamps opacity', () => {
    expect(normalizeSubtitlePresentation({
      textColor: 'red; background:url(x)',
      backgroundColor: '#xyzxyz',
      backgroundOpacity: 4,
      fontFamily: 'Comic Sans' as never
    })).toMatchObject({
      textColor: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 1,
      fontFamily: 'default'
    })
  })
})
