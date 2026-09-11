import type { ContentReviewFinding } from './contentReview'

export const CONTENT_REVIEW_PREVIEW_END_TOLERANCE_SECONDS = 0.04

export interface DisplayedContentReviewCue {
  start: number
  end: number
  text: string
  current: boolean
}

export interface ContentReviewPreviewWindow {
  start: number
  end: number
}

export interface ActiveContentReviewPreview {
  findingId: string
  previewEnd: number
}

export interface ContentReviewPlaybackOrigin {
  time: number
  wasPlaying: boolean
}

export type ContentReviewPreviewEvent =
  | { type: 'play'; findingId: string; previewEnd: number }
  | { type: 'stop' | 'close' }
  | { type: 'time'; currentTime: number }

export function captureContentReviewPlaybackOrigin(
  current: ContentReviewPlaybackOrigin | null,
  time: number,
  wasPlaying: boolean
): ContentReviewPlaybackOrigin {
  if (current) return current
  return {
    time: Number.isFinite(time) ? Math.max(0, time) : 0,
    wasPlaying
  }
}

export function getDisplayedContentReviewContext(
  finding: ContentReviewFinding
): DisplayedContentReviewCue[] {
  return [
    ...finding.contextBefore.slice(-2).map((cue) => ({ ...cue, current: false })),
    { start: finding.start, end: finding.end, text: finding.cueText, current: true },
    ...finding.contextAfter.slice(0, 2).map((cue) => ({ ...cue, current: false }))
  ]
}

export function getContentReviewPreviewWindow(
  finding: ContentReviewFinding
): ContentReviewPreviewWindow {
  const context = getDisplayedContentReviewContext(finding)
  return {
    start: context[0]?.start ?? finding.start,
    end: context.at(-1)?.end ?? finding.end
  }
}

export function hasContentReviewPreviewReachedEnd(
  preview: ActiveContentReviewPreview | null,
  currentTime: number
): boolean {
  return Boolean(
    preview &&
    Number.isFinite(currentTime) &&
    currentTime + CONTENT_REVIEW_PREVIEW_END_TOLERANCE_SECONDS >= preview.previewEnd
  )
}

export function contentReviewPreviewReducer(
  state: ActiveContentReviewPreview | null,
  event: ContentReviewPreviewEvent
): ActiveContentReviewPreview | null {
  if (event.type === 'play') {
    return { findingId: event.findingId, previewEnd: event.previewEnd }
  }
  if (event.type === 'time') {
    return hasContentReviewPreviewReachedEnd(state, event.currentTime) ? null : state
  }
  return null
}

export function isContentReviewFindingPreviewActive(
  state: ActiveContentReviewPreview | null,
  findingId: string
): boolean {
  return state?.findingId === findingId
}
