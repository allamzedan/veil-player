import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initI18n, getLanguage, setLanguage } from '../i18n'
import { readShowStatusBar } from './appChromePreferences'
import { DEFAULT_AUDIO_VIEW_MODE, readAudioViewMode } from './audioViewPreferences'
import { readFirstRunComplete } from './firstRunSession'
import {
  DEFAULT_MOTION_PREFERENCES,
  readMotionPreferences
} from './motionPreferences'
import {
  DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES,
  readPlaybackActivityPreferences
} from './playbackActivityPreferences'
import { readSidebarCollapsed, readTimelineVisible } from './playerChromePreferences'
import { DEFAULT_SHORTCUT_BINDINGS, getBinding, setBindingOverride } from './shortcutBindings'
import {
  DEFAULT_SUBTITLE_PRESENTATION,
  readSubtitlePresentation
} from './subtitlePresentationPreferences'
import { readUiRefreshV1 } from './uiRefreshV1'

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(entries))
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: (key) => { values.delete(key) },
    key: (index) => Array.from(values.keys())[index] ?? null
  }
}

describe('preference and first-run recovery', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  it('starts cleanly with empty userData and established defaults', () => {
    expect(() => initI18n()).not.toThrow()
    expect(getLanguage()).toBe('en')
    expect(readShowStatusBar()).toBe(false)
    expect(readAudioViewMode()).toBe(DEFAULT_AUDIO_VIEW_MODE)
    expect(readFirstRunComplete()).toBe(false)
    expect(readMotionPreferences()).toEqual(DEFAULT_MOTION_PREFERENCES)
    expect(readPlaybackActivityPreferences()).toEqual(DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES)
    expect(readSidebarCollapsed()).toBe(false)
    expect(readTimelineVisible()).toBe(true)
    expect(getBinding('playPause')).toBe(DEFAULT_SHORTCUT_BINDINGS.playPause.trim().toLowerCase())
    expect(readSubtitlePresentation()).toEqual(DEFAULT_SUBTITLE_PRESENTATION)
    expect(readUiRefreshV1()).toBe(true)
  })

  it('uses validated fallbacks for malformed JSON and invalid individual values', () => {
    vi.stubGlobal('localStorage', memoryStorage({
      'veil:language': 'invalid-language',
      'veil:motionPreferences': '{ malformed',
      'veil:playbackActivityPreferences:v1': JSON.stringify({
        showFullscreenVeilRail: 'yes',
        defaultMaskDurationSeconds: 'invalid'
      }),
      'veil:shortcutOverrides': JSON.stringify({
        playPause: 42,
        addMask: '  CTRL+M  ',
        unknownAction: 'x'
      }),
      'veil:subtitlePresentation': JSON.stringify({
        fontScale: 'invalid',
        textColor: 'red',
        fontFamily: 'comic-sans'
      })
    }))

    expect(() => initI18n()).not.toThrow()
    expect(getLanguage()).toBe('en')
    expect(readMotionPreferences()).toEqual(DEFAULT_MOTION_PREFERENCES)
    expect(readPlaybackActivityPreferences()).toEqual(DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES)
    expect(getBinding('playPause')).toBe(DEFAULT_SHORTCUT_BINDINGS.playPause.trim().toLowerCase())
    expect(getBinding('addMask')).toBe('ctrl+m')
    expect(readSubtitlePresentation()).toEqual(DEFAULT_SUBTITLE_PRESENTATION)
  })

  it('does not crash when preference storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('storage unavailable') },
      setItem: () => { throw new Error('storage unavailable') }
    })

    expect(() => initI18n()).not.toThrow()
    expect(getLanguage()).toBe('en')
    expect(() => setLanguage('fr')).not.toThrow()
    expect(() => setBindingOverride('addMask', 'ctrl+m')).not.toThrow()
    expect(getBinding('addMask')).toBe('m')
    expect(readMotionPreferences()).toEqual(DEFAULT_MOTION_PREFERENCES)
    expect(readPlaybackActivityPreferences()).toEqual(DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES)
    expect(readSubtitlePresentation()).toEqual(DEFAULT_SUBTITLE_PRESENTATION)
  })
})
