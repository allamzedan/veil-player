import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import BookmarkActivitySurface from '../components/BookmarkActivitySurface'
import type { BookmarkTrackItem } from '../types/track'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const bookmark: BookmarkTrackItem = {
  id: 'bookmark-activity',
  type: 'bookmark',
  start: 105,
  end: 105,
  label: 'مراجعة — Review',
  notes: 'ملاحظة mixed note'
}

describe('shared local and YouTube bookmark activity surface', () => {
  it('renders compact bidi-safe passive activity with an Edit affordance', () => {
    const html = renderToStaticMarkup(createElement(BookmarkActivitySurface, {
      bookmark,
      onSaveDetails: vi.fn(),
      onDelete: vi.fn(),
      onDismiss: vi.fn()
    }))

    expect(html).toContain('bookmark-activity-surface')
    expect(html).toContain('class="bookmark-activity-surface__time ltr-digits" dir="ltr"')
    expect(html.match(/dir="auto"/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Edit bookmark details"')
  })

  it('uses the same surface and save/cancel path for initial editing', () => {
    const html = renderToStaticMarkup(createElement(BookmarkActivitySurface, {
      bookmark,
      initiallyEditing: true,
      onSaveDetails: vi.fn(),
      onDelete: vi.fn(),
      onDismiss: vi.fn()
    }))

    expect(html).toContain('bookmark-activity-surface--editing')
    expect(html).toContain('Save bookmark details')
    expect(html).toContain('Cancel bookmark editing')
    expect(html).not.toContain('bookmark-side-toast')
  })

  it('keeps windowed activity in the shared source area and fullscreen outside iframe pixels', () => {
    const player = read('../components/VideoPlayer.tsx')
    const overlay = read('../components/FullscreenEditOverlay.tsx')
    const styles = read('../styles.css')

    expect(player).toContain('!isFullscreen && bookmarkToast')
    expect(player).toContain('<BookmarkActivitySurface')
    expect(player).toContain("layoutMode={isYouTube ? 'youtube-sibling' : 'overlay'}")
    expect(overlay).toContain('fullscreen-overlay__youtube-activity')
    expect(overlay).toContain('<BookmarkActivitySurface')
    expect(styles).toContain('grid-template-columns: subgrid')
  })

  it('routes crossings, marker selection, and creation through the existing bridge', () => {
    const player = read('../components/VideoPlayer.tsx')
    expect(player).toContain('findCrossedBookmark')
    expect(player).toContain('requestBookmarkToast(id)')
    expect(player).toContain('showBookmarkToast(createdBookmarkId, true)')
    expect(player).toContain('bookmarkActivity={bookmarkToast}')
  })
})
