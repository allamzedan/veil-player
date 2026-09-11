import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import FullscreenEditOverlay from '../components/FullscreenEditOverlay'
import type { PlaybackCapabilities } from './playbackCapabilities'
import type { BookmarkTrackItem } from '../types/track'

const capabilities: PlaybackCapabilities = {
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

const bookmark: BookmarkTrackItem = {
  id: 'bookmark-activity',
  type: 'bookmark',
  start: 63,
  end: 63,
  label: 'Review point',
  enabled: true
}

function renderActivity({
  visible = false,
  drawerOpen = false,
  layoutMode = 'overlay'
}: {
  visible?: boolean
  drawerOpen?: boolean
  layoutMode?: 'overlay' | 'youtube-sibling'
} = {}): string {
  return renderToStaticMarkup(createElement(FullscreenEditOverlay, {
    layoutMode,
    visible,
    drawerOpen,
    duration: 120,
    displayTime: 63,
    isPlaying: true,
    selectedItemId: null,
    layerItems: [],
    totalLayerCount: 0,
    layerFilter: 'all',
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
    volume: 1,
    muted: false,
    onVolumeChange: vi.fn(),
    onMutedChange: vi.fn(),
    onPlaybackRateChange: vi.fn(),
    subtitleSheetOpen: false,
    capabilities,
    onSelectItem: vi.fn(),
    onEditItem: vi.fn(),
    onDeleteItem: vi.fn(),
    onAfterTimingMutation: vi.fn(),
    bookmarkActivity: bookmark,
    bookmarkActivityRefreshKey: 2,
    onDismissBookmarkActivity: vi.fn()
  }))
}

describe('fullscreen bookmark activity independence', () => {
  it('keeps informational bookmark activity visible after transport auto-hide', () => {
    const html = renderActivity()

    expect(html).toContain('fullscreen-overlay--visible')
    expect(html).toContain('fullscreen-overlay__bookmark-activity-layer')
    expect(html).toContain('Review point')
    expect(html).toContain('1:03')
    expect(html).not.toContain('fullscreen-overlay__bottom')
  })

  it('composes activity inside visible transport without duplication or overlap', () => {
    const html = renderActivity({ visible: true })

    expect(html).toContain('fullscreen-overlay__bottom')
    expect(html).toContain('fullscreen-overlay__youtube-activity')
    expect(html).not.toContain('fullscreen-overlay__bookmark-activity-layer')
    expect(html.match(/<section class="bookmark-activity-surface/g)).toHaveLength(1)
  })

  it('preserves drawer state while transport is hidden', () => {
    const html = renderActivity({ drawerOpen: true })

    expect(html).toContain('fullscreen-overlay__drawer')
    expect(html).toContain('bookmark-activity-surface')
    expect(html).not.toContain('fullscreen-overlay__bottom')
  })

  it('uses the YouTube sibling control row when transport is hidden', () => {
    const html = renderActivity({ layoutMode: 'youtube-sibling' })

    expect(html).toContain('fullscreen-overlay--youtube-sibling')
    expect(html).toContain('fullscreen-overlay__bookmark-activity-layer')
    expect(html).not.toContain('fullscreen-overlay__bottom')
  })
})
