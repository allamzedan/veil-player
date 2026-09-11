import type { SrtCue } from './srtParser'
import { createMuteItem, createSkipItem } from './trackItems'
import type { MuteTrackItem, SkipTrackItem } from '../types/track'
import { normalizeContentReviewCustomTerms } from './contentReviewPreferences'
import { CONTENT_REVIEW_RULES } from './contentReviewRules'

export const CONTENT_REVIEW_CATEGORIES = [
  'profanity',
  'sexualLanguage',
  'violenceRelatedLanguage',
  'drugsSubstances',
  'otherConfiguredTerms'
] as const

export type ContentReviewCategory = (typeof CONTENT_REVIEW_CATEGORIES)[number]
export type ContentReviewDecision = 'unreviewed' | 'ignore' | 'mute' | 'skip'

export interface ContentReviewContextCue {
  start: number
  end: number
  text: string
}

export interface ContentReviewFinding {
  id: string
  start: number
  end: number
  category: ContentReviewCategory
  cueText: string
  matchedText?: string
  contextBefore: ContentReviewContextCue[]
  contextAfter: ContentReviewContextCue[]
}

export type ContentReviewDecisionMap = Record<string, ContentReviewDecision>

export type ContentReviewActionType = 'mute' | 'skip'

export interface ContentReviewAppliedAction {
  layerId: string
  type: ContentReviewActionType
}

export type ContentReviewAppliedActionMap = Record<string, ContentReviewAppliedAction>
export type ContentReviewAppliedActionUpdates = Record<string, ContentReviewAppliedAction | null>

export interface ContentReviewApplyPlan {
  removeMuteIds: string[]
  removeSkipIds: string[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  appliedActionUpdates: ContentReviewAppliedActionUpdates
}

export interface ContentReviewVeilAction {
  findingId: string
  type: ContentReviewActionType
  start: number
  end: number
}

export { CONTENT_REVIEW_RULES }

const WORD_CHARACTER = '[\\p{L}\\p{N}_]'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildTermPattern(term: string): RegExp {
  const phrase = escapeRegExp(term.normalize('NFKC').trim()).replace(/\s+/gu, '\\s+')
  return new RegExp(`(?<!${WORD_CHARACTER})${phrase}(?!${WORD_CHARACTER})`, 'iu')
}

const COMPILED_RULES = CONTENT_REVIEW_RULES.map((group) => ({
  category: group.category,
  terms: group.terms.map((term) => ({ term, pattern: buildTermPattern(term) }))
}))

function compiledRulesFor(customTerms: readonly string[]) {
  const compiledCustomTerms = normalizeContentReviewCustomTerms(customTerms)
  if (compiledCustomTerms.length === 0) return COMPILED_RULES
  return COMPILED_RULES.map((group) => (
    group.category === 'otherConfiguredTerms'
      ? { ...group, terms: [...group.terms, ...compiledCustomTerms.map((term) => ({ term, pattern: buildTermPattern(term) }))] }
      : group
  ))
}

export function normalizeContentReviewText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39);/gi, (entity) => {
      const decoded: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'"
      }
      return decoded[entity.toLowerCase()] ?? entity
    })
    .replace(/\s+/gu, ' ')
    .trim()
}

function contextCue(cue: SrtCue): ContentReviewContextCue {
  return { start: cue.start, end: cue.end, text: cue.text }
}

export function analyzeSubtitleCues(
  cues: readonly SrtCue[],
  contextRadius = 2,
  customTerms: readonly string[] = []
): ContentReviewFinding[] {
  const findings: ContentReviewFinding[] = []
  const radius = Math.max(0, Math.floor(contextRadius))
  const compiledRules = compiledRulesFor(customTerms)

  cues.forEach((cue, cueIndex) => {
    const normalized = normalizeContentReviewText(cue.text)
    if (!normalized) return

    for (const group of compiledRules) {
      const match = group.terms.find(({ pattern }) => pattern.test(normalized))
      if (!match) continue

      const matchedText = match.pattern.exec(normalized)?.[0] ?? match.term
      findings.push({
        id: `content-review-${cueIndex}-${group.category}`,
        start: cue.start,
        end: cue.end,
        category: group.category,
        cueText: cue.text,
        matchedText,
        contextBefore: cues.slice(Math.max(0, cueIndex - radius), cueIndex).map(contextCue),
        contextAfter: cues.slice(cueIndex + 1, cueIndex + 1 + radius).map(contextCue)
      })
    }
  })

  return findings
}

export function createInitialContentReviewDecisions(
  findings: readonly ContentReviewFinding[]
): ContentReviewDecisionMap {
  return Object.fromEntries(findings.map((finding) => [finding.id, 'unreviewed']))
}

export function assignDecisionToSelected(
  decisions: ContentReviewDecisionMap,
  selectedIds: ReadonlySet<string>,
  decision: Exclude<ContentReviewDecision, 'unreviewed'>
): ContentReviewDecisionMap {
  const next = { ...decisions }
  selectedIds.forEach((id) => {
    if (id in next) next[id] = decision
  })
  return next
}

export function buildContentReviewActions(
  findings: readonly ContentReviewFinding[],
  decisions: ContentReviewDecisionMap
): ContentReviewVeilAction[] {
  return findings
    .flatMap((finding): ContentReviewVeilAction[] => {
      const decision = decisions[finding.id] ?? 'unreviewed'
      return decision === 'mute' || decision === 'skip'
        ? [{
            findingId: finding.id,
            type: decision,
            start: finding.start,
            end: finding.end
          }]
        : []
    })
    .sort((a, b) => a.start - b.start || a.end - b.end || a.findingId.localeCompare(b.findingId))
}

export function buildContentReviewVeilActions(
  findings: readonly ContentReviewFinding[],
  decisions: ContentReviewDecisionMap
): { mutes: MuteTrackItem[]; skips: SkipTrackItem[] } {
  const mutes: MuteTrackItem[] = []
  const skips: SkipTrackItem[] = []

  for (const action of buildContentReviewActions(findings, decisions)) {
    if (action.type === 'mute') mutes.push(createMuteItem(action.start, action.end))
    if (action.type === 'skip') skips.push(createSkipItem(action.start, action.end))
  }

  return { mutes, skips }
}

export function hasContentReviewActionDelta(
  findings: readonly ContentReviewFinding[],
  decisions: ContentReviewDecisionMap,
  appliedActions: ContentReviewAppliedActionMap
): boolean {
  return findings.some((finding) => {
    const decision = decisions[finding.id] ?? 'unreviewed'
    const applied = appliedActions[finding.id]
    if (decision === 'mute' || decision === 'skip') {
      return !applied || applied.type !== decision
    }
    return decision === 'ignore' && Boolean(applied)
  })
}

export function buildContentReviewApplyPlan(
  findings: readonly ContentReviewFinding[],
  decisions: ContentReviewDecisionMap,
  appliedActions: ContentReviewAppliedActionMap
): ContentReviewApplyPlan {
  const plan: ContentReviewApplyPlan = {
    removeMuteIds: [],
    removeSkipIds: [],
    mutes: [],
    skips: [],
    appliedActionUpdates: {}
  }

  const orderedFindings = [...findings]
    .sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id))

  for (const finding of orderedFindings) {
    const decision = decisions[finding.id] ?? 'unreviewed'
    const applied = appliedActions[finding.id]
    const nextType = decision === 'mute' || decision === 'skip' ? decision : null

    if (applied && nextType === applied.type) continue

    if (applied && (decision === 'ignore' || nextType !== null)) {
      if (applied.type === 'mute') plan.removeMuteIds.push(applied.layerId)
      if (applied.type === 'skip') plan.removeSkipIds.push(applied.layerId)
    }

    if (nextType === 'mute') {
      const mute = createMuteItem(finding.start, finding.end)
      plan.mutes.push(mute)
      plan.appliedActionUpdates[finding.id] = { layerId: mute.id, type: 'mute' }
    } else if (nextType === 'skip') {
      const skip = createSkipItem(finding.start, finding.end)
      plan.skips.push(skip)
      plan.appliedActionUpdates[finding.id] = { layerId: skip.id, type: 'skip' }
    } else if (decision === 'ignore' && applied) {
      plan.appliedActionUpdates[finding.id] = null
    }
  }

  return plan
}
