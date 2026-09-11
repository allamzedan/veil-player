import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolvePlaybackCapabilities } from './playbackCapabilities'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

const inspector = read('../components/InspectorPanel.tsx')
const styles = read('../styles.css')
const english = read('../i18n/en.ts')
const create = inspector.slice(
  inspector.indexOf('className="inspector-panel__create-actions"'),
  inspector.indexOf("aria-label={t('inspector.sectionSummary')}")
)
const summary = inspector.slice(
  inspector.indexOf('className="inspector-panel__summary-grid"'),
  inspector.indexOf("aria-label={t('inspector.sectionManage')}")
)

describe('Overview visual alignment', () => {
  it('uses the approved colored type icons in all four Create cards', () => {
    expect(create).toContain('<MaskIcon />')
    expect(create).toContain('<MuteIcon />')
    expect(create).toContain('<SkipIcon />')
    expect(create).toContain('<BookmarkIcon />')
    for (const type of ['mask', 'mute', 'skip', 'bookmark']) {
      expect(create).toContain(`inspector-navigation-list__type--${type}`)
    }
    expect(create).not.toContain('inspector-panel__create-btn-dot')
  })

  it('keeps exact Create descriptions on one tooltip-backed line', () => {
    expect(english).toContain("'inspector.addMaskDescription': 'Hide part of the video'")
    expect(english).toContain("'inspector.addMuteDescription': 'Silence audio for a range'")
    expect(english).toContain("'inspector.addSkipDescription': 'Jump over a segment'")
    expect(english).toContain("'inspector.addBookmarkDescription': 'Mark an important moment'")
    expect(create.match(/className="inspector-panel__create-btn-desc" title=/g)).toHaveLength(4)
    expect(styles).toMatch(/\.inspector-panel__create-btn-desc\s*\{[^}]*white-space: nowrap;/s)
    expect(styles).toMatch(/\.inspector-panel__create-btn-desc\s*\{[^}]*text-overflow: ellipsis;/s)
  })

  it('renders compact icon-count-label Summary cards in a four-column row', () => {
    expect(styles).toMatch(/\.inspector-panel__summary-grid\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/s)
    expect(summary.match(/className="inspector-panel__summary-card"/g)).toHaveLength(4)
    expect(summary.match(/className="inspector-panel__summary-card-value ltr-digits"/g)).toHaveLength(4)
    expect(summary.match(/className="inspector-panel__summary-card-label"/g)).toHaveLength(4)
    expect(summary).not.toContain('inspector-panel__summary-total--bookmarks')
    for (const type of ['mask', 'mute', 'skip', 'bookmark']) {
      expect(summary).toContain(`inspector-navigation-list__type--${type}`)
    }
  })

  it('retains accessible names, tooltips, handlers, counts, and capability gates', () => {
    expect(summary.match(/aria-label=\{t\(/g)).toHaveLength(4)
    expect(summary.match(/title=\{t\(/g)).toHaveLength(4)
    expect(create).toContain("onClick={() => runAppMenuAction('addMask')}")
    expect(create).toContain("onClick={() => runAppMenuAction('addMute')}")
    expect(create).toContain("onClick={() => runAppMenuAction('addSkip')}")
    expect(create).toContain('onClick={onAddBookmark}')
    expect(summary).toContain('{masks.length}')
    expect(summary).toContain('{mutes.length}')
    expect(summary).toContain('{skips.length}')
    expect(summary).toContain('{bookmarks.length}')
    expect(summary).toContain('capabilities.canCreateMask')
    expect(summary).toContain('capabilities.canCreateMuteRange')
    expect(summary).toContain('capabilities.canCreateSkipRange')
    expect(summary).toContain('capabilities.canEditBookmark')
  })

  it('keeps Summary capability-gated for YouTube and local audio', () => {
    const youtube = resolvePlaybackCapabilities({
      kind: 'youtube',
      provider: 'youtube',
      videoId: 'abc123def45',
      canonicalUrl: 'https://www.youtube.com/watch?v=abc123def45'
    }, 'video')
    const audio = resolvePlaybackCapabilities({
      kind: 'local',
      path: 'audio.mp3',
      mediaType: 'audio'
    }, 'audio')

    expect([youtube.canCreateMask, youtube.canCreateMuteRange, youtube.canCreateSkipRange, youtube.canEditBookmark])
      .toEqual([false, true, true, true])
    expect([audio.canCreateMask, audio.canCreateMuteRange, audio.canCreateSkipRange, audio.canEditBookmark])
      .toEqual([false, true, true, true])
  })

  it('wraps Summary in a controlled grid only when the Inspector is genuinely narrow', () => {
    expect(styles).toContain('container-name: inspector-overview;')
    expect(styles).toContain('@container inspector-overview (max-width: 230px)')
    expect(styles).toMatch(/@container inspector-overview \(max-width: 230px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/)
  })
})
