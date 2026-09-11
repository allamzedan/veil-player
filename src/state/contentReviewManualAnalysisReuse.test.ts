import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeSubtitleCues } from '../lib/contentReview'
import { parseSrt, type SrtCue } from '../lib/srtParser'
import { useContentReviewSessionStore } from './useContentReviewSessionStore'
import { useVeilStore } from './useVeilStore'

const visualQaCues = (): SrtCue[] => parseSrt(readFileSync(
  new URL('../lib/__fixtures__/content-review-visual-qa.srt', import.meta.url),
  'utf8'
)).cues

const cleanCues = (): SrtCue[] => [{
  index: 1,
  start: 1,
  end: 2,
  text: 'A calm walk through the park.'
}]

describe('manual Content Review analysis reuse', () => {
  beforeEach(() => {
    useContentReviewSessionStore.getState().clear()
    useVeilStore.setState({
      subtitleCues: [],
      subtitleFileName: null,
      showSubtitleText: false,
      masks: [],
      mutes: [],
      skips: [],
      isTrackDirty: false
    })
  })

  it('runs manual analysis after automatic analysis was bypassed', () => {
    const cues = visualQaCues()
    const detector = vi.fn(analyzeSubtitleCues)

    expect(useContentReviewSessionStore.getState().analyzeImportedCues(cues, false, detector))
      .toEqual({ findings: [], offerVisible: false })
    expect(detector).not.toHaveBeenCalled()
    expect(useContentReviewSessionStore.getState().analyzedCueSignature).toBeNull()

    const findings = useContentReviewSessionStore.getState().requestReviewForCues(cues, detector)
    expect(detector).toHaveBeenCalledOnce()
    expect(findings).toHaveLength(5)
    expect(findings.map((finding) => finding.category)).toEqual([
      'profanity',
      'sexualLanguage',
      'violenceRelatedLanguage',
      'drugsSubstances',
      'otherConfiguredTerms'
    ])
    expect(useContentReviewSessionStore.getState().reviewRequested).toBe(true)
    expect(Object.keys(useContentReviewSessionStore.getState().decisions)).toHaveLength(5)
    expect(useVeilStore.getState()).toMatchObject({
      mutes: [],
      skips: [],
      isTrackDirty: false
    })
  })

  it('reuses a completed automatic analysis for unchanged cues', () => {
    const cues = visualQaCues()
    const detector = vi.fn(analyzeSubtitleCues)

    const result = useContentReviewSessionStore.getState().analyzeImportedCues(cues, true, detector)
    expect(result).toMatchObject({ offerVisible: true })
    expect(result.findings).toHaveLength(5)
    expect(useContentReviewSessionStore.getState().requestReviewForCues(cues, detector)).toHaveLength(5)
    expect(detector).toHaveBeenCalledOnce()
  })

  it('reuses a genuine analyzed zero-result for unchanged cues', () => {
    const cues = cleanCues()
    const detector = vi.fn(analyzeSubtitleCues)

    expect(useContentReviewSessionStore.getState().analyzeImportedCues(cues, true, detector).findings)
      .toEqual([])
    expect(useContentReviewSessionStore.getState().requestReviewForCues(cues, detector)).toEqual([])
    expect(detector).toHaveBeenCalledOnce()
    expect(useContentReviewSessionStore.getState().reviewRequested).toBe(false)
  })

  it('invalidates completed analysis when subtitles are replaced', () => {
    const detector = vi.fn(analyzeSubtitleCues)
    useContentReviewSessionStore.getState().analyzeImportedCues(visualQaCues(), true, detector)

    const replacement = cleanCues()
    useContentReviewSessionStore.getState().analyzeImportedCues(replacement, false, detector)
    expect(useContentReviewSessionStore.getState().analyzedCueSignature).toBeNull()
    expect(useContentReviewSessionStore.getState().requestReviewForCues(replacement, detector)).toEqual([])
    expect(detector).toHaveBeenCalledTimes(2)
  })

  it('retains analysis through hide/show and clears it on subtitle removal', () => {
    const cues = visualQaCues()
    useVeilStore.setState({ subtitleCues: cues, subtitleFileName: 'content-review-visual-qa.srt' })
    useContentReviewSessionStore.getState().analyzeImportedCues(cues, true)
    const analyzedSignature = useContentReviewSessionStore.getState().analyzedCueSignature

    useVeilStore.getState().setShowSubtitleText(false)
    useVeilStore.getState().setShowSubtitleText(true)
    expect(useContentReviewSessionStore.getState().analyzedCueSignature).toBe(analyzedSignature)

    useVeilStore.getState().clearSubtitleCues()
    expect(useContentReviewSessionStore.getState()).toMatchObject({
      findings: [],
      cueSignature: null,
      analyzedCueSignature: null,
      reviewRequested: false
    })
  })
})
