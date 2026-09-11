import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import FullscreenEditOverlay, {
  sortFullscreenLayerItems,
  type ActiveLayerSummary
} from '../components/FullscreenEditOverlay'
import { ZoomToSelectionIcon } from '../components/icons'
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

const layers: ActiveLayerSummary[] = [
  { id: 'bookmark-1', type: 'bookmark', label: 'Checkpoint', start: 30, end: 30 },
  { id: 'skip-1', type: 'skip', label: 'Skip', start: 50, end: 55 }
]

function renderDrawer(overrides: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(createElement(FullscreenEditOverlay, {
    visible: true,
    drawerOpen: true,
    duration: 120,
    displayTime: 20,
    isPlaying: false,
    selectedItemId: 'bookmark-1',
    selectedItemType: 'bookmark',
    layerItems: layers,
    totalLayerCount: layers.length,
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
    ...overrides
  }))
}

describe('fullscreen Layers editing and navigation', () => {
  it('gives local Layers explicit width ownership only while the drawer is open', () => {
    const player = readFileSync(new URL('../components/VideoPlayer.tsx', import.meta.url), 'utf8')
    const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
    expect(player).toContain("isFullscreen && drawerOpen ? 'player-stage--layers-open' : ''")
    expect(styles).toMatch(/\.player-stage--layers-open:fullscreen:not\(\.player-stage--youtube\) \.player-video\s*\{[^}]*width:\s*calc\(100% - var\(--fullscreen-layers-width\)\)/s)
  })

  it('renders row navigation with separate edit and delete actions without a redundant Go control', () => {
    const html = renderDrawer()
    expect(html).toContain('aria-label="Checkpoint"')
    expect(html).toContain('fullscreen-overlay__edit-layer')
    expect(html.match(/fullscreen-overlay__copy-layer/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Copy bookmark"')
    expect(html).toContain('fullscreen-overlay__delete-layer')
    expect(html).toContain('title="Edit"')
    expect(html).not.toContain('Go to bookmark')
    expect(html).not.toContain('selected-item-editor')
  })

  it('shows a shared compact preview only when a layer is selected', () => {
    const selected = renderDrawer()
    const empty = renderDrawer({ selectedItemId: null, selectedItemType: null })

    expect(selected).toContain('selected-layer-panel-region--preview')
    expect(selected).toContain('fullscreen-overlay__layer-preview')
    expect(empty).not.toContain('selected-layer-panel-region--preview')
    expect(empty).not.toContain('fullscreen-overlay__layer-preview')
  })

  it('keeps Layers visible while transport chrome is hidden and releases it only when closed', () => {
    const layersOnly = renderDrawer({ visible: false, drawerOpen: true })
    const closed = renderDrawer({ visible: false, drawerOpen: false })

    expect(layersOnly).toContain('fullscreen-overlay--visible')
    expect(layersOnly).toContain('fullscreen-overlay__drawer')
    expect(layersOnly).not.toContain('fullscreen-overlay__bottom')
    expect(closed).toContain('fullscreen-overlay--hidden')
    expect(closed).not.toContain('fullscreen-overlay__drawer')
    expect(closed).not.toContain('fullscreen-overlay__bottom')
  })

  it('keeps deterministic time and type sorting', () => {
    expect(sortFullscreenLayerItems(layers, 'time').map((item) => item.id)).toEqual([
      'bookmark-1',
      'skip-1'
    ])
    expect(sortFullscreenLayerItems(layers, 'type').map((item) => item.id)).toEqual([
      'skip-1',
      'bookmark-1'
    ])
  })

  it('renders the approved corner-brackets plus magnifier selection icon', () => {
    const html = renderToStaticMarkup(createElement(ZoomToSelectionIcon))
    expect(html.match(/<path/g)).toHaveLength(2)
    expect(html).toContain('<circle')
    expect(html).toContain('aria-hidden="true"')
  })
})
