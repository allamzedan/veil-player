import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  consumeInspectorTabPreservation,
  preserveInspectorTabForSelection
} from './inspectorSelectionNavigation'
import type { SelectableItemType } from './trackItems'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('timeline creation Inspector tab stability', () => {
  it.each<SelectableItemType>(['mask', 'mute', 'skip', 'bookmark'])(
    'preserves the active tab exactly once for timeline %s selection',
    (type) => {
      preserveInspectorTabForSelection(`${type}-id`, type)
      expect(consumeInspectorTabPreservation(`${type}-id`, type)).toBe(true)
      expect(consumeInspectorTabPreservation(`${type}-id`, type)).toBe(false)
    }
  )

  it('keeps the preservation intent scoped to the exact newly selected item', () => {
    preserveInspectorTabForSelection('mask-id', 'mask')
    expect(consumeInspectorTabPreservation('other-id', 'mask')).toBe(false)
    expect(consumeInspectorTabPreservation('mask-id', 'mask')).toBe(false)
  })

  it('marks only refreshed timeline creation while retaining one creation call per action', () => {
    const controls = read('../components/TimelineControls.tsx')
    const refreshed = controls.slice(controls.indexOf('if (refreshedTimeline)'), controls.indexOf('  return (\n    <div className="timeline-controls"'))
    const classic = controls.slice(controls.indexOf('  return (\n    <div className="timeline-controls"'))

    expect(refreshed.match(/addAtPlayhead\(addMask, playbackActivityPreferences\.defaultMaskDurationSeconds, 'mask'\)/g)).toHaveLength(1)
    expect(refreshed.match(/addAtPlayhead\(addMute, playbackActivityPreferences\.defaultMuteDurationSeconds, 'mute'\)/g)).toHaveLength(1)
    expect(refreshed.match(/addAtPlayhead\(addSkip, playbackActivityPreferences\.defaultSkipDurationSeconds, 'skip'\)/g)).toHaveLength(1)
    expect(refreshed).toContain('onClick={() => onAddBookmark({ preserveInspectorTab: true })}')
    expect(classic).toContain('addAtPlayhead(addMask, playbackActivityPreferences.defaultMaskDurationSeconds)')
    expect(classic).toContain('addAtPlayhead(addMute, playbackActivityPreferences.defaultMuteDurationSeconds)')
    expect(classic).toContain('addAtPlayhead(addSkip, playbackActivityPreferences.defaultSkipDurationSeconds)')
    expect(classic).toContain('onClick={onAddBookmark}')
  })

  it('suppresses only the automatic selection-driven Navigate switch', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    const selectionEffect = inspector.slice(
      inspector.indexOf("if (!selectedItemId || !selectedItemType) return"),
      inspector.indexOf('const trackName = useMemo')
    )

    expect(selectionEffect).toContain('consumeInspectorTabPreservation(selectedItemId, selectedItemType)')
    expect(selectionEffect).toContain("setActiveView('navigate')")
    expect(inspector).toContain("setActiveView('navigate')\n  }")
    expect(inspector).toContain('onClick={() => setActiveView(tab.id)}')
    expect(inspector).toContain('setSelectedItem(row.item.id, row.type)')
  })

  it('keeps bookmark timestamp, selection, toast, and non-timeline navigation behavior', () => {
    const video = read('../components/VideoPlayer.tsx')
    const handler = video.slice(
      video.indexOf('const addBookmarkAtCurrentTime = useCallback'),
      video.indexOf('const retryYouTubePlayback')
    )

    expect(handler.match(/addBookmark\(\{ start: timestamp \}\)/g)).toHaveLength(1)
    expect(handler).toContain('resolveBookmarkTimestamp(getCurrentVideoTime(), duration)')
    expect(handler).toContain("preserveInspectorTabForSelection(createdBookmarkId, 'bookmark')")
    expect(handler).toContain('createdBookmarkId && !isAudioMode && (videoSrc || isYouTube)')
    expect(handler).toContain('showBookmarkToast(createdBookmarkId, true)')
    expect(handler).toContain("else if (!intent?.preserveInspectorTab) {\n      requestOpenSidebarPanel('selected')")
    expect(video).toContain("if (matchesBinding(event, 'addBookmark'))")
    expect(video).toContain('addBookmarkAtCurrentTime()')
    expect(read('../components/InspectorPanel.tsx')).toContain('onClick={onAddBookmark}')
  })

  it('preserves persistence, bookmark bridge, marker geometry, and schema contracts', () => {
    const controls = read('../components/TimelineControls.tsx')
    expect(controls).toContain('const start = getCurrentTime()')
    expect(controls).toContain('action(start, start + defaultDurationSeconds)')

    expect(read('./bookmarkMarkerGeometry.ts')).toContain('renderedTimeCenterX')
    expect(read('./bookmarkMarkers.ts')).toContain('buildBookmarkMarkerPositions')
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
})
