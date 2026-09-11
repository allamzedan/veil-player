import { describe, expect, it } from 'vitest'
import { setCurrentTimeDebug } from './debugState'
import { isDeferredSeekStillCurrent, resolveActiveLocalMediaDuration } from './localMediaSeek'

describe('local media seek ownership across source switches', () => {
  it('uses the active audio duration for audio-first seeking', () => {
    expect(resolveActiveLocalMediaDuration(245, 0)).toBe(245)
  })

  it('replaces stale video duration with active audio duration after video to audio', () => {
    expect(resolveActiveLocalMediaDuration(180, 7200)).toBe(180)
  })

  it('uses each active element across audio to video to audio transitions', () => {
    const audioA = {}
    const video = {}
    const audioB = {}
    expect(isDeferredSeekStillCurrent({
      requestedElement: audioA,
      activeElement: video,
      requestedSource: 'audio-a',
      activeSource: 'video'
    })).toBe(false)
    expect(isDeferredSeekStillCurrent({
      requestedElement: video,
      activeElement: audioB,
      requestedSource: 'video',
      activeSource: 'audio-b'
    })).toBe(false)
    expect(isDeferredSeekStillCurrent({
      requestedElement: audioB,
      activeElement: audioB,
      requestedSource: 'audio-b',
      activeSource: 'audio-b'
    })).toBe(true)
  })

  it('rejects a deferred seek from an obsolete element even when source text matches', () => {
    expect(isDeferredSeekStillCurrent({
      requestedElement: {},
      activeElement: {},
      requestedSource: 'audio',
      activeSource: 'audio'
    })).toBe(false)
  })

  it('changes currentTime on active audio after video to audio without seeking stale video', () => {
    const staleVideo = { currentTime: 12 } as HTMLVideoElement
    const activeAudio = { currentTime: 0 } as HTMLVideoElement

    const staleRequestIsCurrent = isDeferredSeekStillCurrent({
      requestedElement: staleVideo,
      activeElement: activeAudio,
      requestedSource: 'video.mp4',
      activeSource: 'audio.mp3'
    })
    if (staleRequestIsCurrent) setCurrentTimeDebug(staleVideo, 'manualSeek', 42)

    const activeRequestIsCurrent = isDeferredSeekStillCurrent({
      requestedElement: activeAudio,
      activeElement: activeAudio,
      requestedSource: 'audio.mp3',
      activeSource: 'audio.mp3'
    })
    if (activeRequestIsCurrent) setCurrentTimeDebug(activeAudio, 'manualSeek', 42)

    expect(staleRequestIsCurrent).toBe(false)
    expect(staleVideo.currentTime).toBe(12)
    expect(activeRequestIsCurrent).toBe(true)
    expect(activeAudio.currentTime).toBe(42)
  })
})
