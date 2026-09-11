import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('bookmark marker and timeline completion wiring', () => {
  it('renders interactive selected markers on the main video and audio seekbars', () => {
    const video = read('../components/VideoPlayer.tsx')
    const audio = read('../components/player/AudioTransportDock.tsx')
    const markers = read('../components/ProgressBookmarkMarkers.tsx')
    expect(video).toContain('<ProgressBookmarkMarkers')
    expect(video).not.toContain('hideEditorChrome ? <ProgressBookmarkMarkers')
    expect(audio).toContain('<ProgressBookmarkMarkers')
    expect(markers).toContain('aria-pressed={selected}')
    expect(markers).toContain('onSeek: (time: number, bookmarkId: string) => void')
    expect(markers).toContain('onSeek(bookmark.start, bookmark.id)')
    expect(markers).toContain('onSelect(bookmark.id)')
    expect(markers.indexOf('onSeek(bookmark.start, bookmark.id)'))
      .toBeLessThan(markers.indexOf('onSelect(bookmark.id)'))
  })

  it('keeps the eligible timeline mounted while hiding chrome without changing player mode', () => {
    const video = read('../components/VideoPlayer.tsx')
    expect(video).toContain('const timelineChromeEligible = (')
    expect(video).toContain('{timelineChromeEligible ? (')
    expect(video).toContain('visible={timelineVisible}')
    expect(video).toContain('onTimelineVisibleChange(false)')
    expect(video).toContain('onTimelineVisibleChange(!timelineVisible)')
    expect(video).not.toContain("handleTimelineChromeHide = useCallback((): void => {\n    if (uiRefreshV1)")
  })

  it('preserves bookmark selection across Watch and Edit transitions', () => {
    const video = read('../components/VideoPlayer.tsx')
    const layout = read('./playerWorkspaceLayout.ts')
    expect(video).not.toContain('if (refreshWatchMode) {\n      setSelectedItem(null, null)\n    }')
    expect(video).toContain('inspectorModeActive && inspectorCollapsed')
    expect(layout).toContain('player-workspace--inspector-collapsed')
  })

  it('renders each range lane through its authoritative capability gate', () => {
    const editor = read('../components/TimelineEditor.tsx')
    expect(editor).toContain('{capabilities.canCreateMask ? (')
    expect(editor).toContain('{capabilities.canCreateMuteRange ? (')
    expect(editor).toContain('{capabilities.canCreateSkipRange ? (')
    expect(editor).toContain("label: t('timeline.masks')")
    expect(editor).toContain("label: t('timeline.mutes')")
    expect(editor).toContain("label: t('timeline.skips')")
    expect(editor).toContain('timeline-editor__lane-headers')
  })

  it('keeps schema 1.6.0 unchanged', () => {
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
})
