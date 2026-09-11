import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SrtCue } from '../lib/srtParser'
import { patchContentReviewPreferences } from '../lib/contentReviewPreferences'
import { useVeilStore } from './useVeilStore'
import {
  analyzeImportedCuesWhenEnabled,
  useContentReviewSessionStore
} from './useContentReviewSessionStore'

const cues = (text: string): SrtCue[] => [{ index: 1, start: 2.25, end: 3.75, text }]

function installStorage(): void {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  })
}

describe('subtitle Content Review trigger session', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    installStorage()
    useContentReviewSessionStore.getState().clear()
    useVeilStore.setState({
      subtitleCues: [],
      subtitleFileName: null,
      masks: [],
      mutes: [],
      skips: [],
      isTrackDirty: false
    })
  })

  it('does not invoke the detector or offer review when the preference is off', () => {
    const detector = vi.fn(() => [])
    expect(analyzeImportedCuesWhenEnabled(cues('A weapon is mentioned.'), false, detector))
      .toEqual({ findings: [], offerVisible: false })
    expect(detector).not.toHaveBeenCalled()
  })

  it('does not show an offer when enabled analysis has no findings', () => {
    const result = useContentReviewSessionStore.getState().analyzeImportedCues(
      cues('A calm walk through the park.'),
      true
    )
    expect(result).toEqual({ findings: [], offerVisible: false })
    expect(useContentReviewSessionStore.getState().reviewRequested).toBe(false)
  })

  it('shows an offer with findings when enabled analysis finds content', () => {
    const result = useContentReviewSessionStore.getState().analyzeImportedCues(
      cues('A weapon is mentioned.'),
      true
    )
    expect(result.findings).toHaveLength(1)
    expect(result.offerVisible).toBe(true)
  })

  it('uses custom terms during enabled automatic analysis', () => {
    patchContentReviewPreferences({ customTerms: ['family secret'] })
    const result = useContentReviewSessionStore.getState().analyzeImportedCues(
      cues('A family secret was revealed.'),
      true
    )
    expect(result.offerVisible).toBe(true)
    expect(result.findings).toEqual([
      expect.objectContaining({
        category: 'otherConfiguredTerms',
        start: 2.25,
        end: 3.75
      })
    ])
  })

  it('uses custom terms for manual Review Content while automatic analysis is off', () => {
    patchContentReviewPreferences({
      analyzeImportedSubtitles: false,
      customTerms: ['family secret']
    })
    expect(useContentReviewSessionStore.getState().requestReviewForCues(
      cues('A family secret was revealed.')
    )).toEqual([
      expect.objectContaining({ category: 'otherConfiguredTerms' })
    ])
  })

  it('invalidates cached findings when custom terms change', () => {
    const imported = cues('Alpha and beta are mentioned.')
    patchContentReviewPreferences({ customTerms: ['alpha'] })
    useContentReviewSessionStore.getState().analyzeImportedCues(imported, true)
    expect(useContentReviewSessionStore.getState().findings[0].matchedText).toBe('Alpha')

    patchContentReviewPreferences({ customTerms: ['beta'] })
    const findings = useContentReviewSessionStore.getState().requestReviewForCues(imported)
    expect(findings[0].matchedText).toBe('beta')
  })

  it('Later dismisses only the offer and preserves findings without VEIL mutation', () => {
    useContentReviewSessionStore.getState().analyzeImportedCues(cues('A weapon is mentioned.'), true)
    useContentReviewSessionStore.getState().later()
    const review = useContentReviewSessionStore.getState()
    const veil = useVeilStore.getState()
    expect(review.offerVisible).toBe(false)
    expect(review.findings).toHaveLength(1)
    expect(veil).toMatchObject({ mutes: [], skips: [], isTrackDirty: false })
  })

  it('Review now sets shared review intent without VEIL mutation', () => {
    useContentReviewSessionStore.getState().analyzeImportedCues(cues('A weapon is mentioned.'), true)
    useContentReviewSessionStore.getState().reviewNow()
    expect(useContentReviewSessionStore.getState().reviewRequested).toBe(true)
    expect(useVeilStore.getState()).toMatchObject({ mutes: [], skips: [], isTrackDirty: false })
  })

  it('manual Review Content reuses findings for the same cues', () => {
    const detector = vi.fn(() => [{
      id: 'finding-1', start: 2.25, end: 3.75, category: 'violenceRelatedLanguage' as const,
      cueText: 'A weapon is mentioned.', contextBefore: [], contextAfter: []
    }])
    const store = useContentReviewSessionStore.getState()
    store.analyzeImportedCues(cues('A weapon is mentioned.'), true, detector)
    store.later()
    expect(useContentReviewSessionStore.getState().requestReviewForCues(cues('A weapon is mentioned.'), detector)).toHaveLength(1)
    expect(detector).toHaveBeenCalledOnce()
    expect(useContentReviewSessionStore.getState().reviewRequested).toBe(true)
  })

  it('manual Review Content with zero findings gives no intent or mutation', () => {
    expect(useContentReviewSessionStore.getState().requestReviewForCues(cues('A calm walk.'))).toEqual([])
    expect(useContentReviewSessionStore.getState().reviewRequested).toBe(false)
    expect(useVeilStore.getState()).toMatchObject({ mutes: [], skips: [], isTrackDirty: false })
  })

  it('subtitle replacement clears old results and analyzes only new cues', () => {
    const store = useContentReviewSessionStore.getState()
    store.analyzeImportedCues(cues('A weapon is mentioned.'), true)
    store.clear()
    store.analyzeImportedCues(cues('A calm walk.'), true)
    expect(useContentReviewSessionStore.getState()).toMatchObject({
      findings: [], offerVisible: false, reviewRequested: false
    })
  })

  it('subtitle removal clears findings, offer, and review intent', () => {
    useVeilStore.setState({ subtitleCues: cues('A weapon is mentioned.') })
    useContentReviewSessionStore.getState().analyzeImportedCues(cues('A weapon is mentioned.'), true)
    useContentReviewSessionStore.getState().reviewNow()
    useVeilStore.getState().clearSubtitleCues()
    expect(useContentReviewSessionStore.getState()).toMatchObject({
      findings: [], offerVisible: false, reviewRequested: false, cueSignature: null
    })
  })

  it('subtitle visibility changes retain findings without re-analysis', () => {
    const detector = vi.fn(() => [{
      id: 'finding-1', start: 2.25, end: 3.75, category: 'violenceRelatedLanguage' as const,
      cueText: 'A weapon is mentioned.', contextBefore: [], contextAfter: []
    }])
    useContentReviewSessionStore.getState().analyzeImportedCues(cues('A weapon is mentioned.'), true, detector)
    useVeilStore.getState().setShowSubtitleText(false)
    useVeilStore.getState().setShowSubtitleText(true)
    expect(detector).toHaveBeenCalledOnce()
    expect(useContentReviewSessionStore.getState().findings).toHaveLength(1)
  })

  it('source lifecycle cue clearing removes stale findings', () => {
    useVeilStore.setState({ subtitleCues: cues('A weapon is mentioned.') })
    useContentReviewSessionStore.getState().analyzeImportedCues(cues('A weapon is mentioned.'), true)
    useVeilStore.setState({ subtitleCues: [], subtitleFileName: null })
    expect(useContentReviewSessionStore.getState().findings).toEqual([])
  })

  it('preserves Unicode cue text through offer and review intent', () => {
    const arabic = cues('هذا نقاش عن مخدرات')
    useContentReviewSessionStore.getState().analyzeImportedCues(arabic, true)
    useContentReviewSessionStore.getState().reviewNow()
    expect(useContentReviewSessionStore.getState().findings[0].cueText).toBe(arabic[0].text)
    expect(useContentReviewSessionStore.getState().reviewRequested).toBe(true)
  })

  it('initializes transient decisions and selects the first finding', () => {
    useContentReviewSessionStore.getState().analyzeImportedCues(
      [
        ...cues('A weapon is mentioned.'),
        { index: 2, start: 8, end: 9, text: 'Drugs are mentioned.' }
      ],
      true
    )

    const review = useContentReviewSessionStore.getState()
    expect(review.findings).toHaveLength(2)
    expect(review.selectedFindingId).toBe(review.findings[0].id)
    expect(review.decisions).toEqual({
      [review.findings[0].id]: 'unreviewed',
      [review.findings[1].id]: 'unreviewed'
    })
    expect(review.checkedFindingIds).toEqual([])
  })

  it('keeps checkbox selection independent from individual decisions', () => {
    useContentReviewSessionStore.getState().analyzeImportedCues(
      [
        ...cues('A weapon is mentioned.'),
        { index: 2, start: 8, end: 9, text: 'Drugs are mentioned.' }
      ],
      true
    )

    const [first, second] = useContentReviewSessionStore.getState().findings
    useContentReviewSessionStore.getState().toggleFindingChecked(first.id)
    useContentReviewSessionStore.getState().setFindingDecision(second.id, 'mute')

    expect(useContentReviewSessionStore.getState().checkedFindingIds).toEqual([first.id])
    expect(useContentReviewSessionStore.getState().decisions).toMatchObject({
      [first.id]: 'unreviewed',
      [second.id]: 'mute'
    })
  })

  it('assigns a batch decision only to checked findings', () => {
    useContentReviewSessionStore.getState().analyzeImportedCues(
      [
        ...cues('A weapon is mentioned.'),
        { index: 2, start: 8, end: 9, text: 'Drugs are mentioned.' }
      ],
      true
    )

    const [first, second] = useContentReviewSessionStore.getState().findings
    useContentReviewSessionStore.getState().selectFindings([first.id])
    useContentReviewSessionStore.getState().setDecisionForChecked('skip')

    expect(useContentReviewSessionStore.getState().decisions).toMatchObject({
      [first.id]: 'skip',
      [second.id]: 'unreviewed'
    })
  })

  it('clears batch selection without changing decisions', () => {
    useContentReviewSessionStore.getState().analyzeImportedCues(cues('A weapon is mentioned.'), true)
    const finding = useContentReviewSessionStore.getState().findings[0]

    useContentReviewSessionStore.getState().toggleFindingChecked(finding.id)
    useContentReviewSessionStore.getState().setFindingDecision(finding.id, 'ignore')
    useContentReviewSessionStore.getState().clearSelection()

    expect(useContentReviewSessionStore.getState().checkedFindingIds).toEqual([])
    expect(useContentReviewSessionStore.getState().decisions[finding.id]).toBe('ignore')
  })

  it('closing and reopening the same cues preserves transient decisions', () => {
    const imported = cues('A weapon is mentioned.')
    useContentReviewSessionStore.getState().analyzeImportedCues(imported, true)
    const finding = useContentReviewSessionStore.getState().findings[0]

    useContentReviewSessionStore.getState().setFindingDecision(finding.id, 'mute')
    useContentReviewSessionStore.getState().reviewNow()
    useContentReviewSessionStore.getState().closeReview()
    useContentReviewSessionStore.getState().requestReviewForCues(imported)

    expect(useContentReviewSessionStore.getState()).toMatchObject({
      reviewRequested: true,
      selectedFindingId: finding.id
    })
    expect(useContentReviewSessionStore.getState().decisions[finding.id]).toBe('mute')
    expect(useVeilStore.getState()).toMatchObject({
      mutes: [],
      skips: [],
      isTrackDirty: false
    })
  })

  it('subtitle replacement clears stale decisions and checked selection', () => {
    useContentReviewSessionStore.getState().analyzeImportedCues(cues('A weapon is mentioned.'), true)
    const finding = useContentReviewSessionStore.getState().findings[0]
    useContentReviewSessionStore.getState().toggleFindingChecked(finding.id)
    useContentReviewSessionStore.getState().setFindingDecision(finding.id, 'skip')

    useContentReviewSessionStore.getState().analyzeImportedCues(cues('A calm walk.'), true)

    expect(useContentReviewSessionStore.getState()).toMatchObject({
      findings: [],
      decisions: {},
      selectedFindingId: null,
      checkedFindingIds: []
    })
  })
})
