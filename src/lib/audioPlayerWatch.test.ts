import { describe, expect, it } from 'vitest'
import { canCreateMasks } from './audioMode'
import {
  isAudioOnlyMedia,
  shouldShowAudioCompact,
  shouldShowMediaWorkspace,
  shouldUseAudioWorkspaceLayout
} from './audioWorkspace'
import {
  AUDIO_WATCH_WINDOW,
  isNearVideoDefault,
  isWithinAudioWatchAcceptable,
  shouldApplyAudioWatchSize,
  VIDEO_DEFAULT_WINDOW
} from './audioWatchLayout'
import {
  audioWatchTitleBarHidesEditAndClose,
  audioWatchTitleBarHidesFilename,
  filterAudioWatchMenuItemIds,
  getAudioWatchMenuSectionIds,
  isAudioWatchHiddenItemId
} from './audioWatchMenu'
import { isVolumePopupOpen } from '../components/VolumeControl'

describe('audioWorkspace routing', () => {
  it('routes Audio Watch Mode to compact audio layout', () => {
    expect(shouldShowAudioCompact('audio', 'watch')).toBe(true)
  })

  it('keeps video watch on the video layout path', () => {
    expect(shouldShowAudioCompact('video', 'watch')).toBe(false)
    expect(shouldUseAudioWorkspaceLayout('video', 'edit')).toBe(false)
  })

  it('uses full audio editor workspace in edit mode', () => {
    expect(shouldShowAudioCompact('audio', 'edit')).toBe(false)
    expect(shouldUseAudioWorkspaceLayout('audio', 'edit')).toBe(true)
  })

  it('keeps masks unavailable for audio', () => {
    expect(canCreateMasks('audio')).toBe(false)
    expect(isAudioOnlyMedia('audio')).toBe(true)
  })

  it('returns to compact watch after leaving edit (Done path)', () => {
    expect(shouldShowAudioCompact('audio', 'watch')).toBe(true)
    expect(shouldShowMediaWorkspace('file:///a.mp3', true, false, 'watch')).toBe(true)
  })
})

describe('audio watch title bar / menu contract', () => {
  it('hides Edit VEIL and Close Media from the audio watch title bar', () => {
    expect(audioWatchTitleBarHidesEditAndClose()).toBe(true)
  })

  it('hides filename from the audio watch title bar', () => {
    expect(audioWatchTitleBarHidesFilename()).toBe(true)
  })

  it('uses a reduced one-row menu configuration', () => {
    expect([...getAudioWatchMenuSectionIds()]).toEqual([
      'file',
      'playback',
      'track',
      'view',
      'help'
    ])
    expect(getAudioWatchMenuSectionIds()).not.toContain('edit')
  })

  it('keeps Edit VEIL reachable from the VEIL menu item set', () => {
    const visible = filterAudioWatchMenuItemIds([
      'addMute',
      'addSkip',
      'addBookmark',
      'editVeil',
      'loadTrack',
      'saveTrack',
      'closeTrack',
      'trackInfo',
      'addMask',
      'fullscreen'
    ])
    expect(visible).toContain('editVeil')
    expect(visible).toContain('addMute')
    expect(visible).toContain('addSkip')
    expect(visible).toContain('addBookmark')
    expect(visible).not.toContain('addMask')
    expect(visible).not.toContain('fullscreen')
    expect(isAudioWatchHiddenItemId('addMask')).toBe(true)
  })

  it('does not intentionally wrap title/menu into two rows', () => {
    expect(getAudioWatchMenuSectionIds().length).toBeLessThanOrEqual(5)
    expect(getAudioWatchMenuSectionIds()).not.toContain('edit')
  })
})

describe('audio watch window layout', () => {
  it('targets compact desktop-player proportions', () => {
    expect(AUDIO_WATCH_WINDOW.width).toBe(780)
    expect(AUDIO_WATCH_WINDOW.height).toBe(420)
    expect(AUDIO_WATCH_WINDOW.minWidth).toBe(720)
    expect(AUDIO_WATCH_WINDOW.minHeight).toBe(390)
  })

  it('avoids overriding an already-acceptable audio size', () => {
    expect(isWithinAudioWatchAcceptable({ width: 760, height: 410 })).toBe(true)
    expect(shouldApplyAudioWatchSize({ width: 760, height: 410 })).toBe(false)
  })

  it('applies compact size when leaving video defaults', () => {
    expect(isNearVideoDefault(VIDEO_DEFAULT_WINDOW)).toBe(true)
    expect(shouldApplyAudioWatchSize(VIDEO_DEFAULT_WINDOW)).toBe(true)
  })
})

describe('audio transport controls contract', () => {
  it('exposes previous/next and VEIL action labels via menu/i18n keys used by the dock', () => {
    expect(filterAudioWatchMenuItemIds(['previous', 'next', 'addMute', 'addSkip', 'addBookmark'])).toEqual([
      'previous',
      'next',
      'addMute',
      'addSkip',
      'addBookmark'
    ])
  })

  it('models vertical volume popup open/close state', () => {
    expect(isVolumePopupOpen(true)).toBe(true)
    expect(isVolumePopupOpen(false)).toBe(false)
  })

  it('keeps previous/next disabled placeholders for single-file audio', () => {
    expect(filterAudioWatchMenuItemIds(['previous', 'next'])).toEqual(['previous', 'next'])
  })
})
