import { describe, expect, it } from 'vitest'
import { canCreateMasks } from './audioMode'
import {
  isAudioOnlyMedia,
  shouldShowAudioCompact,
  shouldShowMediaWorkspace,
  shouldUseAudioWorkspaceLayout
} from './audioWorkspace'

describe('audioWorkspace', () => {
  it('identifies audio-only media', () => {
    expect(isAudioOnlyMedia('audio')).toBe(true)
    expect(isAudioOnlyMedia('video')).toBe(false)
    expect(isAudioOnlyMedia(null)).toBe(false)
  })

  it('uses compact audio layout in watch mode', () => {
    expect(shouldShowAudioCompact('audio', 'watch')).toBe(true)
    expect(shouldShowAudioCompact('audio', 'edit')).toBe(false)
  })

  it('keeps video on normal workspace layout', () => {
    expect(shouldShowAudioCompact('video', 'watch')).toBe(false)
    expect(shouldUseAudioWorkspaceLayout('video', 'watch')).toBe(false)
    expect(shouldUseAudioWorkspaceLayout('video', 'edit')).toBe(false)
  })

  it('uses edit workspace layout for audio editing', () => {
    expect(shouldUseAudioWorkspaceLayout('audio', 'edit')).toBe(true)
    expect(shouldUseAudioWorkspaceLayout('audio', 'watch')).toBe(false)
  })

  it('treats loaded audio as media workspace instead of Home', () => {
    expect(shouldShowMediaWorkspace('file:///song.mp3', true, false, 'watch')).toBe(true)
    expect(shouldShowMediaWorkspace(null, true, false, 'watch')).toBe(false)
  })

  it('shows workspace for VEIL-only edit sessions without media', () => {
    expect(shouldShowMediaWorkspace(null, true, true, 'edit')).toBe(true)
    expect(shouldShowMediaWorkspace(null, true, true, 'watch')).toBe(false)
  })

  it('keeps masks disabled in audio mode', () => {
    expect(canCreateMasks('audio')).toBe(false)
    expect(canCreateMasks('video')).toBe(true)
  })
})
