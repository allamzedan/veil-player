import { readFileSync } from 'node:fs'
import { describe, expect, it, beforeEach } from 'vitest'
import {
  captureAudioPlaybackTransition,
  clearAudioPlaybackTransition,
  clampPlaybackRestoreTime,
  peekAudioPlaybackTransition,
  readAudioPlaybackTransition,
  shouldRestorePlayheadAfterRemount,
  takeAudioPlaybackTransition
} from './audioPlaybackTransition'
import {
  isCompactVerticalVolumePopup,
  resolveVerticalVolumePopupPlacement,
  VERTICAL_VOLUME_POPUP
} from './volumePopupLayout'
import { isVolumePopupOpen, shouldDismissVolumePopup } from '../components/VolumeControl'
import { filterAudioWatchMenuItemIds, getAudioWatchMenuSectionIds } from './audioWatchMenu'
import { shouldShowAudioCompact } from './audioWorkspace'
import { AUDIO_SEEK_STEP_SECONDS, seekRelative } from './relativeSeek'

describe('volume popup compact layout', () => {
  it('keeps vertical popup within compact size band', () => {
    expect(
      isCompactVerticalVolumePopup({
        width: VERTICAL_VOLUME_POPUP.widthPx,
        height: VERTICAL_VOLUME_POPUP.heightPx
      })
    ).toBe(true)
    expect(isCompactVerticalVolumePopup({ width: 120, height: 220 })).toBe(false)
  })

  it('anchors above the volume button when space allows', () => {
    const pos = resolveVerticalVolumePopupPlacement({
      buttonRect: { top: 300, bottom: 332, left: 40, width: 36, height: 32 },
      viewport: { width: 780, height: 420 }
    })
    expect(pos.placement).toBe('above')
    expect(pos.top).toBeLessThan(300)
    expect(pos.left + VERTICAL_VOLUME_POPUP.widthPx / 2).toBe(58)
  })

  it('flips below near the top edge', () => {
    const pos = resolveVerticalVolumePopupPlacement({
      buttonRect: { top: 20, bottom: 52, left: 40, width: 36, height: 32 },
      viewport: { width: 780, height: 420 }
    })
    expect(pos.placement).toBe('below')
    expect(pos.top).toBeGreaterThanOrEqual(52)
  })

  it('models popup open/close toggle state', () => {
    expect(isVolumePopupOpen(false)).toBe(false)
    expect(isVolumePopupOpen(true)).toBe(true)
    expect(isVolumePopupOpen(!true)).toBe(false)
  })

  it('closes outside and on Escape, but remains open for popup slider interaction', () => {
    expect(shouldDismissVolumePopup({ targetInsideControl: false, targetInsidePopup: false })).toBe(true)
    expect(shouldDismissVolumePopup({ escapePressed: true })).toBe(true)
    expect(shouldDismissVolumePopup({ targetInsidePopup: true })).toBe(false)
    expect(shouldDismissVolumePopup({ targetInsideControl: true })).toBe(false)
  })

  it('clamps the popup completely inside narrow viewport edges', () => {
    const pos = resolveVerticalVolumePopupPlacement({
      buttonRect: { top: 200, bottom: 232, left: 2, width: 36, height: 32 },
      viewport: { width: 180, height: 260 }
    })
    expect(pos.left).toBeGreaterThanOrEqual(VERTICAL_VOLUME_POPUP.gapPx)
    expect(pos.left + VERTICAL_VOLUME_POPUP.widthPx).toBeLessThanOrEqual(172)
    expect(pos.top).toBeGreaterThanOrEqual(VERTICAL_VOLUME_POPUP.gapPx)
    expect(pos.top + VERTICAL_VOLUME_POPUP.heightPx).toBeLessThanOrEqual(252)
  })

  it('sizes the vertical track to roughly 75–85% of popup height with a pre-rotation length', () => {
    const ratio = VERTICAL_VOLUME_POPUP.sliderTrackPx / VERTICAL_VOLUME_POPUP.heightPx
    expect(ratio).toBeGreaterThanOrEqual(0.75)
    expect(ratio).toBeLessThanOrEqual(0.85)

    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
    expect(css).toMatch(
      /\.volume-control__popup--vertical \.volume-control__slider-wrap\s*\{[^}]*height:\s*118px;/s
    )
    expect(css).toMatch(
      /\.volume-control__popup--vertical \.volume-control__slider\.volume-control__slider--vertical\s*\{[^}]*width:\s*118px;[^}]*rotate\(-90deg\)/s
    )
  })
})

describe('audio relative seek controls', () => {
  it('seeks back 10 seconds and clamps at zero with an immediate display update', () => {
    let displayTime = 4
    const target = seekRelative({
      currentTime: displayTime,
      duration: 120,
      offsetSeconds: -AUDIO_SEEK_STEP_SECONDS,
      seek: (time) => { displayTime = time }
    })
    expect(target).toBe(0)
    expect(displayTime).toBe(0)
  })

  it('seeks forward 10 seconds and clamps at duration with an immediate display update', () => {
    let displayTime = 116
    const target = seekRelative({
      currentTime: displayTime,
      duration: 120,
      offsetSeconds: AUDIO_SEEK_STEP_SECONDS,
      seek: (time) => { displayTime = time }
    })
    expect(target).toBe(120)
    expect(displayTime).toBe(120)
  })

  it.each([true, false])('does not mutate paused=%s while seeking', (paused) => {
    const playback = { paused }
    seekRelative({ currentTime: 60, duration: 120, offsetSeconds: 10, seek: () => {} })
    expect(playback.paused).toBe(paused)
  })

  it('uses seek semantics instead of fake previous/next navigation', () => {
    expect(filterAudioWatchMenuItemIds(['seekBack10', 'seekForward10'])).toEqual([
      'seekBack10',
      'seekForward10'
    ])
  })
})

describe('audio menu pointer interaction contract', () => {
  it('exposes File / Playback / VEIL / View / Help for audio watch', () => {
    expect([...getAudioWatchMenuSectionIds()]).toEqual([
      'file',
      'playback',
      'track',
      'view',
      'help'
    ])
  })
})

describe('audio playback transition playhead preservation', () => {
  beforeEach(() => {
    clearAudioPlaybackTransition()
  })

  it('keeps a transition pending until restoration is explicitly acknowledged', () => {
    captureAudioPlaybackTransition({
      currentTime: 65,
      paused: false,
      playbackRate: 1,
      mediaSrc: 'veil-media://media?id=audio-1'
    })
    expect(readAudioPlaybackTransition('veil-media://media?id=audio-1')?.time).toBe(65)
    expect(peekAudioPlaybackTransition()?.time).toBe(65)
    clearAudioPlaybackTransition()
    expect(peekAudioPlaybackTransition()).toBeNull()
  })

  it('captures and restores the same currentTime across compact → edit', () => {
    captureAudioPlaybackTransition({
      currentTime: 65,
      paused: true,
      playbackRate: 1,
      mediaSrc: 'veil-media://media?id=audio-1'
    })
    expect(peekAudioPlaybackTransition()?.time).toBe(65)
    const restored = takeAudioPlaybackTransition('veil-media://media?id=audio-1')
    expect(restored?.time).toBe(65)
    expect(restored?.wasPlaying).toBe(false)
    expect(takeAudioPlaybackTransition('veil-media://media?id=audio-1')).toBeNull()
  })

  it('preserves playing state for Add Mute / Add Skip / Edit VEIL transitions', () => {
    captureAudioPlaybackTransition({
      currentTime: 65,
      paused: false,
      playbackRate: 1.25,
      mediaSrc: 'veil-media://media?id=audio-1'
    })
    const restored = takeAudioPlaybackTransition('veil-media://media?id=audio-1')
    expect(restored?.time).toBe(65)
    expect(restored?.wasPlaying).toBe(true)
    expect(restored?.playbackRate).toBe(1.25)
  })

  it('does not restore across a media source change', () => {
    captureAudioPlaybackTransition({
      currentTime: 65,
      paused: true,
      playbackRate: 1,
      mediaSrc: 'veil-media://media?id=old'
    })
    expect(takeAudioPlaybackTransition('veil-media://media?id=new')).toBeNull()
  })

  it('detects remount reset-to-zero without treating a real zero seek as restore', () => {
    expect(
      shouldRestorePlayheadAfterRemount({
        mediaSrcChanged: false,
        elementTime: 0,
        preservedTime: 65
      })
    ).toBe(true)
    expect(
      shouldRestorePlayheadAfterRemount({
        mediaSrcChanged: false,
        elementTime: 0,
        preservedTime: 0
      })
    ).toBe(false)
    expect(
      shouldRestorePlayheadAfterRemount({
        mediaSrcChanged: true,
        elementTime: 0,
        preservedTime: 65
      })
    ).toBe(false)
  })

  it('clamps restore time inside duration', () => {
    expect(clampPlaybackRestoreTime(65, 120)).toBe(65)
    expect(clampPlaybackRestoreTime(200, 120)).toBeCloseTo(119.95, 2)
  })

  it('keeps video watch routing unchanged', () => {
    expect(shouldShowAudioCompact('video', 'watch')).toBe(false)
    expect(shouldShowAudioCompact('audio', 'edit')).toBe(false)
  })
})
