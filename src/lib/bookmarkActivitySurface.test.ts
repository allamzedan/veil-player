import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import BookmarkActivitySurface from '../components/BookmarkActivitySurface'
import type { BookmarkTrackItem } from '../types/track'

const bookmark: BookmarkTrackItem = {
  id: 'bookmark-activity',
  type: 'bookmark',
  start: 105,
  end: 105,
  label: 'مراجعة — Review',
  notes: 'ملاحظة mixed note',
  enabled: true
}

const handlers = () => ({
  onSaveDetails: vi.fn(),
  onDelete: vi.fn(),
  onDismiss: vi.fn()
})

describe('consolidated bookmark activity surface', () => {
  it('renders bright semantic text, LTR time, mixed-direction content, and Edit', () => {
    const html = renderToStaticMarkup(createElement(BookmarkActivitySurface, {
      bookmark,
      ...handlers()
    }))

    expect(html).toContain('bookmark-activity-surface')
    expect(html).toContain('class="bookmark-activity-surface__time ltr-digits" dir="ltr"')
    expect(html).toContain('1:45')
    expect(html.match(/dir="auto"/g)).toHaveLength(2)
    expect(html).toContain('مراجعة — Review')
    expect(html).toContain('ملاحظة mixed note')
    expect(html).toContain('aria-label="Edit bookmark details"')
  })

  it('uses the same inline surface for initial creation editing', () => {
    const html = renderToStaticMarkup(createElement(BookmarkActivitySurface, {
      bookmark,
      initiallyEditing: true,
      ...handlers()
    }))

    expect(html).toContain('bookmark-activity-surface--editing')
    expect(html).toContain('aria-label="Label"')
    expect(html).toContain('aria-label="Notes"')
    expect(html).toContain('aria-label="Save bookmark details"')
    expect(html).toContain('aria-label="Cancel bookmark editing"')
    expect(html).not.toContain('bookmark-side-toast')
  })

  it('keeps bookmarks point-based while editing presentation only', () => {
    expect(bookmark.start).toBe(bookmark.end)
    expect(renderToStaticMarkup(createElement(BookmarkActivitySurface, {
      bookmark,
      ...handlers()
    }))).not.toContain('Duration')
  })
})
