import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { nextSubtitleOffset } from '../components/SubtitleOffsetControls'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('UI cleanup v1 contracts', () => {
  it('keeps media/application operations in File and VEIL actions in VEIL', () => {
    const menu = read('../components/AppMenuBar.tsx')
    const normalFile = menu.slice(menu.lastIndexOf("id: 'file'"), menu.indexOf("id: 'edit'"))
    expect(normalFile).toContain("id: 'openVideo'")
    expect(normalFile).toContain("id: 'openYouTube'")
    expect(normalFile).toContain('openRecentSubmenu')
    expect(normalFile).toContain("id: 'closeVideo'")
    expect(normalFile).toContain("id: 'settings'")
    for (const id of ['loadTrack', 'compareImportSidecar', 'saveTrack', 'saveTrackAs', 'closeTrack']) {
      expect(normalFile).not.toContain(`id: '${id}'`)
    }

    const normalVeil = menu.slice(menu.lastIndexOf("id: 'track'"), menu.indexOf("id: 'view'", menu.lastIndexOf("id: 'track'")))
    for (const id of ['loadTrack', 'compareImportSidecar', 'saveTrack', 'saveTrackAs', 'closeTrack', 'editVeil', 'importSrt', 'manualTrackBuilder', 'trackInfo', 'offsetShift']) {
      expect(normalVeil).toContain(`id: '${id}'`)
    }
    for (const id of ['addMask', 'addMute', 'addSkip', 'addBookmark']) {
      expect(normalVeil).not.toContain(`id: '${id}'`)
    }
    expect(normalVeil).not.toContain("id: 'groups'")
    expect(normalVeil).not.toContain("id: 'anchors'")
  })

  it('uses one contextual header action and separate dirty feedback', () => {
    const header = read('../components/DesktopTitleBar.tsx')
    expect(header).toContain("veilSessionActive ? t('watch.editTrack') : t('trackChip.createTrack')")
    expect(header).toContain('app-header__veil-dirty')
    expect(header).toContain('uiRefreshV1 && !isWatchChrome')
    expect(header).toContain('app-header__veil-primary')
    expect(header).toContain('className="btn btn-compact app-header__done"')
  })

  it('keeps the shorter VEIL menu available in compact Audio', () => {
    const menu = read('../components/AppMenuBar.tsx')
    const compactStart = menu.indexOf("if (audioWatchMode)")
    const compactEnd = menu.indexOf('\n    return [', compactStart)
    const compact = menu.slice(compactStart, compactEnd)
    expect(compact).toContain("id: 'track'")
    expect(compact).toContain("id: 'editVeil'")
    for (const id of ['addMask', 'addMute', 'addSkip', 'addBookmark']) {
      expect(compact).not.toContain(`id: '${id}'`)
    }
  })

  it('keeps About compact, readable, current, and locally truthful', () => {
    const about = read('../components/AboutDialog.tsx')
    const styles = read('../styles.css')
    const english = read('../i18n/en.ts')
    expect(about).toContain('modal__panel--about')
    expect(about).toContain('about-dialog__copy')
    expect(about).not.toContain('refreshPreviewNotice')
    expect(styles).toContain('@media (max-height: 520px)')
    expect(styles).toMatch(/\.modal__panel--about \{[\s\S]*?overflow: hidden;/)
    expect(english).toContain('Media files remain local')
    expect(english).toContain('does not send telemetry')
  })

  it('renders duration units and accumulates subtitle offset steps', () => {
    const settings = read('../components/SettingsDialog.tsx')
    expect(settings.match(/settings-dialog__number-with-unit/g)).toHaveLength(2)
    expect(settings.match(/<span aria-hidden="true">s<\/span>/g)).toHaveLength(2)
    let offset = 0
    offset = nextSubtitleOffset(offset, 0.5)
    offset = nextSubtitleOffset(offset, 0.5)
    offset = nextSubtitleOffset(offset, 0.5)
    expect(offset).toBe(1.5)
  })

  it('exposes YouTube fullscreen CC and anchors volume above the rail', () => {
    const overlay = read('../components/FullscreenEditOverlay.tsx')
    const styles = read('../styles.css')
    expect(overlay).toContain('showCc={capabilities.canImportCustomSubtitles}')
    expect(styles).toMatch(/\.fullscreen-overlay--youtube-sibling \.volume-control__popup \{\n  top: auto;\n  bottom: calc\(100% \+ 0\.4rem\);/)
  })

  it('does not schedule startup HUD text and keeps feedback user-triggered', () => {
    const player = read('../components/VideoPlayer.tsx')
    expect(player).toContain("if (options?.showHud === false) return")
    expect(player).toContain("applyPlaybackRate(1, { showHud: false })")
    expect(player).toContain("{ showHud: true }")
    const overlay = read('../components/FullscreenEditOverlay.tsx')
    expect(overlay).not.toContain('fullscreen-overlay__top-hud')
    expect(overlay).not.toContain('fullscreen-overlay__watch-hint')
  })
})
