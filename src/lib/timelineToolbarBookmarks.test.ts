import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TimelineControls from '../components/TimelineControls'
import type { PlaybackCapabilities } from './playbackCapabilities'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

afterEach(() => vi.unstubAllGlobals())

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

function renderToolbar(overrides: Partial<PlaybackCapabilities> = {}): string {
  return renderToStaticMarkup(createElement(TimelineControls, {
    capabilities: { ...capabilities, ...overrides },
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

function renderedGroup(html: string, name: string): string {
  const marker = `data-timeline-group="${name}"`
  const start = html.indexOf(marker)
  expect(start).toBeGreaterThan(-1)
  const next = html.indexOf('data-timeline-group="', start + marker.length)
  return html.slice(start, next === -1 ? undefined : next)
}

describe('Timeline Toolbar Concept A', () => {
  it('renders the three refreshed groups in Zoom, Navigate & Edit, Layers order', () => {
    const html = renderToolbar()
    const zoom = html.indexOf('data-timeline-group="zoom"')
    const navigate = html.indexOf('data-timeline-group="navigate-edit"')
    const layers = html.indexOf('data-timeline-group="layers"')
    expect(zoom).toBeGreaterThan(-1)
    expect(navigate).toBeGreaterThan(zoom)
    expect(layers).toBeGreaterThan(navigate)
    expect(html).toContain('>ZOOM</span>')
    expect(html).toContain('>NAVIGATE &amp; EDIT</span>')
    expect(html).toContain('>LAYERS</span>')
  })

  it('renders all three groups as framed Concept A modules', () => {
    const html = renderToolbar()
    expect(html.match(/data-timeline-group=/g)).toHaveLength(3)

    const styles = read('../styles.css')
    expect(styles).toContain('min-height: 3.55rem;')
    expect(styles).toContain('padding: 0.5rem;')
    expect(styles).toContain('align-items: flex-start;\n  justify-content: center;')
    expect(styles).toContain('border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);')
    expect(styles).toContain('border-radius: 9px;')
    expect(styles).toContain('background: color-mix(in srgb, var(--surface-elevated) 88%, #080b12);')
    expect(styles).toContain('0 2px 7px rgba(0, 0, 0, 0.24);')
  })

  it('positions every group label across the aligned top border as a framed legend', () => {
    const styles = read('../styles.css')
    expect(styles).toContain('.player-chrome-timeline--refresh .timeline-controls__concept-group {\n  position: relative;')
    expect(styles).toContain('.player-chrome-timeline--refresh .timeline-controls__concept-label {\n  position: absolute;\n  top: -0.31rem;\n  left: 0.65rem;\n  z-index: 1;\n  padding: 0 0.25rem;')
    expect(styles).toContain('background: var(--surface);')
    expect(styles).toContain('line-height: 1;\n  letter-spacing: 0.09em;\n  white-space: nowrap;')
  })

  it('keeps only Zoom Out, Zoom In, and Fit in the compact Zoom group', () => {
    const zoom = renderedGroup(renderToolbar(), 'zoom')
    expect(zoom).toContain('aria-label="Zoom out"')
    expect(zoom).toContain('aria-label="Zoom in"')
    expect(zoom).toContain('title="Fit timeline to full duration"')
    expect(zoom).not.toContain('Zoom selection')
    expect(zoom).not.toContain('Center timeline on playhead')
  })

  it('keeps Navigate & Edit actions in their existing order', () => {
    const navigate = renderedGroup(renderToolbar(), 'navigate-edit')
    const orderedTitles = [
      'Zoom selection',
      'Center timeline on playhead',
      'Snap to subtitles',
      'Set selected start to current time (I)',
      'Set selected end to current time (O)',
      'Move selected item to current time',
      'Jump to selected start'
    ]
    let previous = -1
    for (const title of orderedTitles) {
      const index = navigate.indexOf(`title="${title}"`)
      expect(index).toBeGreaterThan(previous)
      previous = index
    }
    expect(navigate).toContain('disabled=""')
    expect(read('../styles.css')).toContain('.timeline-controls__button:disabled {\n  opacity: 0.46;\n  box-shadow: none;')
    expect(read('../styles.css')).toContain('.timeline-controls__concept-group--navigate .timeline-controls__button:disabled {\n  border-color: color-mix(in srgb, var(--border) 48%, transparent);\n  color: color-mix(in srgb, var(--muted) 78%, transparent);')
  })

  it('renders Mask, Mute, Skip, Bookmark in Layers order with approved presentation', () => {
    const layers = renderedGroup(renderToolbar(), 'layers')
    const orderedLabels = ['Mask', 'Mute', 'Skip', 'Bookmark']
    let previous = -1
    for (const label of orderedLabels) {
      const index = layers.indexOf(`>${label}</span>`)
      expect(index).toBeGreaterThan(previous)
      previous = index
    }
    for (const tone of ['mask', 'mute', 'skip', 'bookmark']) {
      expect(layers).toContain(`timeline-controls__action--${tone}`)
    }
    expect(layers).toContain('aria-label="Add Bookmark"')
    expect(layers).toContain('title="Add Bookmark (B)"')
    expect(layers).not.toContain('<kbd')
  })

  it('uses softer resting fills and stronger interactive treatments for Layers actions', () => {
    const styles = read('../styles.css')
    for (const tone of ['mask', 'mute', 'skip', 'bookmark']) {
      const selector = `.player-chrome-timeline--refresh .timeline-controls--concept-a .timeline-controls__action--${tone}`
      expect(styles).toContain(selector)
      expect(styles).toContain(`border-color: color-mix(in srgb, var(--timeline-action-${tone}) 58%, var(--border));`)
      expect(styles).toContain(`background: color-mix(in srgb, var(--timeline-action-${tone}) 12%, var(--surface-elevated));`)
      expect(styles).toContain(`${selector}:not(:disabled):is(:hover, :focus-visible, :active)`)
      expect(styles).toContain(`border-color: color-mix(in srgb, var(--timeline-action-${tone}) 72%, var(--border));`)
      expect(styles).toContain(`background: color-mix(in srgb, var(--timeline-action-${tone}) 18%, var(--surface-elevated));`)
    }
    expect(styles).toContain('color: color-mix(in srgb, var(--timeline-action-mask) 75%, var(--text));')
    expect(styles).toContain('color: color-mix(in srgb, var(--timeline-action-bookmark) 98%, var(--text));')
    expect(styles).toContain('box-shadow:\n    inset 0 1px 0 rgba(255, 255, 255, 0.06),\n    0 2px 5px rgba(0, 0, 0, 0.28);')
  })

  it('keeps button borders stronger than group and disabled borders', () => {
    const styles = read('../styles.css')
    expect(styles).toContain('border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);')
    expect(styles).toContain('border: 1px solid color-mix(in srgb, var(--border) 82%, var(--text) 18%);')
    expect(styles).toContain('border-color: color-mix(in srgb, var(--border) 48%, transparent);')
  })

  it('hides only the Bookmark badge while preserving the B shortcut and tooltip', () => {
    const layers = renderedGroup(renderToolbar(), 'layers')
    const shortcuts = read('shortcutBindings.ts')
    const videoPlayer = read('../components/VideoPlayer.tsx')
    expect(layers).not.toContain('timeline-controls__shortcut')
    expect(layers).toContain('title="Add Bookmark (B)"')
    expect(shortcuts).toContain("addBookmark: 'b'")
    expect(videoPlayer).toContain("if (matchesBinding(event, 'addBookmark'))")
    expect(videoPlayer).toContain('addBookmarkAtCurrentTime()')
  })

  it('preserves capability gating so unsupported controls remain absent', () => {
    const unsupported = renderToolbar({
      canCreateMask: false,
      canCreateMuteRange: false,
      canCreateSkipRange: false,
      canCreateBookmark: false,
      canImportCustomSubtitles: false
    })
    expect(unsupported).not.toContain('data-timeline-group="layers"')
    expect(unsupported).not.toContain('Zoom selection')
    expect(unsupported).not.toContain('Snap to subtitles')

    const audioLike = renderedGroup(renderToolbar({ canCreateMask: false }), 'layers')
    expect(audioLike).not.toContain('Add mask at current time (M)')
    expect(audioLike).toContain('Add mute interval at current time (U)')
    expect(audioLike).toContain('Add skip interval at current time (K)')
    expect(audioLike).toContain('Add Bookmark')
  })

  it('preserves all existing handler connections and enlarged zoom glyphs', () => {
    const controls = read('../components/TimelineControls.tsx')
    const styles = read('../styles.css')
    expect(controls).toContain('onClick={handleZoomOut}')
    expect(controls).toContain('onClick={handleZoomIn}')
    expect(controls).toContain('onClick={onFit}')
    expect(controls).toContain('onClick={onZoomToSelection}')
    expect(controls).toContain('onClick={onCenterOnPlayhead}')
    expect(controls).toContain('onClick={onToggleSnapToSubtitles}')
    expect(controls).toContain('onClick={applyStart}')
    expect(controls).toContain('onClick={applyEnd}')
    expect(controls).toContain('onClick={moveToNow}')
    expect(controls).toContain('onClick={jumpToStart}')
    expect(controls).toContain('onClick={() => addAtPlayhead(addMask, playbackActivityPreferences.defaultMaskDurationSeconds)}')
    expect(controls).toContain('onClick={() => addAtPlayhead(addMute, playbackActivityPreferences.defaultMuteDurationSeconds)}')
    expect(controls).toContain('onClick={() => addAtPlayhead(addSkip, playbackActivityPreferences.defaultSkipDurationSeconds)}')
    expect(controls).toContain('onClick={onAddBookmark}')
    expect(styles).toContain('.player-chrome-timeline--refresh .timeline-controls--concept-a .timeline-controls__zoom-icon')
    expect(styles).toContain('width: 1.4rem;\n  height: 1.4rem;')
    expect(styles).toContain('.timeline-controls__button--icon {\n  min-width: 2rem;\n  width: 2rem;\n  padding: 0;')
  })

  it('content-sizes all groups, right-aligns Layers, and wraps only complete groups', () => {
    const styles = read('../styles.css')
    const toolbarSelector = '.player-chrome-timeline--refresh .timeline-controls--concept-a {'
    const toolbarStart = styles.indexOf(toolbarSelector)
    const toolbarRule = styles.slice(toolbarStart, styles.indexOf('\n}', toolbarStart) + 2)
    expect(styles).toContain('.player-chrome-timeline--refresh .timeline-controls--concept-a {\n  display: flex;\n  align-items: stretch;\n  justify-content: flex-start;\n  flex-wrap: nowrap;')
    expect(styles).toContain('width: 100%;')
    expect(styles).toContain('overflow: visible;')
    expect(toolbarRule).toContain('column-gap: var(--space-2);')
    expect(styles).toContain('flex: 0 0 auto;\n  flex-direction: column;')
    expect(styles).toContain('min-width: max-content;')
    expect(styles).toContain('.player-chrome-timeline--refresh .timeline-controls__concept-group--layers {\n  min-width: max-content;\n  margin-left: auto;')
    expect(styles).not.toContain('.timeline-controls__concept-group--navigate {\n  flex: 1 1 auto;')
    expect(toolbarRule).not.toContain('justify-content: space-between;')
    expect(styles).toContain('.player-chrome-timeline--refresh .timeline-controls__concept-actions {\n  display: flex;\n  align-items: center;\n  flex-wrap: nowrap;')
    expect(styles).toContain('white-space: nowrap;')
    expect(styles).toContain('@media (max-width: 1100px) {\n  .player-chrome-timeline--refresh .timeline-controls--concept-a {\n    flex-wrap: wrap;')
  })

  it('migrates legacy preference values to the current timeline presentation', () => {
    vi.stubGlobal('localStorage', { getItem: () => '0' })
    const html = renderToolbar()
    expect(html).toContain('timeline-controls--concept-a')
    expect(html).toContain('data-timeline-group=')
    expect(html).toContain('>ZOOM</span>')
    expect(html).toContain('timeline-controls__action--')
    expect(html).toContain('timeline-controls__zoom-icon')
    expect(html).toContain('aria-label="Zoom selection"')
    expect(html).not.toContain('>Zoom selection</button>')
    expect(html).toContain('aria-label="Add Bookmark"')
    expect(html).toContain('Add mask at current time (M)')
  })

  it('preserves bookmark lifecycle and marker geometry outside the approved timeline math change', () => {
    expect(read('../components/ProgressBookmarkMarkers.tsx')).toContain('buildBookmarkMarkerPositions')
    expect(read('../components/TimelineBookmarkMarkers.tsx')).toContain('bookmark')
    expect(read('./bookmarkInteractionBridge.ts')).toContain('requestBookmarkToast')
    expect(read('./bookmarkMarkerGeometry.ts')).toContain('renderedTimeCenterX')
  })
})
