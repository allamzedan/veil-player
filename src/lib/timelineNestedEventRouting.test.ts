import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import TimelineRow from '../components/TimelineRow'
import { isBlankSeekableTimelineTarget } from './timelineBlankSelection'

describe('TimelineRow nested blank-track event routing', () => {
  it('keeps a blank single-click seek on the usable-track owner without clearing selection', () => {
    const seek = vi.fn()
    const capture = vi.fn()
    const selectedItemId: string | null = 'mask-1'
    const target = {
      closest: (selector: string) => selector.includes('.timeline-row__usable-track') ? target : null
    } as unknown as EventTarget
    const onPointerDown = vi.fn((event: { button: number; target: EventTarget; currentTarget: { setPointerCapture: (id: number) => void }; pointerId: number }) => {
      const blank = isBlankSeekableTimelineTarget(event.target)
      if (event.button === 0 && blank) {
        event.currentTarget.setPointerCapture(event.pointerId)
        seek()
      }
    })

    const tree = TimelineRow({
      items: [], itemType: 'mask', duration: 120,
      selectedItemId, selectedItemType: 'mask', activeIds: new Set(),
      dragItemId: null, previewStart: null, previewEnd: null,
      onSelect: vi.fn(), onSelectExclusive: vi.fn(), onDragStart: vi.fn(),
      onTrackPointerDown: onPointerDown as never
    })
    const track = tree.props.children
    const usableTrack = track.props.children

    expect(track.props.onPointerDown).toBeUndefined()
    expect(usableTrack.props.onPointerDown).toBe(onPointerDown)

    const clear = vi.fn()
    const treeWithDoubleClick = TimelineRow({
      items: [], itemType: 'mask', duration: 120,
      selectedItemId, selectedItemType: 'mask', activeIds: new Set(),
      dragItemId: null, previewStart: null, previewEnd: null,
      onSelect: vi.fn(), onSelectExclusive: vi.fn(), onDragStart: vi.fn(),
      onTrackPointerDown: onPointerDown as never,
      onTrackDoubleClick: clear as never
    })
    const doubleClickTrack = treeWithDoubleClick.props.children.props.children
    doubleClickTrack.props.onDoubleClick({ target, preventDefault: vi.fn(), stopPropagation: vi.fn() })
    expect(clear).toHaveBeenCalledOnce()


    const currentTarget = { setPointerCapture: capture }
    usableTrack.props.onPointerDown({ button: 0, target, currentTarget, pointerId: 7 })

    expect(capture).toHaveBeenCalledOnce()
    expect(seek).toHaveBeenCalledOnce()
    expect(selectedItemId).toBe('mask-1')
  })

  it('clears selection on blank double-click while preserving item and Escape behavior', () => {
    const timeline = readFileSync(new URL('../components/TimelineEditor.tsx', import.meta.url), 'utf8')
    const video = readFileSync(new URL('../components/VideoPlayer.tsx', import.meta.url), 'utf8')
    const layers = readFileSync(new URL('../components/LayerList.tsx', import.meta.url), 'utf8')
    const pointerHandler = timeline.slice(
      timeline.indexOf('const onTrackPointerDown = useCallback'),
      timeline.indexOf('const onDragStart')
    )

    expect(pointerHandler).toContain('startScrub(event)')
    expect(timeline).toContain('shouldClearBlankTimelineSelection')
    expect(readFileSync(new URL('../components/TimelineRow.tsx', import.meta.url), 'utf8')).toContain('onDoubleClick={onTrackDoubleClick}')
    expect(timeline).toContain('shouldClearBlankTimelineSelection')
    expect(timeline).toContain('clearTimelineSelection()')
    expect(timeline).toContain('if (modifierSelection) toggleSelectedItem(id, type)')
    expect(timeline).toContain('else selectTimelineItem(id, type)')
    expect(layers).toContain('else props.selectTimelineItem(row.item.id, row.type)')
    expect(video).toContain("if (event.key === 'Escape')")
    expect(video).toContain('if (clearExplicitLayerSelection())')
  })
})
