import { beforeEach, describe, expect, it } from 'vitest'
import { parseSrt } from './srtParser'
import { useVeilStore } from '../state/useVeilStore'

describe('subtitle resurrection store', () => {
  beforeEach(() => {
    useVeilStore.getState().clearSubtitleCues()
    useVeilStore.getState().setShowSubtitleText(false)
    useVeilStore.getState().setSubtitleCoverMode('show', { markDirty: false })
    useVeilStore.getState().setGlobalOffsetSeconds(0)
  })

  it('stores subtitle file name on first import', () => {
    const { cues } = parseSrt(`1
00:00:01,000 --> 00:00:02,000
Hello`)

    useVeilStore.getState().setSubtitleCues(cues)
    useVeilStore.getState().setSubtitleFileName('Movie.srt')

    expect(useVeilStore.getState().subtitleFileName).toBe('Movie.srt')
    expect(useVeilStore.getState().subtitleCues).toHaveLength(1)
  })

  it('clears subtitle session without touching track items', () => {
    useVeilStore.getState().setSubtitleCues(
      parseSrt(`1
00:00:01,000 --> 00:00:02,000
Hi`).cues
    )
    useVeilStore.getState().setSubtitleFileName('clip.srt')
    useVeilStore.getState().setShowSubtitleText(true)

    const maskCountBefore = useVeilStore.getState().masks.length
    useVeilStore.getState().clearSubtitleCues()
    useVeilStore.getState().setShowSubtitleText(false)

    expect(useVeilStore.getState().subtitleCues).toHaveLength(0)
    expect(useVeilStore.getState().subtitleFileName).toBeNull()
    expect(useVeilStore.getState().showSubtitleText).toBe(false)
    expect(useVeilStore.getState().masks.length).toBe(maskCountBefore)
  })

  it('shifts subtitle cues when track has no items', () => {
    const { cues } = parseSrt(`1
00:00:01,000 --> 00:00:02,000
Shift me`)

    useVeilStore.getState().setSubtitleCues(cues)
    useVeilStore.getState().shiftAllTrackItems(1.5)

    expect(useVeilStore.getState().subtitleCues[0]?.start).toBe(2.5)
    expect(useVeilStore.getState().subtitleCues[0]?.end).toBe(3.5)
  })

  it('switches subtitle cover modes', () => {
    useVeilStore.getState().setSubtitleCoverMode('smartCover', { markDirty: false })
    expect(useVeilStore.getState().subtitleCoverMode).toBe('smartCover')

    useVeilStore.getState().setSubtitleCoverMode('regionCover', { markDirty: false })
    expect(useVeilStore.getState().subtitleCoverMode).toBe('regionCover')

    useVeilStore.getState().setSubtitleCoverMode('show', { markDirty: false })
    expect(useVeilStore.getState().subtitleCoverMode).toBe('show')
  })

  it('loads, hides without losing cues, and removes without changing source text', () => {
    const sourceText = [
      '1',
      '00:00:01,000 --> 00:00:02,000',
      'Lifecycle cue'
    ].join('\n')
    const { cues } = parseSrt(sourceText)

    useVeilStore.getState().setSubtitleCues(cues)
    useVeilStore.getState().setSubtitleFileName('lifecycle.srt')
    useVeilStore.getState().setShowSubtitleText(true)
    expect(useVeilStore.getState().subtitleCues).toHaveLength(1)

    useVeilStore.getState().setShowSubtitleText(false)
    expect(useVeilStore.getState().subtitleCues).toEqual(cues)
    expect(sourceText).toContain('Lifecycle cue')

    useVeilStore.getState().clearSubtitleCues()
    expect(useVeilStore.getState().subtitleCues).toHaveLength(0)
    expect(useVeilStore.getState().subtitleFileName).toBeNull()
    expect(sourceText).toBe([
      '1',
      '00:00:01,000 --> 00:00:02,000',
      'Lifecycle cue'
    ].join('\n'))
  })
})
