import { Children, createRef, isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PlaybackSeekBar } from '../PlaybackSeekBar'

vi.mock('../../hooks/useLanguage', () => ({ useLanguage: vi.fn() }))

import AudioTransportDock from './AudioTransportDock'

type TestElement = ReactElement<Record<string, any>>

function findByType(node: ReactNode, type: unknown): TestElement | undefined {
  if (!isValidElement(node)) return undefined
  if (node.type === type) return node as TestElement

  for (const child of Children.toArray((node.props as { children?: ReactNode }).children)) {
    const match = findByType(child, type)
    if (match) return match
  }
  return undefined
}

describe('AudioTransportDock playback seek bar', () => {
  it('uses the shared playback seek bar for local audio', () => {
    const onSeekInput = vi.fn()
    const tree = AudioTransportDock({
      videoRef: createRef<HTMLVideoElement>(),
      isPlaying: false,
      displayTime: 183,
      duration: 366,
      playbackRate: 1,
      subtitleSheetOpen: false,
      onTogglePlayPause: vi.fn(),
      onSeekRelative: vi.fn(),
      onSeekInput,
      onSeekStart: vi.fn(),
      onSeekEnd: vi.fn(),
      onPlaybackRateChange: vi.fn(),
      onAddMute: vi.fn(),
      onAddSkip: vi.fn(),
      onAddBookmark: vi.fn(),
      bookmarks: [],
      selectedBookmarkId: null,
      onSelectBookmark: vi.fn(),
      onSeekBookmark: vi.fn()
    })
    const seekBar = findByType(tree, PlaybackSeekBar)

    expect(seekBar).toBeDefined()
    expect(seekBar?.props.duration).toBe(366)
    expect(seekBar?.props.value).toBe(183)
    expect(seekBar?.props.onChange).toBe(onSeekInput)
    expect(seekBar?.props.disabled).toBe(false)
  })

  it('disables local-audio hover and seeking when duration is unavailable', () => {
    const tree = AudioTransportDock({
      videoRef: createRef<HTMLVideoElement>(),
      isPlaying: true,
      displayTime: 0,
      duration: Number.NaN,
      playbackRate: 1,
      subtitleSheetOpen: false,
      onTogglePlayPause: vi.fn(),
      onSeekRelative: vi.fn(),
      onSeekInput: vi.fn(),
      onSeekStart: vi.fn(),
      onSeekEnd: vi.fn(),
      onPlaybackRateChange: vi.fn(),
      onAddMute: vi.fn(),
      onAddSkip: vi.fn(),
      onAddBookmark: vi.fn(),
      bookmarks: [],
      selectedBookmarkId: null,
      onSelectBookmark: vi.fn(),
      onSeekBookmark: vi.fn()
    })
    const seekBar = findByType(tree, PlaybackSeekBar)

    expect(seekBar?.props.duration).toBe(0)
    expect(seekBar?.props.disabled).toBe(true)
  })
})
