import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import FullscreenEditOverlay, { type ActiveLayerSummary } from '../components/FullscreenEditOverlay'
import type { PlaybackCapabilities } from './playbackCapabilities'

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

const items: ActiveLayerSummary[] = [
  { id: 'mask', type: 'mask', label: 'Mask', start: 1, end: 4, enabled: true },
  { id: 'mute', type: 'mute', label: 'Mute', start: 5, end: 8, enabled: false },
  { id: 'skip', type: 'skip', label: 'Skip', start: 9, end: 12, enabled: true },
  { id: 'bookmark', type: 'bookmark', label: 'Bookmark', start: 13, end: 13, enabled: true }
]

function renderLayers(): string {
  return renderToStaticMarkup(createElement(FullscreenEditOverlay, {
    visible: true,
    drawerOpen: true,
    duration: 120,
    displayTime: 10,
    isPlaying: false,
    selectedItemId: null,
    layerItems: items,
    totalLayerCount: items.length,
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
    onToggleItemEnabled: vi.fn(),
    onAfterTimingMutation: vi.fn()
  }))
}

describe('fullscreen Layers enabled control', () => {
  it('renders existing enable/disable actions for Mask, Mute, and Skip', () => {
    const html = renderLayers()
    expect(html.match(/fullscreen-overlay__toggle-layer/g)).toHaveLength(5)
    expect(html.match(/aria-label="Disable layer"/g)).toHaveLength(2)
    expect(html.match(/aria-label="Enable layer"/g)).toHaveLength(1)
    expect(html).toContain('aria-pressed="false"')
  })

  it('does not add an Enabled action to point-based bookmarks', () => {
    const html = renderLayers()
    const bookmarkRow = html.slice(html.indexOf('aria-label="Bookmark"'))
    expect(bookmarkRow).not.toContain('fullscreen-overlay__toggle-layer')
    expect(bookmarkRow).toContain('fullscreen-overlay__copy-layer')
  })
})
