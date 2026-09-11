import { describe, expect, it } from 'vitest'
import type { MediaSource } from '../types/mediaSource'
import type { VeilTrack } from '../types/track'
import type { VeilTrackStorePayload } from './trackSerialization'
import {
  beginOpenMatchingTarget,
  canApplyPendingOnYouTubeReady,
  canBeginOpenMatchingTarget,
  createPendingYouTubeMismatch,
  decideYouTubeTrackLoad,
  isPendingYouTubeMismatchSuperseded,
  isStaleMismatchRequest,
  markAwaitingYouTubeReady,
  transitionToTargetError,
  youtubeMismatchDialogModel
} from './youtubeTrackMismatch'

const sourceA: MediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
}

const sourceB: MediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'aaaaaaaaaaa',
  canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa'
}

const trackB = {
  version: '1.6.0',
  app: 'VEIL',
  media: {
    kind: 'youtube',
    provider: 'youtube',
    videoId: 'aaaaaaaaaaa',
    canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
    duration: 10
  },
  globalOffsetSeconds: 0,
  trackMetadata: { summary: 'Bound to B' },
  items: [
    {
      id: 'bm-1',
      type: 'bookmark',
      enabled: true,
      start: 1,
      end: 1,
      label: 'Keep me',
      notes: 'must not discard'
    }
  ]
} as unknown as VeilTrack

const payloadB = {
  masks: [],
  mutes: [],
  skips: [],
  bookmarks: [
    {
      id: 'bm-1',
      type: 'bookmark',
      enabled: true,
      start: 1,
      end: 1,
      label: 'Keep me',
      notes: 'must not discard'
    }
  ],
  globalOffsetSeconds: 0,
  trackMetadata: { summary: 'Bound to B' },
  groups: [],
  anchors: [],
  youtubeMedia: {
    kind: 'youtube',
    provider: 'youtube',
    videoId: 'aaaaaaaaaaa',
    canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
    duration: 10
  }
} as unknown as VeilTrackStorePayload

function pendingDecision() {
  return createPendingYouTubeMismatch({
    track: trackB,
    payload: payloadB,
    trackVideoId: 'aaaaaaaaaaa',
    currentVideoId: 'dQw4w9WgXcQ',
    trackFilePath: 'C:\\audit\\bound-b.veil'
  })
}

describe('decideYouTubeTrackLoad', () => {
  it('applies immediately when identities match', () => {
    expect(decideYouTubeTrackLoad(sourceB, sourceB)).toEqual({ action: 'apply' })
  })

  it('requires mismatch dialog when a different YouTube video is open', () => {
    expect(decideYouTubeTrackLoad(sourceA, sourceB)).toEqual({
      action: 'mismatch',
      trackVideoId: 'aaaaaaaaaaa',
      currentVideoId: 'dQw4w9WgXcQ'
    })
  })
})

describe('A. Initial mismatch', () => {
  it('creates awaiting-decision without applying path/annotations ownership loss', () => {
    const pending = pendingDecision()
    expect(pending.phase).toBe('awaiting-decision')
    expect(pending.requestId).toBe(0)
    expect(pending.loadGeneration).toBe(0)
    expect(pending.trackFilePath).toBe('C:\\audit\\bound-b.veil')
    expect(pending.payload.bookmarks).toHaveLength(1)
    const view = youtubeMismatchDialogModel(pending)
    expect(view.open).toBe(true)
    if (view.open) {
      expect(view.phase).toBe('awaiting-decision')
      expect(view.trackVideoId).toBe('aaaaaaaaaaa')
      expect(view.currentVideoId).toBe('dQw4w9WgXcQ')
    }
  })
})

describe('B. Cancel', () => {
  it('dialog closes when pending is cleared; payload object remains for the discarder', () => {
    const pending = pendingDecision()
    expect(canBeginOpenMatchingTarget(pending)).toBe(true)
    expect(youtubeMismatchDialogModel(null).open).toBe(false)
    expect(pending.payload.bookmarks[0]?.label).toBe('Keep me')
  })
})

describe('C. Open Matching', () => {
  it('moves to opening-target / awaiting-ready without clearing payload or path', () => {
    const pending = pendingDecision()
    const opening = beginOpenMatchingTarget(pending, 1, 10)
    expect(opening.phase).toBe('opening-target')
    expect(opening.requestId).toBe(1)
    expect(opening.loadGeneration).toBe(10)
    expect(opening.trackFilePath).toBe('C:\\audit\\bound-b.veil')
    expect(opening.payload.bookmarks).toHaveLength(1)
    expect(canBeginOpenMatchingTarget(opening)).toBe(false)

    const awaiting = markAwaitingYouTubeReady(opening, 1)
    expect(awaiting?.phase).toBe('awaiting-ready')
    expect(awaiting?.trackFilePath).toBe('C:\\audit\\bound-b.veil')
    expect(
      canApplyPendingOnYouTubeReady(awaiting, sourceA, 'aaaaaaaaaaa', 1, 10)
    ).toBe(false)
  })
})

describe('D. Successful Ready', () => {
  it('ignores Ready for the wrong videoId', () => {
    const awaiting = markAwaitingYouTubeReady(
      beginOpenMatchingTarget(pendingDecision(), 2, 2),
      2
    )
    expect(
      canApplyPendingOnYouTubeReady(awaiting, sourceB, 'dQw4w9WgXcQ', 2, 2)
    ).toBe(false)
  })

  it('allows apply only for exact B Ready with matching requestId and generation', () => {
    const awaiting = markAwaitingYouTubeReady(
      beginOpenMatchingTarget(pendingDecision(), 3, 7),
      3
    )
    expect(
      canApplyPendingOnYouTubeReady(awaiting, sourceB, 'aaaaaaaaaaa', 3, 7)
    ).toBe(true)
    expect(
      canApplyPendingOnYouTubeReady(awaiting, sourceB, 'aaaaaaaaaaa', 2, 7)
    ).toBe(false)
    expect(
      canApplyPendingOnYouTubeReady(awaiting, sourceB, 'aaaaaaaaaaa', 3, 6)
    ).toBe(false)
  })

  it('blocks settle-apply once Ready is superseded by target-error', () => {
    const awaiting = markAwaitingYouTubeReady(
      beginOpenMatchingTarget(pendingDecision(), 31, 31),
      31
    )!
    expect(
      canApplyPendingOnYouTubeReady(awaiting, sourceB, 'aaaaaaaaaaa', 31, 31)
    ).toBe(true)
    const errored = transitionToTargetError(
      awaiting,
      31,
      {
        code: 100,
        message: 'Video unavailable'
      },
      31
    )
    expect(
      canApplyPendingOnYouTubeReady(errored, sourceB, 'aaaaaaaaaaa', 31, 31)
    ).toBe(false)
  })
})

describe('E. Target failure', () => {
  it('keeps payload pending in target-error without adopting path semantics', () => {
    const awaiting = markAwaitingYouTubeReady(
      beginOpenMatchingTarget(pendingDecision(), 4, 4),
      4
    )!
    const errored = transitionToTargetError(
      awaiting,
      4,
      {
        code: 100,
        message: 'Video unavailable'
      },
      4
    )
    expect(errored?.phase).toBe('target-error')
    expect(errored?.payload.bookmarks).toHaveLength(1)
    expect(errored?.trackFilePath).toBe('C:\\audit\\bound-b.veil')
    expect(errored?.error?.message).toBe('Video unavailable')
    expect(canBeginOpenMatchingTarget(errored)).toBe(true)
    expect(
      canApplyPendingOnYouTubeReady(errored, sourceB, 'aaaaaaaaaaa', 4, 4)
    ).toBe(false)
    const view = youtubeMismatchDialogModel(errored)
    expect(view.open && view.phase === 'target-error').toBe(true)
  })
})

describe('F. Retry generations', () => {
  it('ignores stale Ready/error/timeout from older requestIds and load generations', () => {
    const first = markAwaitingYouTubeReady(
      beginOpenMatchingTarget(pendingDecision(), 5, 11),
      5
    )!
    const retry = markAwaitingYouTubeReady(beginOpenMatchingTarget(first, 6, 12), 6)!
    expect(isStaleMismatchRequest(retry, 5, 11)).toBe(true)
    expect(isStaleMismatchRequest(retry, 6, 11)).toBe(true)
    expect(isStaleMismatchRequest(retry, 6, 12)).toBe(false)
    expect(
      canApplyPendingOnYouTubeReady(retry, sourceB, 'aaaaaaaaaaa', 5, 11)
    ).toBe(false)
    expect(
      canApplyPendingOnYouTubeReady(retry, sourceB, 'aaaaaaaaaaa', 6, 12)
    ).toBe(true)
    expect(transitionToTargetError(retry, 5, { message: 'old' }, 11)).toBeNull()
    expect(transitionToTargetError(retry, 6, { message: 'new' }, 12)?.error?.message).toBe(
      'new'
    )
  })

  it('same-video Retry keeps payload and path while advancing requestId and generation', () => {
    const errored = transitionToTargetError(
      markAwaitingYouTubeReady(beginOpenMatchingTarget(pendingDecision(), 1, 20), 1)!,
      1,
      { message: 'unavailable' },
      20
    )!
    expect(canBeginOpenMatchingTarget(errored)).toBe(true)
    const retry = beginOpenMatchingTarget(errored, 2, 21)
    expect(retry.requestId).toBe(2)
    expect(retry.loadGeneration).toBe(21)
    expect(retry.trackVideoId).toBe('aaaaaaaaaaa')
    expect(retry.trackFilePath).toBe('C:\\audit\\bound-b.veil')
    expect(retry.payload.bookmarks).toHaveLength(1)
    expect(retry.error).toBeUndefined()
    expect(retry.phase).toBe('opening-target')
  })
})

describe('G. Close failure flow', () => {
  it('clears only when pending becomes null — payload never auto-applies from error', () => {
    const errored = transitionToTargetError(
      markAwaitingYouTubeReady(beginOpenMatchingTarget(pendingDecision(), 7, 7), 7)!,
      7,
      { message: 'unavailable' },
      7
    )
    expect(canApplyPendingOnYouTubeReady(errored, sourceB, 'aaaaaaaaaaa', 7, 7)).toBe(false)
    expect(youtubeMismatchDialogModel(null).open).toBe(false)
  })
})

describe('H. Source superseded', () => {
  it('detects leave of target during awaiting-ready', () => {
    const awaiting = markAwaitingYouTubeReady(
      beginOpenMatchingTarget(pendingDecision(), 8, 8),
      8
    )
    expect(isPendingYouTubeMismatchSuperseded(awaiting, sourceB)).toBe(false)
    expect(isPendingYouTubeMismatchSuperseded(awaiting, sourceA)).toBe(true)
    expect(
      isPendingYouTubeMismatchSuperseded(awaiting, {
        kind: 'local',
        path: 'C:\\a.mp4',
        mediaType: 'video'
      })
    ).toBe(true)
    expect(isPendingYouTubeMismatchSuperseded(awaiting, null)).toBe(true)
  })

  it('does not supersede awaiting-decision while A is still open', () => {
    expect(isPendingYouTubeMismatchSuperseded(pendingDecision(), sourceA)).toBe(false)
  })
})

describe('I. Regression helpers', () => {
  it('matching source decision still applies directly', () => {
    expect(decideYouTubeTrackLoad(sourceB, sourceB).action).toBe('apply')
  })

  it('null pending keeps dialog closed', () => {
    expect(youtubeMismatchDialogModel(null)).toEqual({ open: false })
  })
})
