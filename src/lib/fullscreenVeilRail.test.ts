import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FullscreenVeilActivityRail from '../components/FullscreenVeilActivityRail'
import { buildFullscreenVeilRailMarks } from './fullscreenVeilRail'

describe('fullscreen VEIL activity rail', () => {
  it('maps masks, mutes, and skips to proportional ranges', () => {
    const marks = buildFullscreenVeilRailMarks([
      { id: 'mask', type: 'mask', start: 10, end: 30 },
      { id: 'mute', type: 'mute', start: 40, end: 50 },
      { id: 'skip', type: 'skip', start: 75, end: 100 }
    ], 100)

    expect(marks).toEqual([
      { id: 'mask', type: 'mask', kind: 'range', leftPercent: 10, widthPercent: 20 },
      { id: 'mute', type: 'mute', kind: 'range', leftPercent: 40, widthPercent: 10 },
      { id: 'skip', type: 'skip', kind: 'range', leftPercent: 75, widthPercent: 25 }
    ])
  })

  it('maps bookmarks to point markers and preserves multiple same-time items', () => {
    const marks = buildFullscreenVeilRailMarks([
      { id: 'bookmark-a', type: 'bookmark', start: 50, end: 50 },
      { id: 'bookmark-b', type: 'bookmark', start: 50, end: 50 },
      { id: 'mute', type: 'mute', start: 50, end: 75 }
    ], 100)

    expect(marks).toHaveLength(3)
    expect(marks[0]).toEqual({
      id: 'bookmark-a',
      type: 'bookmark',
      kind: 'point',
      leftPercent: 50
    })
    expect(marks[1]?.leftPercent).toBe(50)
  })

  it('clamps marks to the media duration and omits disabled or invalid ranges', () => {
    expect(buildFullscreenVeilRailMarks([
      { id: 'clamped', type: 'mask', start: -10, end: 120 },
      { id: 'disabled', type: 'mute', start: 10, end: 20, enabled: false },
      { id: 'reversed', type: 'skip', start: 30, end: 20 },
      { id: 'late-bookmark', type: 'bookmark', start: 120, end: 120 }
    ], 100)).toEqual([
      { id: 'clamped', type: 'mask', kind: 'range', leftPercent: 0, widthPercent: 100 },
      { id: 'late-bookmark', type: 'bookmark', kind: 'point', leftPercent: 100 }
    ])
  })

  it('renders nothing when duration is unavailable or invalid', () => {
    expect(buildFullscreenVeilRailMarks([
      { id: 'mask', type: 'mask', start: 0, end: 10 }
    ], 0)).toEqual([])
    expect(buildFullscreenVeilRailMarks([
      { id: 'mask', type: 'mask', start: 0, end: 10 }
    ], Number.NaN)).toEqual([])
  })

  it('is a passive, read-only presentation with semantic VEIL classes', () => {
    const html = renderToStaticMarkup(createElement(FullscreenVeilActivityRail, {
      duration: 100,
      items: [
        { id: 'mask', type: 'mask', start: 10, end: 20 },
        { id: 'bookmark', type: 'bookmark', start: 50, end: 50 }
      ]
    }))

    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('fullscreen-veil-rail__mark--mask')
    expect(html).toContain('fullscreen-veil-rail__mark--bookmark')
    expect(html).not.toContain('<button')
    expect(html).not.toContain('tabindex')
  })
})
