import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { t } from '../i18n'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('bookmark navigation presentation', () => {
  it('renders bookmarks on the ruler without a dedicated bookmark lane', () => {
    const editor = read('../components/TimelineEditor.tsx')
    const ruler = read('../components/TimelineRuler.tsx')
    expect(editor).not.toContain('TimelineBookmarkRow')
    expect(editor).not.toContain("t('timeline.bookmarks')")
    expect(ruler).toContain('<TimelineBookmarkMarkers')
    expect(ruler).toContain('onSelectBookmark')
    expect(ruler).not.toContain('onSeekBookmark')
  })

  it('keeps supported local range lanes in the shared timeline', () => {
    const editor = read('../components/TimelineEditor.tsx')
    expect(editor).toContain("label: t('timeline.masks')")
    expect(editor).toContain("label: t('timeline.mutes')")
    expect(editor).toContain("label: t('timeline.skips')")
    expect(editor).toContain('timeline-editor__lane-headers')
    expect(editor).toContain('hasRangeAuthoring')
  })

  it('uses Overview, Navigate, and Details tabs while local video defaults to Overview', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    expect(inspector).toContain("type InspectorTab = 'overview' | 'navigate' | 'details'")
    expect(inspector).toContain('shouldDefaultInspectorToVeilTools')
    expect(inspector).toContain("? 'overview'")
    expect(inspector).toContain("role=\"tablist\"")
    expect(inspector).toContain("aria-selected={activeView === tab.id}")
    expect(inspector).toContain("{ id: 'overview', label: t('inspector.overview') }")
    expect(inspector).toContain("{ id: 'navigate', label: t('inspector.navigate') }")
    expect(inspector).toContain("{ id: 'details', label: t('inspector.details') }")
    expect(inspector).not.toContain("id: 'notes'")
  })

  it('presents Media Notes while retaining the summary storage field', () => {
    const inspector = read('../components/InspectorPanel.tsx')
    expect(inspector).toContain("t('inspector.mediaNotes')")
    expect(inspector).toContain('value={trackMetadata.summary')
    expect(inspector).toContain('patchTrackMetadata({ summary: event.target.value })')
    expect(t('inspector.mediaNotes')).toBe('Media Notes')
    expect(t('inspector.mediaNotesHelper')).toBe(
      'Notes about the entire video. These are not tied to a timestamp.'
    )
  })

  it('keeps the reusable navigation list independent from the timeline DOM', () => {
    const list = read('../components/BookmarkNavigationList.tsx')
    expect(list).toContain('bookmarks: BookmarkTrackItem[]')
    expect(list).toContain('selectedBookmarkId: string | null')
    expect(list).toContain('onCopyTimestamp')
    expect(list).not.toContain('TimelineEditor')
    expect(list).not.toContain('querySelector')
  })
})
