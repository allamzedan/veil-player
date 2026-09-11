import { describe, expect, it } from 'vitest'
import { classifyWorkspaceDrop } from './workspaceDrop'

describe('classifyWorkspaceDrop', () => {
  it('routes media drops when video is already open', () => {
    expect(classifyWorkspaceDrop('clip-b.mp4', 'video/mp4', true)).toEqual({ kind: 'media' })
    expect(classifyWorkspaceDrop('song.mp3', 'audio/mpeg', true)).toEqual({ kind: 'media' })
  })

  it('loads VEIL on current media without entering edit-only mode', () => {
    expect(classifyWorkspaceDrop('track.veil', '', true)).toEqual({
      kind: 'veil',
      enterEditMode: false
    })
  })

  it('enters VEIL-only edit mode when no media is open', () => {
    expect(classifyWorkspaceDrop('track.veil', '', false)).toEqual({
      kind: 'veil',
      enterEditMode: true
    })
  })

  it('rejects unsupported files', () => {
    expect(classifyWorkspaceDrop('notes.txt', 'text/plain', true)).toEqual({ kind: 'unsupported' })
  })
})
