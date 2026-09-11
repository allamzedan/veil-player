import { describe, expect, it } from 'vitest'
import type { SrtCue } from './srtParser'
import {
  analyzeSubtitleCues,
  assignDecisionToSelected,
  buildContentReviewVeilActions,
  createInitialContentReviewDecisions
} from './contentReview'
import { createMuteItem, createSkipItem } from './trackItems'

const cue = (text: string, start = 1.25, end = 2.75): SrtCue => ({
  index: null,
  start,
  end,
  text
})

describe('local subtitle Content Review detector', () => {
  it.each([
    ['That was DAMN surprising.', 'profanity'],
    ['The discussion contains sexual language.', 'sexualLanguage'],
    ['They mentioned a weapon.', 'violenceRelatedLanguage'],
    ['The report discusses cocaine.', 'drugsSubstances'],
    ['A story about gambling.', 'otherConfiguredTerms']
  ] as const)('finds %s as %s', (text, category) => {
    expect(analyzeSubtitleCues([cue(text)])).toEqual([
      expect.objectContaining({ category, start: 1.25, end: 2.75, cueText: text })
    ])
  })

  it('handles Unicode and case without losing exact cue text', () => {
    const text = 'هذا نقاش عن مخدرات — CoCaInE.'
    const findings = analyzeSubtitleCues([cue(text)])
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ category: 'drugsSubstances', cueText: text })
  })

  it('avoids obvious substring matches and unrelated cues', () => {
    expect(analyzeSubtitleCues([cue('The classic assignment is complete.')])).toEqual([])
    expect(analyzeSubtitleCues([cue('A calm walk through the park.')])).toEqual([])
  })

  it('deduplicates repeated terms within the same cue and category', () => {
    const findings = analyzeSubtitleCues([cue('A weapon and another weapon; violence was mentioned.')])
    expect(findings.filter((finding) => finding.category === 'violenceRelatedLanguage')).toHaveLength(1)
  })

  it('preserves exact timing and provides two surrounding cues in each direction', () => {
    const cues = [
      cue('Context one', 0, 1),
      cue('Context two', 1, 2),
      cue('A weapon is mentioned.', 2.125, 3.875),
      cue('Context three', 4, 5),
      cue('Context four', 5, 6)
    ]
    const [finding] = analyzeSubtitleCues(cues)
    expect(finding.start).toBe(2.125)
    expect(finding.end).toBe(3.875)
    expect(finding.contextBefore.map((entry) => entry.text)).toEqual(['Context one', 'Context two'])
    expect(finding.contextAfter.map((entry) => entry.text)).toEqual(['Context three', 'Context four'])
  })

  it('matches a custom multi-word phrase as Other configured terms with exact cue timing', () => {
    const [finding] = analyzeSubtitleCues(
      [cue('The family secret was revealed.', 12.125, 13.875)],
      2,
      ['  family   secret  ']
    )
    expect(finding).toMatchObject({
      category: 'otherConfiguredTerms',
      start: 12.125,
      end: 13.875,
      matchedText: 'family secret'
    })
  })

  it('matches Unicode custom terms case-insensitively', () => {
    const unicodeTerm = '\u00c5ngstr\u00f6m'
    const [finding] = analyzeSubtitleCues([cue(`An ${unicodeTerm.toLowerCase()} unit.`)], 2, [unicodeTerm])
    expect(finding).toMatchObject({ category: 'otherConfiguredTerms' })
  })

  it('does not match a custom term embedded in a larger word', () => {
    expect(analyzeSubtitleCues([cue('The classic assignment is complete.')], 2, ['ass']))
      .toEqual([])
  })

  it('keeps built-in detector results unchanged and deduplicated when custom terms are present', () => {
    const cues = [cue('A weapon and gambling were mentioned.')]
    const builtIn = analyzeSubtitleCues(cues)
    expect(analyzeSubtitleCues(cues, 2, ['gambling'])).toEqual(builtIn)
  })
})

describe('Content Review staged decisions', () => {
  it('keeps selection separate from decisions and builds only assigned actions', () => {
    const findings = analyzeSubtitleCues([
      cue('A weapon is mentioned.', 2, 3),
      cue('The report discusses cocaine.', 4, 5),
      cue('That was damn surprising.', 6, 7)
    ])
    const initial = createInitialContentReviewDecisions(findings)
    const assigned = assignDecisionToSelected(initial, new Set([findings[0].id, findings[1].id]), 'mute')
    assigned[findings[1].id] = 'skip'
    assigned[findings[2].id] = 'ignore'

    const actions = buildContentReviewVeilActions(findings, assigned)
    expect(actions.mutes).toHaveLength(1)
    expect(actions.skips).toHaveLength(1)
          const manualMute = createMuteItem(2, 3)
      const manualSkip = createSkipItem(4, 5)
      expect({ ...actions.mutes[0], id: '' }).toEqual({ ...manualMute, id: '' })
      expect({ ...actions.skips[0], id: '' }).toEqual({ ...manualSkip, id: '' })
      expect(actions.mutes[0].id).toEqual(expect.any(String))
      expect(actions.skips[0].id).toEqual(expect.any(String))
      expect(actions.mutes[0].id).not.toBe(actions.skips[0].id)
  })

  it('creates serialization-safe ordinary item shapes with no review metadata', () => {
    const findings = analyzeSubtitleCues([cue('A weapon is mentioned.', 8.5, 9.75)])
    const decisions = { [findings[0].id]: 'mute' as const }
    const [generated] = buildContentReviewVeilActions(findings, decisions).mutes
    const manual = createMuteItem(8.5, 9.75)

    expect(Object.keys(generated).sort()).toEqual(Object.keys(manual).sort())
    expect(generated).toMatchObject({ type: 'mute', enabled: true, start: 8.5, end: 9.75 })
    expect(JSON.stringify(generated)).not.toMatch(/contentReview|category|confidence|generatedBy/)
  })
})

describe('multilingual Content Review rule packs', () => {
  it('matches representative Arabic, French, and Spanish terms with cue timing', () => {
    const cues = [
      cue('هذا كلام خرا', 3.125, 4.875),
      cue('حدث هجوم بالسكين بسبب مخدرات', 5, 6),
      cue('La cocaïne et la violence sont mentionnées.', 7, 8),
      cue('La nudité et une arme sont mentionnées.', 9, 10),
      cue('La cocaína y la violencia fueron mencionadas.', 11, 12),
      cue('Una frase de juego de azar.', 13, 14)
    ]
    const findings = analyzeSubtitleCues(cues)
    expect(findings.map(({ category, start, end }) => ({ category, start, end }))).toEqual([
      { category: 'profanity', start: 3.125, end: 4.875 },
      { category: 'violenceRelatedLanguage', start: 5, end: 6 },
      { category: 'drugsSubstances', start: 5, end: 6 },
      { category: 'violenceRelatedLanguage', start: 7, end: 8 },
      { category: 'drugsSubstances', start: 7, end: 8 },
      { category: 'sexualLanguage', start: 9, end: 10 },
      { category: 'violenceRelatedLanguage', start: 9, end: 10 },
      { category: 'violenceRelatedLanguage', start: 11, end: 12 },
      { category: 'drugsSubstances', start: 11, end: 12 },
      { category: 'otherConfiguredTerms', start: 13, end: 14 }
    ])
  })

  it('supports accented and multi-word terms without embedded-word false positives', () => {
    expect(analyzeSubtitleCues([cue('Une simple arme et un calme remarquable.')])).toHaveLength(1)
    expect(analyzeSubtitleCues([cue('La vie est magnifique.')])).toEqual([])
    expect(analyzeSubtitleCues([cue('La cocaïne est mentionnée.')])[0]).toMatchObject({ category: 'drugsSubstances' })
    expect(analyzeSubtitleCues([cue('هذا تهديد واضح.')])[0]).toMatchObject({ category: 'otherConfiguredTerms' })
  })
})
