import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import TimelineControls from '../components/TimelineControls'
import { canCreateRangeActions } from './authoringCapabilities'
import { resolvePlaybackCapabilities } from './playbackCapabilities'
import type { MediaSource } from '../types/mediaSource'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

const youtube: MediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
}

const localVideo: MediaSource = {
  kind: 'local',
  path: 'C:\\media\\video.mp4',
  mediaType: 'video'
}

const localAudio: MediaSource = {
  kind: 'local',
  path: 'C:\\media\\audio.mp3',
  mediaType: 'audio'
}

function renderYouTubeToolbar(): string {
  return renderToStaticMarkup(createElement(TimelineControls, {
    capabilities: resolvePlaybackCapabilities(youtube),
    duration: 366,
    getCurrentTime: () => 122,
    videoRef: { current: null },
    snapToSubtitles: false,
    hasSubtitleCues: false,
    onToggleSnapToSubtitles: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomFineIn: vi.fn(),
    onZoomFineOut: vi.fn(),
    onFit: vi.fn(),
    onZoomToSelection: vi.fn(),
    onCenterOnPlayhead: vi.fn(),
    onAddBookmark: vi.fn()
  }))
}

describe('compact YouTube timeline', () => {
  const editor = read('../components/TimelineEditor.tsx')
  const ruler = read('../components/TimelineRuler.tsx')
  const styles = read('../styles.css')

  it('keeps only supported controls in the YouTube toolbar', () => {
    const toolbar = renderYouTubeToolbar()
    expect(toolbar).toContain('aria-label="Zoom out"')
    expect(toolbar).toContain('aria-label="Zoom in"')
    expect(toolbar).toContain('title="Fit timeline to full duration"')
    expect(toolbar).toContain('aria-label="Center timeline on playhead"')
    expect(toolbar).toContain('aria-label="Add Bookmark"')
    expect(toolbar).toContain('aria-label="Add mute interval at current time (U)"')
    expect(toolbar).toContain('aria-label="Add skip interval at current time (K)"')
    for (const unsupported of ['Add mask', 'Snap to subtitles']) {
      expect(toolbar).not.toContain(unsupported)
    }
  })

  it('uses a capability-derived two-lane layout without a Mask lane', () => {
    const capabilities = resolvePlaybackCapabilities(youtube)
    expect(canCreateRangeActions(capabilities)).toBe(true)
    expect(capabilities.canCreateMask).toBe(false)
    expect(capabilities.canCreateMuteRange).toBe(true)
    expect(capabilities.canCreateSkipRange).toBe(true)
    expect(editor).toContain('timeline-editor--range-lanes-${rangeLaneCount}')
    expect(editor).toContain("!hasRangeAuthoring ? ' timeline-editor--bookmark-only' : ''")
    expect(editor).toContain('{capabilities.canCreateMask ? (')
    expect(editor).toContain('{capabilities.canCreateMuteRange ? (')
    expect(editor).toContain('{capabilities.canCreateSkipRange ? (')
  })

  it('keeps ruler, playhead, and bookmark markers in the compact body', () => {
    expect(editor).toContain('<TimelineRuler')
    expect(editor).toContain('className="timeline-playhead-layer"')
    expect(ruler).toContain('<TimelineBookmarkMarkers')
    expect(styles).toMatch(/\.timeline-editor--bookmark-only \.timeline-editor__tracks\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*padding:\s*0;/s)
  })

  it('retains marker interaction room without adding empty lane height', () => {
    expect(styles).toMatch(/\.player-chrome-timeline--refresh \.timeline-ruler\s*\{[^}]*height:\s*22px;/s)
    expect(styles).toMatch(/\.timeline-bookmark-marker\s*\{[^}]*height:\s*1\.25rem;/s)
    expect(styles).toMatch(/\.timeline-bookmark-marker--selected::after\s*\{[^}]*top:\s*10px;[^}]*height:\s*8px;/s)
  })

  it('leaves local video and local audio capability layouts unchanged', () => {
    expect(canCreateRangeActions(resolvePlaybackCapabilities(localVideo, 'video'))).toBe(true)
    expect(canCreateRangeActions(resolvePlaybackCapabilities(localAudio, 'audio'))).toBe(true)
    expect(resolvePlaybackCapabilities(localVideo, 'video').canCreateMask).toBe(true)
    expect(resolvePlaybackCapabilities(localAudio, 'audio').canCreateMask).toBe(false)
    expect(editor).toContain("label: t('timeline.masks')")
    expect(editor).toContain("label: t('timeline.mutes')")
    expect(editor).toContain("label: t('timeline.skips')")
    expect(editor).toContain('timeline-editor__lane-headers')
  })

  it('preserves the shared marker/playhead horizontal geometry contract', () => {
    expect(editor).toContain('TIMELINE_MARKER_CENTER_INSET_PX')
    expect(editor).toContain("'--timeline-bookmark-track-inset': `${TIMELINE_MARKER_CENTER_INSET_PX}px`")
    expect(styles).toContain('left: var(--timeline-bookmark-track-inset);')
    expect(styles).not.toContain('var(--timeline-label-col)')
    expect(styles).toContain('inset: 0 var(--timeline-bookmark-track-inset);')
  })
})
