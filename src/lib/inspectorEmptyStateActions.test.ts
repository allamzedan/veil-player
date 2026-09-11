import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { t } from '../i18n'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('Navigate empty-state creation actions', () => {
  const inspector = read('../components/InspectorPanel.tsx')

  it('shows Open Overview for an unfiltered multi-type state instead of Add Bookmark', () => {
    expect(inspector).toContain("emptyStateAction === 'overview'")
    expect(inspector).toContain("t('inspector.openOverview')")
    expect(inspector).toContain("if (emptyStateAction === 'overview') setActiveView('overview')")
    expect(inspector).not.toContain("emptyStateKind === 'all' || emptyStateKind === 'bookmark'")
    expect(t('inspector.openOverview')).toBe('Open Overview')
  })

  it('uses the existing Mask, Mute, Skip, and Bookmark creation handlers', () => {
    expect(inspector).toContain("emptyStateAction === 'mask') runAppMenuAction('addMask')")
    expect(inspector).toContain("emptyStateAction === 'mute') runAppMenuAction('addMute')")
    expect(inspector).toContain("emptyStateAction === 'skip') runAppMenuAction('addSkip')")
    expect(inspector).toContain("emptyStateAction === 'bookmark') onAddBookmark()")
    expect(t('create.addMask')).toBe('Add Mask')
    expect(t('create.addMute')).toBe('Add Mute')
    expect(t('create.addSkip')).toBe('Add Skip')
    expect(t('bookmarks.add')).toBe('Add Bookmark')
  })

  it('renders no button when the resolved Active Now action is null', () => {
    expect(inspector).toContain('{emptyStateAction && emptyStateActionLabel ? (')
    expect(inspector).toContain("active: ['inspector.emptyActiveTitle', 'inspector.emptyActiveDescription']")
  })

  it('keeps the required empty-state copy and local-audio supported-type copy', () => {
    expect(t('inspector.emptyAllTitle')).toBe('No VEIL items yet')
    expect(t('inspector.emptyAllDescription')).toBe('Create a mask, mute, skip, or bookmark to begin.')
    expect(t('inspector.emptyAllAudioDescription')).toBe('Create a mute, skip, or bookmark to begin.')
    expect(t('inspector.emptyMasksTitle')).toBe('No masks yet')
    expect(t('inspector.emptyMutesTitle')).toBe('No mutes yet')
    expect(t('inspector.emptySkipsTitle')).toBe('No skips yet')
    expect(t('youtube.noBookmarksTitle')).toBe('No bookmarks yet')
    expect(t('inspector.emptyActiveTitle')).toBe('No active VEIL items')
  })

  it('does not change the existing status or type filter controls', () => {
    expect(inspector).toContain("(['all', 'active'] as const).map((status)")
    expect(inspector).toContain('{navigationTypes.map((filter) => (')
  })
})
