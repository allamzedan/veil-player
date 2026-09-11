import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ContentReviewFinding } from '../lib/contentReview'
import {
  filterContentReviewFindings,
  formatContentReviewRange,
  getNextContentReviewFilter
} from './ContentReviewDialog'

const findings: ContentReviewFinding[] = [
  {
    id: 'finding-violence',
    start: 2.25,
    end: 3.75,
    category: 'violenceRelatedLanguage',
    cueText: 'A weapon is mentioned.',
    contextBefore: [{ start: 1, end: 2, text: 'Before' }],
    contextAfter: [{ start: 4, end: 5, text: 'After' }]
  },
  {
    id: 'finding-drugs',
    start: 8,
    end: 9,
    category: 'drugsSubstances',
    cueText: 'Unicode: مخدرات',
    contextBefore: [],
    contextAfter: []
  }
]

const source = readFileSync(new URL('./ContentReviewDialog.tsx', import.meta.url), 'utf8')
const videoPlayerSource = readFileSync(new URL('./VideoPlayer.tsx', import.meta.url), 'utf8')
const modalSource = readFileSync(new URL('./Modal.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
const translations = readFileSync(new URL('../i18n/en.ts', import.meta.url), 'utf8')

describe('Content Review dialog', () => {
  it('filters findings without mutating findings or decisions', () => {
    const decisions = { 'finding-violence': 'mute' as const }
    const filtered = filterContentReviewFindings(findings, 'violenceRelatedLanguage')

    expect(filtered.map((finding) => finding.id)).toEqual(['finding-violence'])
    expect(findings).toHaveLength(2)
    expect(decisions).toEqual({ 'finding-violence': 'mute' })
  })

  it('toggles an active category back to All and switches directly between categories', () => {
    expect(getNextContentReviewFilter('all', 'profanity')).toBe('profanity')
    expect(getNextContentReviewFilter('profanity', 'profanity')).toBe('all')
    expect(getNextContentReviewFilter('profanity', 'sexualLanguage')).toBe('sexualLanguage')
    expect(getNextContentReviewFilter('sexualLanguage', 'all')).toBe('all')
    expect(getNextContentReviewFilter('all', 'all')).toBe('all')
  })

  it('keeps exact finding timing in an LTR-friendly range', () => {
    expect(formatContentReviewRange(findings[0])).toBe('00:00:02 – 00:00:03')
  })

  it('uses the established document-mounted modal and shared review intent', () => {
    expect(source).toContain('open={reviewRequested && findings.length > 0}')
    expect(source).toContain('mountToDocument')
    expect(source).toContain('onClose={closeDialog}')
  })

  it('provides two panes, internal list structure, and a guarded Apply-to-VEIL footer', () => {
    expect(source).toContain('content-review-dialog__workspace')
    expect(source).toContain('content-review-dialog__findings')
    expect(source).toContain('content-review-dialog__details')
    expect(source).toContain('content-review-dialog__list')
    expect(source).toContain("t('common.close')")
    expect(source).toContain("t('contentReview.applyToVeil')")
    expect(source).toContain('disabled={!hasActionableDelta}')
    expect(source).toContain('applyGuardRef.current')
    expect(source).toContain('commitAppliedActionUpdates(updates)')
  })

  it('requests application through VideoPlayer and the authoritative store batch action', () => {
    expect(source).not.toContain('useVeilStore')
    expect(videoPlayerSource).toContain(
      'buildContentReviewApplyPlan(reviewFindings, reviewDecisions, appliedActions)'
    )
    expect(videoPlayerSource).toContain('reconcileTimedItemsBatch(plan)')
    expect(videoPlayerSource).toContain('onApply={applyContentReviewToVeil}')
  })

  it('uses a compact scoped workstation layout with semantic VEIL action cards', () => {
    expect(styles).toContain('width: min(64rem, calc(100vw - 1.5rem))')
    expect(styles).toContain(
      'grid-template-columns: minmax(0, 1.12fr) minmax(17rem, 0.88fr)'
    )
    expect(styles).toContain('.content-review-dialog__row-meta')
    expect(styles).toContain('.content-review-dialog__action-grid')
    expect(styles).toContain(
      '.content-review-dialog__action-card--mute.content-review-dialog__action-card--active'
    )
    expect(styles).toContain(
      '.content-review-dialog__action-card--skip.content-review-dialog__action-card--active'
    )
    expect(styles).toContain('.content-review-dialog__action-card--mask')
    expect(styles).not.toContain('.content-review-dialog__status--unreviewed')
    expect(styles).toContain('var(--veil-mask)')
    expect(styles).toContain('var(--veil-mute)')
    expect(styles).toContain('var(--veil-skip)')
    expect(source).toContain('PlayIcon')
    expect(source).toContain('PowerIcon')
    expect(source).toContain('MaskIcon')
    expect(source).toContain('MuteIcon')
    expect(source).toContain('SkipIcon')

    const detailsSource = source.slice(source.indexOf('content-review-dialog__details'))
    expect(detailsSource).not.toContain('formatContentReviewRange(selectedFinding)')
  })

  it('keeps checkbox selection independent from finding decisions', () => {
    expect(source).toContain('toggleFindingChecked(finding.id)')
    expect(source).toContain('setFindingDecision(selectedFinding.id, decision)')
    expect(source).toContain("assignVisibleChecked('mute')")
    expect(source).toContain("assignVisibleChecked('skip')")
  })

  it('preserves bidirectional subtitle text and LTR timestamps', () => {
    expect(source).toContain('dir="auto"')
    expect(source).toContain('dir="ltr"')
    expect(findings[1].cueText).toContain('مخدرات')
  })

  it('uses the authoritative seek/play/pause paths without VEIL mutations', () => {
    expect(source).toContain('getContentReviewPreviewWindow(finding)')
    expect(source).toContain('onPreview(previewWindow.start)')
    expect(source).toContain('onStopPreview()')
    expect(source).not.toContain('useVeilStore')
    expect(source).not.toContain('buildContentReviewApplyPlan')
    expect(videoPlayerSource).toContain("manualSeek(time, 'other')")
    expect(videoPlayerSource).toContain('.play()')
    expect(videoPlayerSource).toContain('videoRef.current?.pause()')
    expect(videoPlayerSource).toContain('youtubeStageRef.current?.pause()')
  })

  it('uses a compact title-and-description stack beside the semantic review icon', () => {
    expect(source).not.toContain("import veilLogo from '../assets/veil-logo.png'")
    expect(source).toContain('titleIcon={<ZoomToSelectionIcon')
    expect(source).toContain('titleContent={(')
    expect(source).toContain('content-review-dialog__header-copy')
    expect(source).toContain("<span>{t('contentReview.dialogTitle')}</span>")
    expect(source).toContain("<small>{t('contentReview.dialogIntro')}</small>")
    expect(source).not.toContain('content-review-dialog__intro')
    expect(modalSource).toContain('{titleContent ?? title}')
    expect(styles).toMatch(
      /\.content-review-dialog__header-copy \{[\s\S]*?display: grid;/
    )
    expect(source).toContain('content-review-dialog__summary')
    expect(source).toContain('CATEGORY_SYMBOLS')
    expect(source).toContain("t('contentReview.totalFindings')")
    expect(source).toContain('<strong>{findings.length}</strong>')
    expect(source).toContain('getNextContentReviewFilter(current, category)')
    expect(source).toContain("onClick={() => setFilter('all')}")
  })

  it('keeps selected and surrounding cues in one bounded, locally scrolling context container', () => {
    expect(
      source.match(/content-review-dialog__context content-review-dialog__context--/g)
    ).toHaveLength(1)
    expect(source).toContain('content-review-dialog__context-cue--current')
    expect(source).toContain('getDisplayedContentReviewContext(selectedFinding)')
    expect(styles).toMatch(
      /\.content-review-dialog__context \{[\s\S]*?max-height: 8\.25rem;[\s\S]*?overflow-y: auto;/
    )

    const contextCueStyles = styles.match(
      /\.content-review-dialog__context-cue \{([^}]*)\}/
    )?.[1]
    expect(contextCueStyles).toBeDefined()
    expect(contextCueStyles).toContain(
      'grid-template-columns: 5.75rem minmax(0, 1fr)'
    )
    expect(contextCueStyles).not.toContain('border-radius')
    expect(styles).toMatch(
      /\.content-review-dialog__context-cue--current \{[\s\S]*?--category-accent/
    )
  })

  it('keeps the advisory only at the lower-left beneath list and bulk controls', () => {
    const findingsStart = source.indexOf('<section className="content-review-dialog__findings"')
    const detailsStart = source.indexOf('<section className="content-review-dialog__details"')
    const findingsSource = source.slice(findingsStart, detailsStart)
    const detailsSource = source.slice(detailsStart)

    expect(detailsSource).not.toContain('content-review-dialog__details-heading')
    expect(detailsSource).not.toContain('content-review-dialog__subtitle-section')
    expect(detailsSource).not.toContain('content-review-dialog__category')
    expect(detailsSource).not.toContain("t('contentReview.subtitleText')")
    expect(detailsSource).not.toContain('content-review-dialog__advisory')
    expect(findingsSource).toContain('content-review-dialog__batch-actions')
    expect(findingsSource).toContain('content-review-dialog__advisory')
    expect(source.match(/content-review-dialog__advisory/g)).toHaveLength(1)
    expect(styles).toMatch(
      /\.content-review-dialog__findings \{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\) auto auto;/
    )
    expect(styles).toMatch(
      /\.content-review-dialog__advisory \{[\s\S]*?border-top:/
    )
  })

  it('wires authoritative auto-stop, manual Stop, row replacement, and close cleanup', () => {
    expect(source).toContain(
      'hasContentReviewPreviewReachedEnd(activePreview, playbackTime)'
    )
    expect(source).toContain("type: 'time'")
    expect(source).toContain("type: 'stop'")
    expect(source).toContain('if (activePreviewRef.current) {')
    expect(source).toContain('onStopPreview()')
    expect(source).toContain('stopContentReviewPreview()')
    expect(source).toContain('onClose={closeDialog}')
    expect(videoPlayerSource.match(/onStopPreview={stopContentReviewPreview}/g)).toHaveLength(2)
  })

  it('captures playback origin once and restores time plus paused/playing state on Close and Apply exit', () => {
    expect(source).toContain('if (isOpen && !reviewSessionOpenRef.current)')
    expect(source).toContain('onReviewSessionOpen()')
    expect(source).toMatch(
      /const closeDialog[\s\S]*?stopContentReviewPreview\(\)[\s\S]*?onReviewSessionExit\(\)[\s\S]*?closeReview\(\)/
    )
    expect(source).toMatch(
      /commitAppliedActionUpdates\(updates\)[\s\S]*?closeDialog\(\)/
    )
    expect(videoPlayerSource).toContain('contentReviewPlaybackOriginRef')
    expect(videoPlayerSource).toContain('playbackTimeRef.current')
    expect(videoPlayerSource).toContain('captureContentReviewPlaybackOrigin(')
    expect(videoPlayerSource).toContain("manualSeek(origin.time, 'other')")
    expect(videoPlayerSource).toContain('if (!origin.wasPlaying)')
    expect(videoPlayerSource).toContain('video.pause()')
    expect(videoPlayerSource).toContain('void video')
    expect(videoPlayerSource).toContain('.play()')
    expect(videoPlayerSource).toContain('youtubeStageRef.current?.pause()')
    expect(videoPlayerSource).toContain('youtubeStageRef.current?.play()')
    expect(videoPlayerSource.match(/onReviewSessionOpen={captureContentReviewPlaybackSession}/g)).toHaveLength(2)
    expect(videoPlayerSource.match(/onReviewSessionExit={restoreContentReviewPlaybackSession}/g)).toHaveLength(2)
  })

  it('projects the active local video into a canvas and tears down frame updates', () => {
    expect(source).toContain('<canvas ref={previewCanvasRef}')
    expect(source).not.toContain('<video')
    expect(source).toContain('const video = videoRef.current')
    expect(source).toContain('context.drawImage(video, 0, 0, width, height)')
    expect(styles).toMatch(
      /\.content-review-dialog__preview-canvas \{[^}]*object-fit: contain/
    )
    expect(source).toContain('requestAnimationFrame(drawPreviewFrame)')
    expect(source).toContain('cancelAnimationFrame(animationFrame)')
    expect(source).toContain("previewMode !== 'local-video'")
    expect(videoPlayerSource).toContain('videoRef={videoRef}')
    expect(videoPlayerSource).toContain(
      "previewMode={isYouTube ? 'youtube' : isAudioMode ? 'audio' : 'local-video'}"
    )
  })

  it('uses explicit non-canvas preview states for audio and YouTube', () => {
    expect(source).toContain("previewMode === 'audio'")
    expect(source).toContain("t('contentReview.audioPreview')")
    expect(source).toContain("t('contentReview.youtubePreview')")
    expect(source).not.toContain('captureStream')
    expect(source).not.toContain('iframe')
    expect(source).not.toContain('screenshot')
  })

  it('renders Play only for inactive rows and Stop only for the active Content Review preview', () => {
    expect(source).toContain('isContentReviewFindingPreviewActive(activePreview, finding.id)')
    expect(source).toContain('isPreviewActive ? <StopIcon size={13} /> : <PlayIcon size={13} />')
    expect(source).toContain("contentReview.stopPreview")
    expect(source).toContain('toggleFindingPreview(finding)')
    expect(videoPlayerSource).toContain("manualSeek(time, 'other')")
    expect(videoPlayerSource).toContain('void video')
    expect(videoPlayerSource).toContain('.play()')
  })

  it('shows Ignore, Mute, Skip, and a disabled Mask card without a visible Unreviewed choice', () => {
    expect(source).toContain("['ignore', 'mute', 'skip']")
    expect(source).not.toContain("['unreviewed', 'ignore', 'mute', 'skip']")
    expect(source).toContain('content-review-dialog__action-card--mask')
    expect(source).toContain(
      "title={t('contentReview.action.maskUnavailable')}"
    )
    expect(source).toMatch(
      /content-review-dialog__action-card--mask[\s\S]*?disabled/
    )
    expect(source).not.toContain('addMask')
    expect(source).not.toMatch(/fetch\s*\(/)

    const visibleDecisionCards = source.slice(
      source.indexOf('VISIBLE_DECISIONS.map'),
      source.indexOf('content-review-dialog__action-card--mask')
    )
    expect(visibleDecisionCards).not.toContain('disabled')
    expect(styles).toContain(
      '.content-review-dialog__action-card--ignore.content-review-dialog__action-card--active'
    )
    expect(styles).toContain('var(--danger)')
    expect(source).toContain("t('contentReview.action.maskUnavailable')")
    expect(source).toContain("t('contentReview.action.maskDescription')")
    expect(source).not.toContain('content-review-dialog__mask-helper')
    expect(styles).not.toContain('.content-review-dialog__mask-helper')
    expect(translations).toContain(
      "'contentReview.action.maskDescription': 'Unavailable from subtitle review'"
    )
  })
})