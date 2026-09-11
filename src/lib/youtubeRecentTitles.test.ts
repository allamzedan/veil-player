import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { PersistedRecentVideo } from '../../electron/lib/recentHistoryStore'
import { recentVideoLabel, recentVideoTitle } from './recentHistory'

const youtubeEntry = (name: string): PersistedRecentVideo => ({
  kind: 'youtube',
  name,
  mediaKey: 'Royv6Vqz7S4',
  videoId: 'Royv6Vqz7S4',
  canonicalUrl: 'https://www.youtube.com/watch?v=Royv6Vqz7S4',
  openedAt: 1
})

describe('YouTube recent title presentation', () => {
  it('shows and preserves the full stored mixed-language title', () => {
    const title = 'أحمد سعد - Mekassarat (Official Music Video)'
    expect(recentVideoLabel(youtubeEntry(title))).toBe(title)
    expect(recentVideoTitle(youtubeEntry(title))).toBe(title)
  })

  it('uses a human-friendly fallback without exposing the raw video id', () => {
    expect(recentVideoLabel(youtubeEntry('YouTube video'))).toBe('YouTube video')
    expect(recentVideoLabel(youtubeEntry('YouTube — Royv6Vqz7S4'))).toBe('YouTube video')
    expect(recentVideoLabel(youtubeEntry('Royv6Vqz7S4'))).toBe('YouTube video')
    expect(recentVideoTitle(youtubeEntry('YouTube video'))).toContain('Royv6Vqz7S4')
  })

  it('keeps visual truncation in CSS rather than truncating stored data', () => {
    const launcherCss = readFileSync(new URL('../launcher/launcher.css', import.meta.url), 'utf8')
    const appCss = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
    expect(launcherCss).toContain('text-overflow: ellipsis')
    expect(appCss).toContain('.app-menu__sublist .app-menu__item-label')
    expect(appCss).toContain('text-overflow: ellipsis')
  })
})
