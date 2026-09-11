import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import FullscreenEditOverlay from '../components/FullscreenEditOverlay'
import type { BookmarkTrackItem } from '../types/track'
import type { PlaybackCapabilities } from './playbackCapabilities'
import { readFileSync } from 'node:fs'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const localCapabilities: PlaybackCapabilities = {
  canCreateMask: true,
  canCreateMuteRange: true,
  canCreateSkipRange: true,
  canUseVisualSelection: true,
  canUseVisualOverlays: true,
  canCreateBookmark: true,
  canEditBookmark: true,
  canEditMediaNotes: true,
  canImportCustomSubtitles: true,
  canUseSmartCover: true,
  canUseRegionCover: true,
  canFullscreen: true,
  canChangePlaybackRate: true,
  canSaveVeil: true,
  canShareVeil: true,
  sourceDisclosure: 'local'
}

function renderOverlay(overrides: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(createElement(FullscreenEditOverlay, {
    visible: true,
    drawerOpen: false,
    duration: 120,
    displayTime: 30,
    isPlaying: false,
    playbackRate: 1,
    selectedItemId: null,
    layerItems: [],
    totalLayerCount: 0,
    layerFilter: 'active',
    onLayerFilterChange: vi.fn(),
    onActivity: vi.fn(),
    onCloseDrawer: vi.fn(),
    onOpenDrawer: vi.fn(),
    onExitFullscreen: vi.fn(),
    onTogglePlayPause: vi.fn(),
    onSeek: vi.fn(),
    onAddMask: vi.fn(),
    onAddMute: vi.fn(),
    onAddSkip: vi.fn(),
    onAddBookmark: vi.fn(),
    videoRef: createRef<HTMLVideoElement>(),
    volume: 0.42,
    muted: false,
    onVolumeChange: vi.fn(),
    onMutedChange: vi.fn(),
    onPlaybackRateChange: vi.fn(),
    subtitleSheetOpen: false,
    capabilities: localCapabilities,
    onSelectItem: vi.fn(),
    onEditItem: vi.fn(),
    onDeleteItem: vi.fn(),
    onAfterTimingMutation: vi.fn(),
    ...overrides
  }))
}

describe('fullscreen playback consistency', () => {
  const bookmark: BookmarkTrackItem = {
    id: 'bookmark-1',
    type: 'bookmark',
    start: 30,
    end: 30,
    label: 'Checkpoint',
    enabled: true
  }

  it('renders one shared volume control, captions, rate, and the existing transport', () => {
    const html = renderOverlay()
    expect(html.match(/class="volume-control player-controls__volume/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Mute"')
    expect(html).toContain('aria-label="Playback speed"')
    expect(html).toContain('player-utility-controls__btn--cc')
    expect(html).toContain('aria-label="VEIL quick actions"')
    expect(html).toContain('timeline-scrub-strip')
  })

  it('renders bookmarks on the fullscreen scrub track in Watch and Edit modes', () => {
    const edit = renderOverlay({
      bookmarks: [bookmark],
      selectedItemId: bookmark.id,
      selectedItemType: 'bookmark',
      onSeekBookmark: vi.fn(),
      onSelectBookmark: vi.fn()
    })
    const watch = renderOverlay({
      bookmarks: [bookmark],
      onSeekBookmark: vi.fn(),
      onSelectBookmark: vi.fn()
    })

    expect(edit).toContain('progress-bookmark-marker--selected')
    expect(watch).toContain('progress-bookmark-marker')
    expect(edit).toContain('--seekbar-bookmark-track-inset:0px')
  })

  it('keeps fullscreen markers and YouTube activity on VEIL chrome', () => {
    const video = read('../components/VideoPlayer.tsx')
    expect(video).toContain("onSeekBookmark={(time, bookmarkId) => manualSeek(time, 'other', bookmarkId)}")
    expect(video).toContain('requestBookmarkToast(id)')
    expect(video).not.toContain('youtube-player-stage progress-bookmark-marker')
  })

  it('uses one inset track rectangle for fullscreen marker and playhead centers', () => {
    const scrub = read('../components/TimelineScrubStrip.tsx')
    const styles = read('../styles.css')
    expect(scrub).toContain('<div ref={trackRef} className="timeline-scrub-strip__track">')
    expect(scrub).toContain('trackInsetPx={0}')
    expect(styles).toMatch(/\.timeline-scrub-strip__track\s*\{[^}]*inset: 0 8px;/s)
  })

  it('shows capability controls independently of edit history or existing layers', () => {
    const edit = renderOverlay()
    expect(edit).toContain('fullscreen-overlay__toolbar-btn--mask')
    expect(edit).toContain('fullscreen-overlay__toolbar-btn--mute')
    expect(edit).toContain('fullscreen-overlay__toolbar-btn--skip')
    expect(edit).toContain('fullscreen-overlay__toolbar-btn--bookmark')

    const zeroLayerWatch = renderOverlay()
    expect(zeroLayerWatch).toContain('fullscreen-overlay__toolbar-btn--bookmark')
    expect(zeroLayerWatch).toContain('fullscreen-overlay__toolbar-btn--mask')
    expect(zeroLayerWatch).toContain('fullscreen-overlay__layers-icon')

    const forbidden = renderOverlay({
      capabilities: {
        ...localCapabilities,
        canCreateMask: false,
        canCreateMuteRange: false,
        canCreateSkipRange: false,
        canCreateBookmark: false
      }
    })
    expect(forbidden).not.toContain('fullscreen-overlay__toolbar-btn--bookmark')
  })

  it('uses shared authoritative handlers and keeps new controls off the YouTube iframe', () => {
    const video = read('../components/VideoPlayer.tsx')
    expect(video).toContain('onAddBookmark={addBookmarkAtCurrentTime}')
    expect(video).toContain('onVolumeChange={applyPlayerVolume}')
    expect(video).toContain('onMutedChange={applyPlayerMuted}')
    expect(video).toContain('onPlaybackRateChange={applyPlaybackRate}')
    expect(video).toContain('showBookmarkAction')
    const local = renderOverlay()
    const youtube = renderOverlay({
      layoutMode: 'youtube-sibling',
      capabilities: {
        ...localCapabilities,
        canCreateMask: false,
        canUseVisualSelection: false,
        canUseVisualOverlays: false,
        canImportCustomSubtitles: false
      }
    })
    expect(local).toContain('fullscreen-overlay__transport-utilities')
    expect(youtube).toContain('fullscreen-overlay__transport-utilities')
  })

  it('hides source-unsupported VEIL and CC controls from fullscreen utilities', () => {
    const html = renderOverlay({
      capabilities: {
        ...localCapabilities,
        canImportCustomSubtitles: false,
        canSaveVeil: false,
        canShareVeil: false
      }
    })
    expect(html).not.toContain('player-utility-controls__btn--cc')
    expect(html).not.toContain('aria-label="VEIL quick actions"')
  })

  it('keeps semantic transport groups ordered and the progress row separate', () => {
    const local = renderOverlay()
    const youtube = renderOverlay({
      layoutMode: 'youtube-sibling',
      capabilities: {
        ...localCapabilities,
        canCreateMask: false,
        canUseVisualSelection: false,
        canUseVisualOverlays: false,
        canImportCustomSubtitles: false
      }
    })

    for (const html of [local, youtube]) {
      const playback = html.indexOf('fullscreen-overlay__playback-group')
      const authoring = html.indexOf('fullscreen-overlay__youtube-authoring')
      const activity = html.indexOf('fullscreen-overlay__youtube-activity-spacer')
      const utilities = html.indexOf('fullscreen-overlay__transport-utilities')
      const exit = html.indexOf('fullscreen-overlay__youtube-exit')
      const progress = html.indexOf('timeline-scrub-strip')

      expect(playback).toBeGreaterThanOrEqual(0)
      expect(authoring).toBeGreaterThan(playback)
      expect(activity).toBeGreaterThan(authoring)
      expect(utilities).toBeGreaterThan(activity)
      expect(exit).toBeGreaterThan(utilities)
      expect(progress).toBeGreaterThan(exit)
    }

    expect(local).toContain('fullscreen-overlay__toolbar-btn--mask')
    expect(local).toContain('player-utility-controls__btn--cc')
    expect(youtube).not.toContain('fullscreen-overlay__toolbar-btn--mask')
    expect(youtube).not.toContain('player-utility-controls__btn--cc')
  })

  it('uses dark token surfaces and keeps interactive overlays or open controls visible', () => {
    const styles = read('../styles.css')
    const video = read('../components/VideoPlayer.tsx')
    expect(styles).toContain('background: color-mix(in srgb, var(--surface) 88%, transparent);')
    expect(styles).toContain('fullscreen-overlay__toolbar-btn--bookmark')
    expect(styles).not.toContain('.fullscreen-overlay__toolbar {\n  backdrop-filter')
    expect(video).toContain('interactiveOverlayOpen: isInteractiveOverlayOpen()')
    expect(video).toContain("!interactiveOverlayOpen ? 'player-stage--fullscreen-idle'")
    expect(video).toContain('.fullscreen-overlay .volume-control--open')
    expect(video).toContain('if (inAppFullscreen) {\n        bumpFullscreenChrome()')
  })

  it('does not reset playback or selection when fullscreen exits', () => {
    const video = read('../components/VideoPlayer.tsx')
    const fullscreen = video.slice(
      video.indexOf('const toggleFullscreen = useCallback'),
      video.indexOf('const handleVideoClick')
    )
    expect(fullscreen).toContain('await document.exitFullscreen()')
    expect(fullscreen).not.toMatch(/set(PlayerVolume|PlayerMuted|PlaybackRate|DisplayTime|SelectedItem)/)
  })
})
