import { describe, expect, it } from 'vitest'
import {
  shouldApplyAudioWatchSize,
  isWithinAudioWatchAcceptable,
  AUDIO_WATCH_WINDOW
} from './audioWatchLayout'

describe('window layout preset decisions', () => {
  it('forces compact size from large video-like bounds', () => {
    expect(shouldApplyAudioWatchSize({ width: 1280, height: 800 })).toBe(true)
  })

  it('keeps user compact size inside acceptable band', () => {
    expect(
      shouldApplyAudioWatchSize({
        width: AUDIO_WATCH_WINDOW.width,
        height: AUDIO_WATCH_WINDOW.height
      })
    ).toBe(false)
    expect(isWithinAudioWatchAcceptable({ width: 780, height: 420 })).toBe(true)
  })
})
