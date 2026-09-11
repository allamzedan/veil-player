import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import FullscreenEditOverlay from '../components/FullscreenEditOverlay'
import { resolvePlaybackCapabilities } from './playbackCapabilities'
import type { MediaSource } from '../types/mediaSource'

const localSource: MediaSource = { kind: 'local', path: 'C:\\media\\fresh.mp4', mediaType: 'video' }
const audioSource: MediaSource = { kind: 'local', path: 'C:\\media\\fresh.mp3', mediaType: 'audio' }
const youtubeSource: MediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
}

function renderFor(source: MediaSource, layerItems: Array<{ id: string; type: 'mask' | 'mute' | 'skip' | 'bookmark'; label: string; start: number; end: number }> = []): string {
  const capabilities = resolvePlaybackCapabilities(source, source.kind === 'local' ? source.mediaType : 'video')
  return renderToStaticMarkup(createElement(FullscreenEditOverlay, {
    layoutMode: source.kind === 'youtube' ? 'youtube-sibling' : 'overlay',
    visible: true,
    drawerOpen: false,
    duration: 120,
    displayTime: 0,
    isPlaying: false,
    selectedItemId: null,
    layerItems,
    totalLayerCount: layerItems.length,
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
    volume: 0.5,
    muted: false,
    onVolumeChange: vi.fn(),
    onMutedChange: vi.fn(),
    onPlaybackRateChange: vi.fn(),
    subtitleSheetOpen: false,
    capabilities,
    onSelectItem: vi.fn(),
    onEditItem: vi.fn(),
    onDeleteItem: vi.fn(),
    onAfterTimingMutation: vi.fn()
  }))
}

function expectSharedControls(html: string): void {
  expect(html).toContain('fullscreen-overlay__toolbar-btn--mute')
  expect(html).toContain('fullscreen-overlay__toolbar-btn--skip')
  expect(html).toContain('fullscreen-overlay__toolbar-btn--bookmark')
  expect(html).toContain('aria-label="VEIL quick actions"')
  expect(html).toContain('fullscreen-overlay__layers-icon')
}

describe('fullscreen zero-layer capability controls', () => {
  it('shows the complete local-video set before any layer exists', () => {
    const html = renderFor(localSource)
    expectSharedControls(html)
    expect(html).toContain('fullscreen-overlay__toolbar-btn--mask')
  })

  it('shows the YouTube set for a recent with zero layers and never shows Mask', () => {
    const html = renderFor(youtubeSource)
    expectSharedControls(html)
    expect(html).not.toContain('fullscreen-overlay__toolbar-btn--mask')
  })

  it('does not derive controls from existing layer count', () => {
    const withLayer = renderFor(localSource, [{ id: 'mask-1', type: 'mask', label: 'Mask', start: 1, end: 2 }])
    const afterRemovingAll = renderFor(localSource)
    expectSharedControls(withLayer)
    expectSharedControls(afterRemovingAll)
    expect(withLayer).toContain('fullscreen-overlay__toolbar-btn--mask')
    expect(afterRemovingAll).toContain('fullscreen-overlay__toolbar-btn--mask')
  })

  it('updates the action set from source capabilities across local, YouTube, and audio', () => {
    const local = renderFor(localSource)
    const youtube = renderFor(youtubeSource)
    const audio = renderFor(audioSource)
    expect(local).toContain('fullscreen-overlay__toolbar-btn--mask')
    expect(youtube).not.toContain('fullscreen-overlay__toolbar-btn--mask')
    expect(audio).not.toContain('fullscreen-overlay__toolbar-btn--mask')
    expectSharedControls(youtube)
    expectSharedControls(audio)
  })
})
