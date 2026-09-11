import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES } from './playbackActivityPreferences'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('Settings organization', () => {
  it('uses two-pane navigation and renders only the active section content', () => {
    const dialog = read('../components/SettingsDialog.tsx')
    for (const section of ['general', 'playback', 'subtitles', 'contentReview', 'appearance', 'shortcuts', 'about']) {
      expect(dialog).toContain(`'${section}'`)
    }
    expect(dialog).not.toContain("'privacy',")
    expect(dialog).toContain('settings-dialog__nav')
    expect(dialog).toContain('sectionContent')
    expect(dialog).toContain('{sectionContent}')
    expect(dialog).toContain('onNavKeyDown')
    expect(dialog).toContain('writeShowStatusBar(next)')
    expect(dialog).toContain("writeThemePreference('system')")
    expect(dialog).toContain("t('settings.theme')")
    expect(dialog).toContain("t('settings.themeSystemDescription')")
    expect(dialog).toContain("t('settings.themeLightDescription')")
    expect(dialog).toContain("t('settings.themeDarkDescription')")
    expect(dialog).toContain('settings-theme')
    expect(dialog).not.toContain('useRefreshedInterface')
    expect(dialog).toContain('setLanguage(event.target.value as LanguageCode)')
    expect(dialog).toContain('<MotionSettingsPanel />')
    expect(dialog).toContain('<SubtitleAppearanceControls />')
    expect(dialog).toContain('<SubtitleOffsetControls />')
    expect(dialog).toContain('settings-subtitle-mode')
    expect(dialog).toContain('settings-dialog__number-with-unit')
    expect(dialog).toContain("t('settings.subtitleDisplayMode')")
    expect(dialog).toContain("t('settings.subtitleContentReview')")
    expect(dialog).toContain("description: t('subtitles.showDescription')")
    expect(dialog).toContain("description: t('subtitles.smartCoverDescription')")
    expect(dialog).toContain("description: t('subtitles.regionCoverDescription')")
    expect(dialog).toContain('settings-dialog__subtitle-mode-copy')
    expect(dialog).toContain("contentReview: (")
    expect(dialog).toContain("{t('watch.done')}")
    expect(read('../components/SubtitleOffsetControls.tsx')).toContain("t('settings.subtitleTiming')")
  })

  it('keeps playback controls and product defaults unchanged', () => {
    const dialog = read('../components/SettingsDialog.tsx')
    expect(dialog).toContain('playbackActivity.showFullscreenVeilRail')
    for (const key of ['defaultMaskDurationSeconds', 'defaultMuteDurationSeconds', 'defaultSkipDurationSeconds']) {
      expect(dialog).toContain(`'${key}'`)
    }
    expect(dialog).toContain('playbackActivity.bookmarkActivityDurationMs')
    expect(DEFAULT_PLAYBACK_ACTIVITY_PREFERENCES).toEqual({
      showFullscreenVeilRail: true,
      defaultMaskDurationSeconds: 5,
      defaultMuteDurationSeconds: 5,
      defaultSkipDurationSeconds: 5,
      bookmarkActivityDurationMs: 4000
    })
  })

  it('supports keyboard section navigation without custom tab indices', () => {
    const dialog = read('../components/SettingsDialog.tsx')
    expect(dialog).not.toContain('tabIndex=')
    expect(dialog).toContain('ArrowDown')
    expect(dialog).toContain('ArrowUp')
    expect(dialog).toContain('Home')
    expect(dialog).toContain('End')
  })
})
