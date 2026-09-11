import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

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
const manage = overview.slice(
  overview.indexOf("aria-label={t('inspector.sectionManage')}"),
  overview.indexOf('className="inspector-panel__media-notes"')
)

describe('Overview horizontal Create alignment', () => {
  it('renders four full-width cards with title above description and shortcut on the right', () => {
    expect(create.match(/className="inspector-panel__create-btn inspector-panel__create-btn--/g)).toHaveLength(4)
    expect(styles).toMatch(/\.inspector-panel__create-actions\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/s)
    expect(styles).toMatch(/\.inspector-panel__create-btn\s*\{[^}]*grid-template-columns: auto minmax\(0, 1fr\) auto;/s)
    expect(styles).toMatch(/\.inspector-panel__create-btn\s*\{[^}]*width: 100%;/s)
    expect(create.match(/className="inspector-panel__create-btn-copy"><span className="inspector-panel__create-btn-label">/g)).toHaveLength(4)
    expect(create.match(/<\/span><span className="inspector-panel__create-btn-desc" title=/g)).toHaveLength(4)
    expect(styles).toMatch(/\.inspector-panel__create-btn-copy\s*\{[^}]*display: grid;[^}]*min-width: 0;/s)
  })

  it('retains approved icons, descriptions, shortcuts, handlers, and capability gates', () => {
    for (const [type, icon] of [['mask', 'MaskIcon'], ['mute', 'MuteIcon'], ['skip', 'SkipIcon'], ['bookmark', 'BookmarkIcon']]) {
      expect(create).toContain(`inspector-navigation-list__type--${type}`)
      expect(create).toContain(`<${icon} />`)
    }
    for (const shortcut of ['M', 'U', 'K', 'B']) {
      expect(create).toContain(`aria-hidden>${shortcut}</span>`)
    }
    expect(create.match(/className="inspector-panel__create-btn-desc" title=/g)).toHaveLength(4)
    expect(create).toContain("runAppMenuAction('addMask')")
    expect(create).toContain("runAppMenuAction('addMute')")
    expect(create).toContain("runAppMenuAction('addSkip')")
    expect(create).toContain('onClick={onAddBookmark}')
    expect(create).toContain('capabilities.canCreateMask')
    expect(create).toContain('capabilities.canCreateMuteRange')
    expect(create).toContain('capabilities.canCreateSkipRange')
    expect(create).toContain('capabilities.canCreateBookmark')
  })

  it('uses balanced full-width Overview spacing without horizontal overflow', () => {
    expect(styles).toMatch(/\.inspector-panel__overview\s*\{[^}]*scrollbar-gutter: stable both-edges;/s)
    expect(styles).toMatch(/\.inspector-panel__overview\s*\{[^}]*padding: 0\.1rem 0\.15rem 0;/s)
    expect(styles).toMatch(/\.inspector-panel__overview\s*\{[^}]*gap: 0\.4rem;/s)
    expect(styles).toMatch(/\.inspector-panel__header--navigation\s*\{[^}]*padding: 0\.72rem 0\.65rem 0\.55rem;/s)
    expect(styles).toMatch(/\.inspector-panel__tab-content\s*\{[^}]*padding: 0\.6rem;/s)
    expect(styles).toMatch(/\.inspector-panel__section-block\s*\{[^}]*width: 100%;[^}]*min-width: 0;/s)
    expect(styles).toMatch(/\.inspector-panel__create-actions\s*\{[^}]*width: 100%;[^}]*min-width: 0;/s)
    expect(styles).toMatch(/\.inspector-panel__summary-grid\s*\{[^}]*width: 100%;[^}]*min-width: 0;/s)
    expect(styles).toMatch(/\.inspector-panel__manage-actions\s*\{[^}]*width: 100%;[^}]*min-width: 0;/s)
    expect(styles).toMatch(/\.inspector-panel__media-notes\s*\{[^}]*width: 100%;[^}]*min-width: 0;/s)
  })

  it('preserves Summary content, click behavior, and four-column sizing', () => {
    expect(summary.match(/className="inspector-panel__summary-card"/g)).toHaveLength(4)
    expect(summary.match(/onClick=\{\(\) => openNavigationType\('/g)).toHaveLength(4)
    expect(styles).toMatch(/\.inspector-panel__summary-grid\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/s)
  })

  it('places Offset Shift and Manual VEIL Builder together in the final Manage row', () => {
    expect(manage).toContain('trackTools.map((item)')
    expect(manage).toContain('onClick={item.action}')
    expect(styles).toMatch(/\.inspector-panel__manage-actions\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s)
    expect(styles).toMatch(/\.inspector-panel__manage-button\s*\{[^}]*width: 100%;[^}]*white-space: nowrap;/s)
    expect(styles).toMatch(/\.app--ui-refresh-v1 \.inspector-panel__manage-button\s*\{[^}]*padding-inline: 0\.15rem;[^}]*font-size: 0\.72rem;/s)
    expect(styles).not.toMatch(/\.inspector-panel__manage-button:last-child\s*\{[^}]*grid-column: 1 \/ -1;/s)
  })

  it('preserves Media Notes behavior', () => {
    expect(overview).toContain('aria-expanded={mediaNotesExpanded}')
    expect(overview).toContain('setMediaNotesExpanded((expanded) => !expanded)')
    expect(overview).toContain("value={trackMetadata.summary ?? ''}")
    expect(overview).toContain('patchTrackMetadata({ summary: event.target.value })')
  })
})
