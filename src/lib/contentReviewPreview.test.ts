import { describe, expect, it } from 'vitest'
import type { ContentReviewFinding } from './contentReview'
import {
  captureContentReviewPlaybackOrigin,
  contentReviewPreviewReducer,
  getContentReviewPreviewWindow,
  getDisplayedContentReviewContext,
  hasContentReviewPreviewReachedEnd,
  isContentReviewFindingPreviewActive
} from './contentReviewPreview'

const finding = (id = 'selected'): ContentReviewFinding => ({
  id,
  start: 10,
  end: 11,
  category: 'profanity',
  cueText: 'Selected cue',
  contextBefore: [
    { start: 4, end: 5, text: 'Too early' },
    { start: 6, end: 7, text: 'Before two' },
    { start: 8, end: 9, text: 'Before one' }
  ],
  contextAfter: [
    { start: 12, end: 13, text: 'After one' },
    { start: 14, end: 15, text: 'After two' },
    { start: 16, end: 17, text: 'Too late' }
  ]
})

describe('bounded Content Review preview', () => {
  it('uses exactly the displayed context and derives its earliest start and latest end', () => {
    const displayed = getDisplayedContentReviewContext(finding())
    expect(displayed.map((cue) => cue.text)).toEqual([
      'Before two',
      'Before one',
      'Selected cue',
      'After one',
      'After two'
    ])
    expect(getContentReviewPreviewWindow(finding())).toEqual({ start: 6, end: 15 })
  })

  it('falls back to the selected finding boundaries without surrounding context', () => {
    const isolated = { ...finding(), contextBefore: [], contextAfter: [] }
    expect(getContentReviewPreviewWindow(isolated)).toEqual({ start: 10, end: 11 })
  })

  it('tracks Play, keeps non-active rows inactive, and replaces the active row', () => {
    const first = contentReviewPreviewReducer(null, {
      type: 'play',
      findingId: 'row-a',
      previewEnd: 15
    })
    expect(isContentReviewFindingPreviewActive(first, 'row-a')).toBe(true)
    expect(isContentReviewFindingPreviewActive(first, 'row-b')).toBe(false)

    const second = contentReviewPreviewReducer(first, {
      type: 'play',
      findingId: 'row-b',
      previewEnd: 25
    })
    expect(isContentReviewFindingPreviewActive(second, 'row-a')).toBe(false)
    expect(isContentReviewFindingPreviewActive(second, 'row-b')).toBe(true)
  })

  it('does not stop below the end and clears state at or past the authoritative end', () => {
    const active = { findingId: 'row-a', previewEnd: 15 }
    expect(hasContentReviewPreviewReachedEnd(active, 14.9)).toBe(false)
    expect(contentReviewPreviewReducer(active, { type: 'time', currentTime: 14.9 })).toBe(active)
    expect(hasContentReviewPreviewReachedEnd(active, 15)).toBe(true)
    expect(contentReviewPreviewReducer(active, { type: 'time', currentTime: 15 })).toBeNull()
    expect(contentReviewPreviewReducer(active, { type: 'time', currentTime: 15.2 })).toBeNull()
  })

  it('clears active preview state for manual Stop and dialog close', () => {
    const active = { findingId: 'row-a', previewEnd: 15 }
    expect(contentReviewPreviewReducer(active, { type: 'stop' })).toBeNull()
    expect(contentReviewPreviewReducer(active, { type: 'close' })).toBeNull()
    expect(isContentReviewFindingPreviewActive(null, 'row-a')).toBe(false)
  })

  it('captures the paused playback origin once and ignores later preview positions', () => {
    const origin = captureContentReviewPlaybackOrigin(null, 630, false)
    const afterFirstPreview = captureContentReviewPlaybackOrigin(origin, 6, true)
    const afterSecondPreview = captureContentReviewPlaybackOrigin(afterFirstPreview, 25, false)

    expect(origin).toEqual({ time: 630, wasPlaying: false })
    expect(afterFirstPreview).toBe(origin)
    expect(afterSecondPreview).toBe(origin)
  })

  it('preserves an originally playing session for restoration', () => {
    expect(captureContentReviewPlaybackOrigin(null, 630.25, true)).toEqual({
      time: 630.25,
      wasPlaying: true
    })
  })
})
