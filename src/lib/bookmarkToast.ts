import type { BookmarkTrackItem } from '../types/track'

export const BOOKMARK_TOAST_DURATION_MS = 4000
export const BOOKMARK_TOAST_MAX_FORWARD_STEP_SECONDS = 2

export function shouldDismissBookmarkToastForNavigation(args: {
  visibleBookmarkId: string
  editing: boolean
  targetBookmarkId?: string
}): boolean {
  return !args.editing && args.targetBookmarkId !== args.visibleBookmarkId
}

export function findCrossedBookmark(args: {
  bookmarks: readonly BookmarkTrackItem[]
  previousTime: number
  currentTime: number
  alreadyTriggered: ReadonlySet<string>
  maxForwardStepSeconds?: number
}): BookmarkTrackItem | null {
  const {
    bookmarks,
    previousTime,
    currentTime,
    alreadyTriggered,
    maxForwardStepSeconds = BOOKMARK_TOAST_MAX_FORWARD_STEP_SECONDS
  } = args

  if (
    !Number.isFinite(previousTime) ||
    !Number.isFinite(currentTime) ||
    currentTime <= previousTime ||
    currentTime - previousTime > maxForwardStepSeconds
  ) {
    return null
  }

  return bookmarks
    .filter((bookmark) =>
      bookmark.enabled !== false &&
      !alreadyTriggered.has(bookmark.id) &&
      previousTime < bookmark.start &&
      currentTime >= bookmark.start
    )
    .sort((left, right) => right.start - left.start || left.id.localeCompare(right.id))[0] ?? null
}

export function resetBackwardCrossingEligibility(
  alreadyTriggered: Set<string>,
  bookmarks: readonly BookmarkTrackItem[],
  currentTime: number
): void {
  bookmarks.forEach((bookmark) => {
    if (currentTime < bookmark.start) {
      alreadyTriggered.delete(bookmark.id)
    }
  })
}

export function remainingBookmarkToastLifetime(
  remainingMs: number,
  startedAtMs: number,
  nowMs: number
): number {
  return Math.max(0, remainingMs - Math.max(0, nowMs - startedAtMs))
}
