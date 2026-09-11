import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAppMenuActions, registerAppMenuActions, runAppMenuAction } from '../lib/appMenuBridge'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'
import type { YouTubeMediaSource } from '../types/mediaSource'
import {
  canCreatePlaybackPositionBookmark,
  isCurrentYouTubeFailureEvent,
  localPlaybackFailure,
  playbackFailureCopyKeys,
  resolveLiveTransportDuration,
  youtubePlaybackFailure
} from './playbackFailure'
import {
  openFailedYouTubeExternally,
  retryActiveYouTubePlayback
} from './youtubePlaybackRecovery'

const source: YouTubeMediaSource = {
  kind: 'youtube',
  provider: 'youtube',
  videoId: 'aaaaaaaaaaa',
  canonicalUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
  duration: 120
}

afterEach(() => {
  clearAppMenuActions(['closeVideo'])
  useVeilStore.getState().clearVideo()
})

describe('source-aware playback failure selection', () => {
  it('A/F. selects local copy only for local media errors', () => {
    const failure = localPlaybackFailure(4)
    const copy = playbackFailureCopyKeys(failure)
    expect(failure).toMatchObject({ source: 'local', reason: 'unsupported-local-format' })
    expect(t(copy.title)).toBe('Playback unavailable')
    expect(t(copy.primary)).toContain('local media file')
    expect(t(copy.secondary)).toContain('unsupported codec or container')
    expect(t(copy.primary)).not.toContain('YouTube')
  })

  it('A. selects YouTube copy without any local codec wording', () => {
    const copy = playbackFailureCopyKeys(youtubePlaybackFailure('unavailable', source))
    const visible = [t(copy.title), t(copy.primary), t(copy.secondary)].join(' ')
    expect(visible).toContain('YouTube playback unavailable')
    expect(visible).toContain('embedded playback')
    expect(visible.toLowerCase()).not.toContain('codec')
    expect(visible.toLowerCase()).not.toContain('container')
  })
})

describe('YouTube adapter error mapping', () => {
  it.each([
    ['unavailable', 'youtube-unavailable'],
    ['init_failed', 'youtube-unavailable'],
    ['embedding_disabled', 'youtube-embed-restricted'],
    ['player_failure', 'youtube-playback-failed'],
    ['api_load_failed', 'youtube-network'],
    ['network', 'youtube-network'],
    ['unknown', 'youtube-playback-failed']
  ] as const)('B. maps %s to %s', (code, reason) => {
    expect(youtubePlaybackFailure(code, source).reason).toBe(reason)
  })

  it('does not claim private or region restriction without a reliable API signal', () => {
    expect(youtubePlaybackFailure('unavailable', source).reason).toBe('youtube-unavailable')
    expect(youtubePlaybackFailure('unknown', source).reason).toBe('youtube-playback-failed')
  })
})

describe('YouTube playback recovery', () => {
  it('C. Retry recreates the same source and preserves annotations, path, Summary, and dirty state', () => {
    const store = useVeilStore.getState()
    store.openYouTubeMedia(source)
    store.addBookmark({ start: 73.25, label: 'Keep', notes: 'Preserved' })
    store.patchTrackMetadata({ summary: 'Keep summary' })
    store.setTrackFilePath('C:\\tracks\\saved.veil')
    store.markTrackClean()
    const before = useVeilStore.getState()
    const generation = before.youtubeLoadGeneration
    const bookmark = before.bookmarks[0]

    expect(retryActiveYouTubePlayback(youtubePlaybackFailure('unavailable', source))).toBe(true)
    const after = useVeilStore.getState()
    expect(after.youtubeLoadGeneration).toBe(generation + 1)
    expect(after.mediaSource).toMatchObject({ kind: 'youtube', videoId: source.videoId })
    expect(after.bookmarks).toEqual([bookmark])
    expect(after.trackMetadata.summary).toBe('Keep summary')
    expect(after.trackFilePath).toBe('C:\\tracks\\saved.veil')
    expect(after.isTrackDirty).toBe(false)
  })

  it('C. Open on YouTube uses the exact canonical URL and retains renderer state', () => {
    useVeilStore.getState().openYouTubeMedia(source)
    const open = vi.fn()
    expect(openFailedYouTubeExternally(youtubePlaybackFailure('unavailable', source), open)).toBe(true)
    expect(open).toHaveBeenCalledWith(source.canonicalUrl)
    expect(useVeilStore.getState().mediaSource).toMatchObject({ videoId: source.videoId })
  })

  it('C. Close Media delegates to the registered guarded close action', () => {
    const close = vi.fn()
    registerAppMenuActions({ closeVideo: close })
    runAppMenuAction('closeVideo')
    expect(close).toHaveBeenCalledOnce()
  })
})

describe('failure cleanup and unavailable timeline guards', () => {
  it('D. ignores stale generation, old video, and replaced-source errors', () => {
    expect(isCurrentYouTubeFailureEvent({
      eventVideoId: source.videoId,
      eventLoadGeneration: 3,
      activeSource: source,
      activeLoadGeneration: 3
    })).toBe(true)
    expect(isCurrentYouTubeFailureEvent({
      eventVideoId: source.videoId,
      eventLoadGeneration: 2,
      activeSource: source,
      activeLoadGeneration: 3
    })).toBe(false)
    expect(isCurrentYouTubeFailureEvent({
      eventVideoId: 'bbbbbbbbbbb',
      eventLoadGeneration: 3,
      activeSource: source,
      activeLoadGeneration: 3
    })).toBe(false)
    expect(isCurrentYouTubeFailureEvent({
      eventVideoId: source.videoId,
      eventLoadGeneration: 3,
      activeSource: null,
      activeLoadGeneration: 3
    })).toBe(false)
  })

  it('E. does not present saved duration as live or allow a new position bookmark', () => {
    expect(resolveLiveTransportDuration({ source: 'youtube', ready: false, duration: 120 })).toBeNull()
    expect(resolveLiveTransportDuration({ source: 'youtube', ready: true, duration: 120 })).toBe(120)
    expect(canCreatePlaybackPositionBookmark('youtube', false)).toBe(false)
    expect(canCreatePlaybackPositionBookmark('youtube', true)).toBe(true)
    expect(canCreatePlaybackPositionBookmark('local', false)).toBe(true)
  })

  it('E. retains stored bookmarks when YouTube playback fails', () => {
    const store = useVeilStore.getState()
    store.openYouTubeMedia(source)
    store.addBookmark({ start: 25, label: 'Saved', notes: 'Keep me' })
    const before = useVeilStore.getState().bookmarks
    youtubePlaybackFailure('embedding_disabled', source)
    expect(useVeilStore.getState().bookmarks).toEqual(before)
  })
})
