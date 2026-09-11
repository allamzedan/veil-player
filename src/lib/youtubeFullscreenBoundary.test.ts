import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import FullscreenEditOverlay from '../components/FullscreenEditOverlay'
import type { PlaybackCapabilities } from './playbackCapabilities'
import type { BookmarkTrackItem } from '../types/track'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const youtubeCapabilities: PlaybackCapabilities = {
  canCreateMask: false,
  canCreateMuteRange: true,
  canCreateSkipRange: true,
  canUseVisualSelection: false,
  canUseVisualOverlays: false,
  canCreateBookmark: true,
  canEditBookmark: true,
  canEditMediaNotes: true,
  canImportCustomSubtitles: false,
  canUseSmartCover: false,
  canUseRegionCover: false,
  canFullscreen: true,
  canChangePlaybackRate: true,
  canSaveVeil: true,
  canShareVeil: true,
  sourceDisclosure: 'youtube'
}

const bookmark: BookmarkTrackItem = {
  id: 'bookmark-1',
  type: 'bookmark',
  start: 30,
  end: 30,
  label: 'Checkpoint',
  enabled: true
}

function renderYouTubeOverlay(visible = true): string {
  return renderToStaticMarkup(createElement(FullscreenEditOverlay, {
    layoutMode: 'youtube-sibling',
    visible,
    drawerOpen: true,
    duration: 120,
    displayTime: 30,
    isPlaying: false,
    playbackRate: 1,
    selectedItemId: bookmark.id,
    selectedItemType: 'bookmark',
    bookmarks: [bookmark],
    layerItems: [],
    totalLayerCount: 1,
    layerFilter: 'all',
    onLayerFilterChange: vi.fn(),
    onActivity: vi.fn(),
    onCloseDrawer: vi.fn(),
    onOpenDrawer: vi.fn(),
    onExitFullscreen: vi.fn(),
    onTogglePlayPause: vi.fn(),
    onSeek: vi.fn(),
    onSeekBookmark: vi.fn(),
    onSelectBookmark: vi.fn(),
    onAddMask: vi.fn(),
    onAddMute: vi.fn(),
    onAddSkip: vi.fn(),
    onAddBookmark: vi.fn(),
    videoRef: createRef<HTMLVideoElement>(),
    volume: 0.5,
    muted: false,
    onVolumeChange: vi.fn(),
    onMutedChange: vi.fn(),
    onPlaybackRateChange: vi.fn(),
    subtitleSheetOpen: false,
    showBookmarkAction: true,
    capabilities: youtubeCapabilities,
    onSelectItem: vi.fn(),
    onEditItem: vi.fn(),
    onDeleteItem: vi.fn(),
    onAfterTimingMutation: vi.fn()
  }))
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

function intersectionArea(a: Rect, b: Rect): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return width * height
}

describe('YouTube fullscreen boundary', () => {
  it('renders transport, volume, rate, Exit, and markers in the sibling surface only', () => {
    const html = renderYouTubeOverlay()

    expect(html).toContain('fullscreen-overlay--youtube-sibling')
    expect(html).toContain('fullscreen-overlay__bottom')
    expect(html).toContain('fullscreen-overlay__youtube-exit')
    expect(html).toContain('progress-bookmark-marker--selected')
    expect(html.match(/class="volume-control player-controls__volume/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Playback speed"')
    expect(html).toContain('fullscreen-overlay__youtube-authoring')
    expect(html).toContain('fullscreen-overlay__toolbar-btn--mute')
    expect(html).toContain('fullscreen-overlay__toolbar-btn--skip')
    expect(html).toContain('fullscreen-overlay__toolbar-btn--bookmark')
    expect(html).toContain('fullscreen-overlay__playback-group')
    expect(html).toContain('fullscreen-overlay__transport-utilities')
    expect(html).toContain('fullscreen-overlay__layers-icon')
    expect(html).toContain('aria-label="VEIL')
    expect(html).not.toContain('player-utility-controls__btn--cc')
    expect(html).not.toContain('fullscreen-overlay__toolbar"')
    expect(html).not.toContain('fullscreen-overlay__top-hud')
    expect(html).not.toContain('fullscreen-overlay__watch-hint')
    expect(html).not.toContain('fullscreen-overlay__drawer"')

    const playbackIndex = html.indexOf('fullscreen-overlay__playback-group')
    const authoringIndex = html.indexOf('fullscreen-overlay__youtube-authoring')
    const activityIndex = html.indexOf('fullscreen-overlay__youtube-activity-spacer')
    const utilitiesIndex = html.indexOf('fullscreen-overlay__transport-utilities')
    expect(playbackIndex).toBeLessThan(authoringIndex)
    expect(authoringIndex).toBeLessThan(activityIndex)
    expect(activityIndex).toBeLessThan(utilitiesIndex)
  })

  it('keeps Layers visible but releases the transient transport row while chrome is hidden', () => {
    const html = renderYouTubeOverlay(false)
    expect(html).toContain('fullscreen-overlay--youtube-sibling fullscreen-overlay--visible')
    expect(html).toContain('fullscreen-overlay__drawer--youtube-sibling')
    expect(html).not.toContain('fullscreen-overlay__bottom')
  })

  it.each([
    [1920, 1080, 104],
    [1920, 1200, 104],
    [3440, 1440, 104],
    [800, 600, 104]
  ])('partitions %ix%i into non-intersecting iframe and control rows', (width, height, controlsHeight) => {
    const iframe: Rect = { x: 0, y: 0, width, height: height - controlsHeight }
    const transport: Rect = { x: 0, y: iframe.height, width, height: controlsHeight }
    const exit: Rect = { x: width - 120, y: iframe.height + 12, width: 108, height: 36 }
    const progress: Rect = { x: 12, y: height - 44, width: width - 24, height: 32 }

    expect(iframe.width).toBeGreaterThanOrEqual(200)
    expect(iframe.height).toBeGreaterThanOrEqual(200)
    expect(intersectionArea(iframe, transport)).toBe(0)
    expect(intersectionArea(iframe, exit)).toBe(0)
    expect(intersectionArea(iframe, progress)).toBe(0)
  })

  it('uses fullscreen-only grid placement and leaves normal YouTube layout unchanged', () => {
    const styles = read('../styles.css')
    expect(styles).toMatch(/\.player-stage--youtube:fullscreen\s*\{[^}]*display: grid;/s)
    expect(styles).toMatch(/\.player-stage--youtube:fullscreen \.youtube-player-stage\s*\{[^}]*grid-row: 1;/s)
    expect(styles).toMatch(/\.fullscreen-overlay--youtube-sibling\s*\{[^}]*grid-row: 1 \/ -1;/s)
    expect(styles).not.toContain('.player-stage--youtube .youtube-player-stage {')
  })

  it('suppresses persistent fullscreen hint text while preserving transient local command feedback', () => {
    const video = read('../components/VideoPlayer.tsx')
    const overlay = read('../components/FullscreenEditOverlay.tsx')

    expect(video).toContain("layoutMode={isYouTube ? 'youtube-sibling' : 'overlay'}")
    expect(video).toContain('{!isYouTube || !isFullscreen ? <PlaybackHUD /> : null}')
    expect(overlay).toContain("layoutMode = 'overlay'")
    expect(overlay).not.toContain('fullscreen-overlay__top-hud')
    expect(overlay).not.toContain('fullscreen-overlay__watch-hint')
    expect(video).toContain("isAudioMode ? 'player-stage--audio-workspace' : ''")
  })

  it('retains marker seek/selection and the sibling activity boundary', () => {
    const video = read('../components/VideoPlayer.tsx')
    expect(video).toContain("onSeekBookmark={(time, bookmarkId) => manualSeek(time, 'other', bookmarkId)}")
    expect(video).toContain('requestBookmarkToast(id)')
  })

  it('does not change the zero-volume adapter contract or fullscreen layer ordering', () => {
    const adapter = read('../playback/YouTubeAdapter.ts')
    const overlay = read('../components/FullscreenEditOverlay.tsx')
    expect(adapter).toContain('if (this.muted || this.volume === 0)')
    expect(adapter).toContain('this.player.setVolume(0)\n        this.player.mute()')
    expect(overlay).toContain("useState<FullscreenLayerSort>('time')")
    expect(overlay).toContain("sortFullscreenLayerItems(layerItems, layerSort)")
  })
})
