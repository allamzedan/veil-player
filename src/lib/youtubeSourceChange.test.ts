import { beforeEach, describe, expect, it } from 'vitest'
import { replaceWithCleanYouTubeSource, youtubeSourceChangeActions } from './youtubeSourceChange'
import { useVeilStore } from '../state/useVeilStore'

describe('description YouTube source-change confirmation', () => {
  beforeEach(() => useVeilStore.getState().clearVideo())
  it('offers the required clean and dirty actions', () => {
    expect(youtubeSourceChangeActions(true)).toEqual(['save-and-open', 'open-without-saving', 'cancel'])
    expect(youtubeSourceChangeActions(false)).toEqual(['open', 'cancel'])
  })

  it('clears annotation context before opening the exact source', () => {
    const calls: string[] = []
    const source = { kind: 'youtube' as const, provider: 'youtube' as const, videoId: 'aaaaaaaaaaa', canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' }
    replaceWithCleanYouTubeSource(source, {
      clearVideo: () => calls.push('clear'),
      openYouTubeMedia: (next) => calls.push(`open:${next.videoId}`)
    })
    expect(calls).toEqual(['clear', 'open:aaaaaaaaaaa'])
  })

  it('does not carry video A annotations, selection, metadata, path, or dirty state to video B', () => {
    const state = useVeilStore.getState()
    state.openYouTubeMedia({ kind: 'youtube', provider: 'youtube', videoId: 'videoAAAAAA', canonicalUrl: 'https://www.youtube.com/watch?v=videoAAAAAA' })
    state.addMask(1, 2)
    state.addMute(3, 4)
    state.addSkip(5, 6)
    state.addBookmark({ start: 7, label: 'A bookmark', notes: 'Only A' })
    const sourceB = { kind: 'youtube' as const, provider: 'youtube' as const, videoId: 'videoBBBBBB', canonicalUrl: 'https://www.youtube.com/watch?v=videoBBBBBB' }

    replaceWithCleanYouTubeSource(sourceB, useVeilStore.getState())

    const next = useVeilStore.getState()
    expect(next.mediaSource).toMatchObject(sourceB)
    expect(next.masks).toEqual([])
    expect(next.mutes).toEqual([])
    expect(next.skips).toEqual([])
    expect(next.bookmarks).toEqual([])
    expect(next.selectedItemId).toBeNull()
    expect(next.selectedItemType).toBeNull()
    expect(next.trackFilePath).toBeNull()
    expect(next.isTrackDirty).toBe(false)
  })
})
