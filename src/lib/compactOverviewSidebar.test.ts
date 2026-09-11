import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolvePlaybackCapabilities } from './playbackCapabilities'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

const inspector = read('../components/InspectorPanel.tsx')
const styles = read('../styles.css')
const overview = inspector.slice(
  inspector.indexOf('id={`${tabPrefix}-overview-panel`}'),
  inspector.indexOf('id={`${tabPrefix}-navigate-panel`}')
)
const create = overview.slice(
  overview.indexOf('className="inspector-panel__create-actions"'),
  overview.indexOf("aria-label={t('inspector.sectionSummary')}")
)
const summary = overview.slice(
  overview.indexOf('className="inspector-panel__summary-grid"'),
  overview.indexOf("aria-label={t('inspector.sectionManage')}")
)
const manageDefinition = inspector.slice(
  inspector.indexOf('const trackTools: InspectorMenuItem[]'),
  inspector.indexOf('const navigationTypes')
)
const manageView = overview.slice(
  overview.indexOf("aria-label={t('inspector.sectionManage')}"),
  overview.indexOf('className="inspector-panel__media-notes"')
)

describe('compact Overview sidebar', () => {
  it('keeps the four existing Create actions, icons, descriptions, handlers, and gates', () => {
    for (const type of ['mask', 'mute', 'skip', 'bookmark']) {
      expect(create).toContain(`inspector-panel__create-btn--${type}`)
      expect(create).toContain(`inspector-navigation-list__type--${type}`)
    }
    expect(create).toContain("runAppMenuAction('addMask')")
    expect(create).toContain("runAppMenuAction('addMute')")
    expect(create).toContain("runAppMenuAction('addSkip')")
    expect(create).toContain('onClick={onAddBookmark}')
    expect(create).toContain('capabilities.canCreateMask')
    expect(create).toContain('capabilities.canCreateMuteRange')
    expect(create).toContain('capabilities.canCreateSkipRange')
    expect(create).toContain('capabilities.canCreateBookmark')
    expect(styles).toMatch(/\.inspector-panel__create-actions\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/s)
  })

  it('keeps four live counts and opens Navigate with the matching All/type filter', () => {
    expect(summary).toContain('{masks.length}')
    expect(summary).toContain('{mutes.length}')
    expect(summary).toContain('{skips.length}')
    expect(summary).toContain('{bookmarks.length}')
    for (const type of ['mask', 'mute', 'skip', 'bookmark']) {
      expect(summary).toContain(`onClick={() => openNavigationType('${type}')}`)
    }
    expect(inspector).toContain("setNavigationStatus('all')")
    expect(inspector).toContain('setNavigationType(type)')
    expect(inspector).toContain("setActiveView('navigate')")
    expect(styles).toMatch(/\.inspector-panel__summary-grid\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/s)
  })

  it('keeps the four primary Manage actions and hides Groups and Anchors for 0.8.0', () => {
    expect(manageDefinition.match(/id: '/g)).toHaveLength(4)
    expect(manageDefinition).toContain("{ id: 'layers', label: t('trackTools.layers'), action: () => onOpenTrackTool('layers') }")
    expect(manageDefinition).toContain("{ id: 'subtitles', label: t('trackTools.subtitles'), action: () => onOpenTrackTool('subtitles') }")
    expect(manageDefinition).not.toContain("id: 'groups'")
    expect(manageDefinition).not.toContain("id: 'anchors'")
    expect(manageDefinition).toContain("{ id: 'offset', label: t('trackTools.offsetShift'), action: () => onOpenTrackTool('offset') }")
    expect(manageDefinition).toContain("{ id: 'manual', label: t('trackTools.manualBuilder'), action: () => onOpenTrackTool('manual-builder') }")
    expect(manageView).toContain('trackTools.map((item)')
    expect(manageView).toContain('onClick={item.action}')
    expect(styles).toMatch(/\.inspector-panel__manage-actions\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s)
    expect(styles).not.toMatch(/\.inspector-panel__manage-button:last-child\s*\{[^}]*grid-column: 1 \/ -1;/s)
  })

  it('defaults empty Media Notes compact, opens stored notes, and preserves the summary binding', () => {
    expect(inspector).toContain('() => Boolean(useVeilStore.getState().trackMetadata.summary?.trim())')
    expect(inspector).toContain('setMediaNotesExpanded(Boolean(useVeilStore.getState().trackMetadata.summary?.trim()))')
    expect(overview).toContain('aria-expanded={mediaNotesExpanded}')
    expect(overview).toContain('setMediaNotesExpanded((expanded) => !expanded)')
    expect(overview).toContain("trackMetadata.summary?.trim() || t('inspector.mediaNotesEmpty')")
    expect(overview).toContain("value={trackMetadata.summary ?? ''}")
    expect(overview).toContain('patchTrackMetadata({ summary: event.target.value })')
    expect(overview).toContain('mediaNotesExpanded ? (')
  })

  it('keeps local video, local audio, and YouTube capability exposure unchanged', () => {
    const video = resolvePlaybackCapabilities({ kind: 'local', path: 'video.mp4', mediaType: 'video' }, 'video')
    const audio = resolvePlaybackCapabilities({ kind: 'local', path: 'audio.mp3', mediaType: 'audio' }, 'audio')
    const youtube = resolvePlaybackCapabilities({
      kind: 'youtube',
      provider: 'youtube',
      videoId: 'abc123def45',
      canonicalUrl: 'https://www.youtube.com/watch?v=abc123def45'
    }, 'video')

    expect([video.canCreateMask, video.canCreateMuteRange, video.canCreateSkipRange, video.canEditBookmark]).toEqual([true, true, true, true])
    expect([audio.canCreateMask, audio.canCreateMuteRange, audio.canCreateSkipRange, audio.canEditBookmark]).toEqual([false, true, true, true])
    expect([youtube.canCreateMask, youtube.canCreateMuteRange, youtube.canCreateSkipRange, youtube.canEditBookmark]).toEqual([false, true, true, true])
  })

  it('keeps tabs, Navigate, Details, sidebar visibility, and schema contracts intact', () => {
    const player = read('../components/VideoPlayer.tsx')
    expect(inspector).toContain("type InspectorTab = 'overview' | 'navigate' | 'details'")
    expect(inspector).toContain('inspector-navigation-filter-groups')
    expect(inspector).toContain('className="inspector-details"')
    expect(player).not.toContain('inspector-dock__collapse')
    expect(inspector).toContain('inspector-panel__collapse-action')
    expect(player).toContain('className="inspector-dock__show"')
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
})
