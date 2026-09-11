import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVeilStore } from '../state/useVeilStore'
import { bindLocalMediaClock } from '../playback/localMediaClock'
import { shouldHideFullscreenCursor } from './fullscreenCursorLifecycle'
import {
  isInteractiveOverlayOpen,
  registerInteractiveOverlay,
  resetInteractiveOverlaysForTests,
  subscribeInteractiveOverlay
} from './interactiveOverlay'
import {
  isBlankSeekableTimelineTarget,
  isBlankTimelineDeselectionTarget,
  shouldClearBlankTimelineSelection,
  shouldCompleteBlankTimelineDoubleClick
} from './timelineBlankSelection'
import { clearTimelineSelection } from './timelineSelection'
import {
  responsiveSubtitleFontSize,
  SUBTITLE_RENDERED_MAX_PX,
  SUBTITLE_RENDERED_MIN_PX
} from './subtitleResponsiveSize'

function targetWithClosest(matches: readonly string[]): EventTarget {
  return {
    closest: (selectors: string) => matches.some((match) => selectors.includes(match))
      ? { className: matches.join(' ') }
      : null
  } as unknown as EventTarget
}

class FakeMedia extends EventTarget {
  currentTime = 0
  duration = 120
  paused = true
  ended = false
}

describe('fullscreen interactive overlay cursor lifecycle', () => {
  beforeEach(() => resetInteractiveOverlaysForTests())

  it('keeps the cursor visible while any modal is open and resumes hiding after the final close', () => {
    const changes: boolean[] = []
    const unsubscribe = subscribeInteractiveOverlay(() => changes.push(isInteractiveOverlayOpen()))
    const closeSheet = registerInteractiveOverlay()
    const closeSettings = registerInteractiveOverlay()

    expect(shouldHideFullscreenCursor({ fullscreen: true, interactiveOverlayOpen: isInteractiveOverlayOpen(), controlsEngaged: false })).toBe(false)
    closeSheet()
    expect(isInteractiveOverlayOpen()).toBe(true)
    closeSettings()
    expect(shouldHideFullscreenCursor({ fullscreen: true, interactiveOverlayOpen: isInteractiveOverlayOpen(), controlsEngaged: false })).toBe(true)
    expect(changes).toEqual([true, true, true, false])
    expect(shouldHideFullscreenCursor({ fullscreen: true, interactiveOverlayOpen: false, controlsEngaged: false })).toBe(true)
    unsubscribe()
  })
})

describe('authoritative blank timeline double-click paths', () => {
  beforeEach(() => {
    useVeilStore.setState({ selectedItemId: 'mask-1', selectedItemType: 'mask' })
  })

  it('clears through the ruler path without treating the ruler as a single-click seek lane', () => {
    const ruler = targetWithClosest(['.timeline-ruler__usable-track'])
    expect(isBlankSeekableTimelineTarget(ruler)).toBe(false)
    expect(isBlankTimelineDeselectionTarget(ruler)).toBe(true)
    expect(shouldClearBlankTimelineSelection(ruler, 2)).toBe(true)
    clearTimelineSelection()
    expect(useVeilStore.getState().selectedItemId).toBeNull()
  })

  it.each(['mask', 'mute', 'skip', 'bookmark'] as const)('clears %s selection through a blank lane path', (type) => {
    useVeilStore.setState({ selectedItemId: `${type}-1`, selectedItemType: type })
    const lane = targetWithClosest(['.timeline-row__usable-track'])
    expect(isBlankSeekableTimelineTarget(lane)).toBe(true)
    expect(shouldClearBlankTimelineSelection(lane, 2)).toBe(true)
    clearTimelineSelection()
    expect(useVeilStore.getState().selectedItemId).toBeNull()
  })

  it('does not route item, marker, playhead, or resize-handle double-clicks as blank', () => {
    for (const interactive of ['.timeline-bar', '.timeline-bookmark-marker', '.timeline-playhead', 'button']) {
      const target = targetWithClosest(['.timeline-row__usable-track', interactive])
      expect(shouldClearBlankTimelineSelection(target, 2)).toBe(false)
    }
    expect(useVeilStore.getState().selectedItemId).toBe('mask-1')
  })

  it('recognizes the real blank-first-click to playhead-second-click lane path', () => {
    expect(shouldCompleteBlankTimelineDoubleClick({
      elapsedMs: 120, deltaX: 0, secondTargetIsBlankOrPlayhead: true
    })).toBe(true)
    expect(shouldCompleteBlankTimelineDoubleClick({
      elapsedMs: 120, deltaX: 0, secondTargetIsBlankOrPlayhead: false
    })).toBe(false)
  })

  it('clears the authoritative Mask selection that owns video handles', () => {
    expect(useVeilStore.getState().selectedItemType).toBe('mask')
    expect(clearTimelineSelection()).toBe(true)
    expect(useVeilStore.getState()).toMatchObject({ selectedItemId: null, selectedItemType: null })
  })
})

describe('responsive subtitle presentation size', () => {
  it('caps large configured text against a small rendered video viewport', () => {
    const small = responsiveSubtitleFontSize({ viewportWidth: 320, viewportHeight: 180, configuredScale: 1.4 })
    expect(small).toBeGreaterThanOrEqual(SUBTITLE_RENDERED_MIN_PX)
    expect(small).toBeLessThan(20)
  })

  it('preserves configured scale on a large viewport within the global maximum', () => {
    const normal = responsiveSubtitleFontSize({ viewportWidth: 1280, viewportHeight: 720, configuredScale: 1 })
    const large = responsiveSubtitleFontSize({ viewportWidth: 1280, viewportHeight: 720, configuredScale: 1.4 })
    expect(large).toBeGreaterThan(normal)
    expect(large).toBeLessThanOrEqual(SUBTITLE_RENDERED_MAX_PX)
  })
})

describe('video to audio authoritative time transition', () => {
  it('unbinds the video clock and propagates audio play, pause, seek, and time updates', () => {
    const video = new FakeMedia()
    const audio = new FakeMedia()
    let authoritativeTime = 0
    let playing = false
    const bind = (media: FakeMedia) => bindLocalMediaClock(media as unknown as HTMLMediaElement, {
      onPlay: () => { playing = true },
      onPause: () => { playing = false },
      onSeeked: () => { authoritativeTime = media.currentTime },
      onTimeUpdate: () => { authoritativeTime = media.currentTime },
      onDurationChange: vi.fn(),
      onEnded: () => { playing = false }
    })

    const unbindVideo = bind(video)
    video.currentTime = 32
    video.dispatchEvent(new Event('timeupdate'))
    expect(authoritativeTime).toBe(32)

    unbindVideo()
    const unbindAudio = bind(audio)
    video.currentTime = 48
    video.dispatchEvent(new Event('timeupdate'))
    expect(authoritativeTime).toBe(32)

    audio.dispatchEvent(new Event('play'))
    audio.currentTime = 7
    audio.dispatchEvent(new Event('timeupdate'))
    expect({ authoritativeTime, playing }).toEqual({ authoritativeTime: 7, playing: true })
    audio.dispatchEvent(new Event('pause'))
    expect(playing).toBe(false)
    audio.currentTime = 41
    audio.dispatchEvent(new Event('seeked'))
    expect(authoritativeTime).toBe(41)
    audio.dispatchEvent(new Event('play'))
    audio.currentTime = 42
    audio.dispatchEvent(new Event('timeupdate'))
    expect({ authoritativeTime, playing }).toEqual({ authoritativeTime: 42, playing: true })
    unbindAudio()
  })

  it('supports opening audio directly', () => {
    const audio = new FakeMedia()
    let authoritativeTime = 0
    const unbind = bindLocalMediaClock(audio as unknown as HTMLMediaElement, {
      onPlay: vi.fn(), onPause: vi.fn(), onSeeked: () => { authoritativeTime = audio.currentTime },
      onTimeUpdate: () => { authoritativeTime = audio.currentTime }, onDurationChange: vi.fn(), onEnded: vi.fn()
    })
    audio.currentTime = 3.5
    audio.dispatchEvent(new Event('timeupdate'))
    expect(authoritativeTime).toBe(3.5)
    unbind()
  })
})
