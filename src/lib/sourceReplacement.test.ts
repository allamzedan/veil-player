import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVeilStore } from '../state/useVeilStore'
import { executeUnsavedChangesDecision, type UnsavedChangesDecision } from './unsavedChangesDecision'
import { replaceWithCleanLocalSource } from './videoOpenFlow'

const youtube = {
  kind: 'youtube' as const,
  provider: 'youtube' as const,
  videoId: 'old-video',
  url: 'https://www.youtube.com/watch?v=old-video',
  canonicalUrl: 'https://www.youtube.com/watch?v=old-video'
}

function currentIdentity() {
  const state = useVeilStore.getState()
  return {
    mediaSource: state.mediaSource,
    masks: state.masks,
    dirty: state.isTrackDirty,
    fileName: state.videoFileName
  }
}

async function requestLocalReplacement(decision: UnsavedChangesDecision) {
  return executeUnsavedChangesDecision(decision, {
    save: vi.fn(async () => 'saved' as const),
    discard: () => useVeilStore.getState().markTrackClean(),
    proceed: () => replaceWithCleanLocalSource({
      src: 'veil-media://new-local',
      fileName: 'new-local.mp4',
      sourceKind: 'protocol',
      filePath: 'C:\\media\\new-local.mp4',
      mediaKind: 'video'
    })
  })
}

describe('transactional local source replacement', () => {
  beforeEach(() => {
    useVeilStore.getState().clearVideo()
    useVeilStore.getState().openYouTubeMedia(youtube)
    useVeilStore.getState().addMask(2, 5)
  })

  it.each([
    ['save', 'saved-and-continue'],
    ['discard', 'discarded-and-continue']
  ] as const)('%s clears the old VEIL before activating the local source', async (decision, outcome) => {
    await expect(requestLocalReplacement(decision)).resolves.toBe(outcome)
    const state = useVeilStore.getState()
    expect(state.mediaSource).toMatchObject({ kind: 'local', path: 'C:\\media\\new-local.mp4' })
    expect(state.videoFileName).toBe('new-local.mp4')
    expect(state.masks).toEqual([])
    expect(state.mutes).toEqual([])
    expect(state.skips).toEqual([])
    expect(state.bookmarks).toEqual([])
    expect(state.isTrackDirty).toBe(false)
  })

  it('Cancel preserves the YouTube identity, VEIL, and dirty state without local activation', async () => {
    const before = currentIdentity()
    await expect(requestLocalReplacement('cancel')).resolves.toBe('cancelled')
    expect(currentIdentity()).toEqual(before)
  })

  it('clean direct replacement still isolates the old VEIL', () => {
    useVeilStore.getState().markTrackClean()
    replaceWithCleanLocalSource({
      src: 'veil-media://new-local', fileName: 'new-local.mp4', sourceKind: 'protocol', mediaKind: 'video'
    })
    expect(useVeilStore.getState().masks).toEqual([])
    expect(useVeilStore.getState().mediaSource?.kind).toBe('local')
  })
})
