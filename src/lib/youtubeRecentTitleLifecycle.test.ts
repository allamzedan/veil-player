import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeYouTubeRecentTitle,
  recordRecentYouTube,
  updateRecentYouTubeTitle
} from './sessionRecovery'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('YouTube recent title metadata lifecycle', () => {
  it('records a generic identity and keeps later provider metadata transient', () => {
    const recordRecentVideo = vi.fn(() => Promise.resolve({ videos: [], veils: [] }))
    const updateTitle = vi.fn(() => Promise.resolve({ videos: [], veils: [] }))
    vi.stubGlobal('window', {
      veil: {
        recordRecentVideo,
        updateRecentYouTubeTitle: updateTitle
      }
    })

    recordRecentYouTube({
      kind: 'youtube',
      provider: 'youtube',
      videoId: 'Royv6Vqz7S4',
      canonicalUrl: 'https://www.youtube.com/watch?v=Royv6Vqz7S4'
    })
    updateRecentYouTubeTitle('Royv6Vqz7S4', 'أحمد سعد - Mekassarat')

    expect(recordRecentVideo).toHaveBeenCalledWith(expect.objectContaining({
      name: 'YouTube video',
      videoId: 'Royv6Vqz7S4'
    }))
    expect(updateTitle).not.toHaveBeenCalled()
  })

  it('does not treat fallback or identity labels as real titles', () => {
    expect(normalizeYouTubeRecentTitle('Royv6Vqz7S4', 'YouTube video')).toBeNull()
    expect(normalizeYouTubeRecentTitle('Royv6Vqz7S4', 'Royv6Vqz7S4')).toBeNull()
    expect(normalizeYouTubeRecentTitle('Royv6Vqz7S4', 'YouTube — Royv6Vqz7S4')).toBeNull()
  })

  it('wires both official and iframe metadata transitions to recent enrichment', () => {
    const player = readFileSync(new URL('../components/VideoPlayer.tsx', import.meta.url), 'utf8')
    expect(player.match(/updateRecentYouTubeTitle\(videoId, [^)]+\.title\)/g)).toHaveLength(2)
  })
})
