import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('subtitle quick controls', () => {
  it('presents a semantic empty state with primary Load and secondary Settings actions', () => {
    const controls = read('../components/SrtImportControls.tsx')
    const sheet = read('../components/SubtitleSheet.tsx')
    expect(controls).toContain('isSheet && cueCount === 0')
    expect(controls).toContain('<SubtitleFileIcon size={25} />')
    expect(controls).toContain("t('subtitles.noSubtitleLoaded')")
    expect(controls).toContain("t('subtitles.emptyDescription')")
    expect(controls).toContain('className="btn btn-primary subtitle-sheet__empty-action"')
    expect(controls).toContain('<UploadFileIcon size={16} />')
    expect(controls).toContain('onClick={onImportClick}')
    expect(controls).toContain('<SettingsIcon size={16} />')
    expect(controls).toContain("t('subtitles.openSettings')")
    expect(sheet).toContain('titleIcon={<CaptionsIcon')
    expect(sheet).toContain('subtitle-sheet__footer-helper')
  })

  it('keeps the loaded sheet to visibility, replace, review, remove, and Settings actions', () => {
    const controls = read('../components/SrtImportControls.tsx')
    const loadedStart = controls.indexOf('{isSheet && cueCount > 0 ? (')
    const loadedEnd = controls.indexOf('{!isSheet ? (', loadedStart)
    const loadedSheet = controls.slice(loadedStart, loadedEnd)

    expect(loadedSheet).toContain('setShowSubtitleText(!showSubtitleText)')
    expect(loadedSheet).toContain("t('subtitles.replaceSubtitle')")
    expect(loadedSheet).toContain("t('contentReview.reviewContent')")
    expect(loadedSheet).toContain('onClick={onReviewContent}')
    expect(loadedSheet).toContain("t('subtitles.openSettings')")
    expect(loadedSheet).toContain("t('subtitles.removeSubtitle')")
    expect(loadedSheet).toContain('onClick={onClearCues}')
    expect(loadedSheet).toContain('title={subtitleFileName ?? undefined}')
    expect(loadedSheet).toContain("t('subtitles.loadedStatus')")
    expect(loadedSheet).toContain('showSubtitleText ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />')
    expect(loadedSheet).toContain('<RefreshIcon size={15} />')
    expect(loadedSheet).toContain('<ZoomToSelectionIcon size={15} />')
    expect(loadedSheet).toContain('<TrashIcon size={15} />')
    expect(loadedSheet).toContain('<SettingsIcon size={15} />')
    expect(loadedSheet).not.toContain('<SubtitleAppearanceControls')
    expect(loadedSheet).not.toContain('<SubtitleNavigationControls')
    expect(loadedSheet).not.toContain('subtitle-cover-mode-sheet')
  })

  it('safely constrains long filenames and keeps loaded actions aligned and responsive', () => {
    const styles = read('../styles.css')
    expect(styles).toMatch(/\.subtitle-sheet__file-copy \{[\s\S]*?min-width: 0;/)
    expect(styles).toMatch(
      /\.subtitle-sheet__file-name \{[\s\S]*?overflow: hidden;[\s\S]*?text-overflow: ellipsis;[\s\S]*?white-space: nowrap;/
    )
    expect(styles).toContain(
      'grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr))'
    )
    expect(styles).toMatch(
      /\.subtitle-sheet__loaded-state \.subtitle-sheet__quick-actions \.btn,[\s\S]*?min-height: 2\.15rem;/
    )
  })

  it('connects imported cues to the transient Content Review offer and intent actions', () => {
    const controls = read('../components/SrtImportControls.tsx')

    expect(controls).toContain(
      'contentReviewPreferences.analyzeImportedSubtitles'
    )
    expect(controls).toContain('analyzeImportedCues(')
    expect(controls).toContain('contentReviewOfferVisible ? (')
    expect(controls).toContain(
      "t('contentReview.offerCount', {"
    )
    expect(controls).toContain('onClick={reviewContentNow}')
    expect(controls).toContain('onClick={deferContentReview}')
    expect(controls).toContain('requestReviewForCues(subtitleCues)')
    expect(controls).toContain("pushSuccessToast(t('contentReview.noneFound'))")
  })

  it('unloads without a confirmation or file deletion path', () => {
    const controls = read('../components/SrtImportControls.tsx')
    const clearStart = controls.indexOf('const onClearCues = (): void =>')
    const clearEnd = controls.indexOf('if (!capabilities.canImportCustomSubtitles)', clearStart)
    const clearAction = controls.slice(clearStart, clearEnd)
    expect(clearAction).toContain('clearSubtitleCues()')
    expect(clearAction).toContain('setShowSubtitleText(false)')
    expect(clearAction).not.toContain('confirmNative')
  })

  it('closes the quick sheet before opening Settings at Subtitles', () => {
    const player = read('../components/VideoPlayer.tsx')
    expect(player.match(/setSubtitleSheetOpen\(false\)\n\s+requestSettingsSection\('subtitles'\)/g)).toHaveLength(2)
    const sheet = read('../components/SubtitleSheet.tsx')
    expect(sheet).toContain('onOpenSubtitleSettings={onOpenSettings}')
  })

  it('places appearance, cover mode, and timing configuration in Settings', () => {
    const settings = read('../components/SettingsDialog.tsx')
    expect(settings).toContain('<SubtitleAppearanceControls />')
    expect(settings).toContain('settings-subtitle-mode')
    expect(settings).toContain('<SubtitleOffsetControls />')
  })
})
