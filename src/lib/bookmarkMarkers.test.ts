import { describe, expect, it } from 'vitest'
import { buildBookmarkMarkerPositions } from './bookmarkMarkers'
import type { BookmarkTrackItem } from '../types/track'

function bookmark(id: string, start: number): BookmarkTrackItem {
  return { id, type: 'bookmark', start, end: start, enabled: true, label: id, notes: '' }
}

describe('buildBookmarkMarkerPositions', () => {
  it('positions point bookmarks in chronological and deterministic order', () => {
    const positions = buildBookmarkMarkerPositions(
      [bookmark('later', 75), bookmark('same-b', 50), bookmark('same-a', 50)],
      100
    )

    expect(positions.map(({ bookmark: item }) => item.id)).toEqual(['same-a', 'same-b', 'later'])
    expect(positions.map(({ leftPercent }) => leftPercent)).toEqual([50, 50, 75])
    expect(positions.map(({ stackOrder }) => stackOrder)).toEqual([1, 2, 3])
  })

  it('keeps bookmarks at both timeline bounds visible', () => {
    const positions = buildBookmarkMarkerPositions(
      [bookmark('start', 0), bookmark('end', 120)],
      120
    )

    expect(positions).toMatchObject([
      { leftPercent: 0, edge: 'start' },
      { leftPercent: 100, edge: 'end' }
    ])
  })

  it('uses the authoritative duration independently of timeline zoom or scroll', () => {
    const positions = buildBookmarkMarkerPositions(
      [bookmark('before', 10), bookmark('middle', 50), bookmark('after', 90)],
      100
    )

    expect(positions.map(({ leftPercent }) => leftPercent)).toEqual([10, 50, 90])
  })

  it('handles unknown or invalid viewport durations safely', () => {
    expect(buildBookmarkMarkerPositions([bookmark('one', 0)], 0)).toEqual([])
    expect(buildBookmarkMarkerPositions([bookmark('one', 0)], Number.NaN)).toEqual([])
  })

  it.each([
    [107, 366],
    [200, 366],
    [55, 114],
    [64, 634]
  ])('returns the same percentage for seekbar and timeline at %ss of %ss', (time, duration) => {
    const seekbar = buildBookmarkMarkerPositions([bookmark('mark', time)], duration)
    const timeline = buildBookmarkMarkerPositions([bookmark('mark', time)], duration)
    expect(seekbar[0].leftPercent).toBeCloseTo((time / duration) * 100)
    expect(timeline[0].leftPercent).toBe(seekbar[0].leftPercent)
    expect(timeline[0].normalized).toBe(seekbar[0].normalized)
  })

  it('keeps represented timestamp independent from timeline zoom width', () => {
    const duration = 366
    const marker = buildBookmarkMarkerPositions([bookmark('mark', 200)], duration)[0]
    const screenLeftAtFit = marker.normalized * 100
    const screenLeftAtTwoHundredPercentZoom = marker.normalized * 200

    expect(marker.normalized).toBeCloseTo(200 / 366)
    expect(screenLeftAtTwoHundredPercentZoom).toBeCloseTo(screenLeftAtFit * 2)
  })

  it('bounds endpoint and out-of-range values', () => {
    expect(buildBookmarkMarkerPositions([bookmark('start', 0), bookmark('end', 120)], 120))
      .toMatchObject([{ leftPercent: 0, edge: 'start' }, { leftPercent: 100, edge: 'end' }])
    expect(buildBookmarkMarkerPositions([bookmark('before', -1), bookmark('after', 121)], 120)).toEqual([])
  })
})
