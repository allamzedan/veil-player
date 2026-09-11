import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { playbackRatio } from '../playback/authoritativeTime'
import {
  renderedTimeCenterX,
  SEEKBAR_THUMB_CENTER_INSET_PX,
  TIMELINE_MARKER_CENTER_INSET_PX,
  type UsableTrackGeometry
} from './bookmarkMarkerGeometry'

const cases = [
  [122, 366],
  [107, 366],
  [200, 366],
  [55, 114],
  [64, 634]
] as const

const expectAligned = (
  time: number,
  duration: number,
  markerGeometry: UsableTrackGeometry,
  playheadGeometry = markerGeometry
): void => {
  const markerNormalized = playbackRatio(time, duration)
  const playheadNormalized = playbackRatio(time, duration)
  const markerCenter = renderedTimeCenterX(time, duration, markerGeometry)
  const playheadCenter = renderedTimeCenterX(time, duration, playheadGeometry)
  expect(markerNormalized).toBe(playheadNormalized)
  expect(markerCenter).not.toBeNull()
  expect(playheadCenter).not.toBeNull()
  expect(Math.abs(markerCenter! - playheadCenter!)).toBeLessThanOrEqual(1)
}

describe('rendered bookmark marker geometry', () => {
  it.each(cases)('aligns seekbar centers at %ss of %ss', (time, duration) => {
    expectAligned(time, duration, {
      containerLeft: 24,
      containerWidth: 600,
      anchorInset: SEEKBAR_THUMB_CENTER_INSET_PX
    })
  })

  it.each(cases)('aligns expanded timeline centers at %ss of %ss', (time, duration) => {
    expectAligned(time, duration, {
      containerLeft: 10,
      containerWidth: 1200,
      gutterWidth: 108,
      anchorInset: TIMELINE_MARKER_CENTER_INSET_PX
    })
  })

  it('aligns the packaged screenshot condition 122/366 within one pixel', () => {
    const geometry = {
      containerLeft: 0,
      containerWidth: 1200,
      gutterWidth: 108,
      anchorInset: TIMELINE_MARKER_CENTER_INSET_PX
    }
    const markerCenter = renderedTimeCenterX(122, 366, geometry)!
    const playheadCenter = renderedTimeCenterX(122, 366, geometry)!
    expect(markerCenter).toBeCloseTo(475)
    expect(Math.abs(markerCenter - playheadCenter)).toBeLessThanOrEqual(1)
  })

  it('treats asymmetric padding identically for marker and playhead', () => {
    expectAligned(200, 366, {
      containerLeft: 30,
      containerWidth: 900,
      paddingLeft: 12,
      paddingRight: 18,
      anchorInset: SEEKBAR_THUMB_CENTER_INSET_PX
    })
  })

  it('excludes the same timeline gutter from both coordinate systems', () => {
    const geometry = {
      containerLeft: 0,
      containerWidth: 1000,
      gutterWidth: 108,
      anchorInset: TIMELINE_MARKER_CENTER_INSET_PX
    }
    expectAligned(122, 366, geometry)
    expect(renderedTimeCenterX(122, 366, geometry)).toBeCloseTo(408.3333333)
  })

  it('applies expanded width and horizontal scroll exactly once', () => {
    const viewportWidth = 800
    const zoom = 2.5
    const scrollLeft = 430
    const geometry = {
      containerLeft: 0,
      containerWidth: viewportWidth * zoom,
      gutterWidth: 108,
      anchorInset: TIMELINE_MARKER_CENTER_INSET_PX,
      scrollLeft
    }
    expectAligned(200, 366, geometry)
    const normalized = 200 / 366
    const expected = 108 + 9 + normalized * (2000 - 108 - 18) - scrollLeft
    expect(renderedTimeCenterX(200, 366, geometry)).toBeCloseTo(expected)
  })

  it('keeps endpoint marker centers and their bounded marker boxes inside each track', () => {
    const seekbar = { containerLeft: 0, containerWidth: 600, anchorInset: 8 }
    const timeline = { containerLeft: 0, containerWidth: 1200, gutterWidth: 108, anchorInset: 9 }
    expect(renderedTimeCenterX(0, 366, seekbar)).toBe(8)
    expect(renderedTimeCenterX(366, 366, seekbar)).toBe(592)
    expect(renderedTimeCenterX(0, 366, timeline)).toBe(117)
    expect(renderedTimeCenterX(366, 366, timeline)).toBe(1191)
  })

  it('uses shared inset variables and removes the conflicting tracks gutter override', () => {
    const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
    const editor = readFileSync(new URL('../components/TimelineEditor.tsx', import.meta.url), 'utf8')
    const progress = readFileSync(new URL('../components/ProgressBookmarkMarkers.tsx', import.meta.url), 'utf8')
    expect(styles).toContain('var(--timeline-bookmark-track-inset)')
    expect(styles).toContain('var(--seekbar-bookmark-track-inset)')
    expect(styles).not.toContain(".timeline-editor__tracks {\n  --timeline-label-col")
    expect(editor).toContain('TIMELINE_MARKER_CENTER_INSET_PX')
    expect(progress).toContain('SEEKBAR_THUMB_CENTER_INSET_PX')
  })
})
