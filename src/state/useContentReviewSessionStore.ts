import { create } from 'zustand'
import {
  analyzeSubtitleCues,
  assignDecisionToSelected,
  createInitialContentReviewDecisions,
  type ContentReviewAppliedActionMap,
  type ContentReviewAppliedActionUpdates,
  type ContentReviewDecision,
  type ContentReviewDecisionMap,
  type ContentReviewFinding
} from '../lib/contentReview'
import type { SrtCue } from '../lib/srtParser'
import { readContentReviewPreferences } from '../lib/contentReviewPreferences'
import { useVeilStore } from './useVeilStore'

type ContentReviewDetector = (cues: readonly SrtCue[]) => ContentReviewFinding[]

export interface ContentReviewImportResult {
  findings: ContentReviewFinding[]
  offerVisible: boolean
}

interface ContentReviewSessionState {
  findings: ContentReviewFinding[]
  offerVisible: boolean
  reviewRequested: boolean
  cueSignature: string | null
  analyzedCueSignature: string | null
  decisions: ContentReviewDecisionMap
  appliedActions: ContentReviewAppliedActionMap
  selectedFindingId: string | null
  checkedFindingIds: string[]
  analyzeImportedCues: (
    cues: readonly SrtCue[],
    enabled: boolean,
    detector?: ContentReviewDetector
  ) => ContentReviewImportResult
  requestReviewForCues: (
    cues: readonly SrtCue[],
    detector?: ContentReviewDetector
  ) => ContentReviewFinding[]
  reviewNow: () => void
  later: () => void
  closeReview: () => void
  setSelectedFinding: (findingId: string) => void
  toggleFindingChecked: (findingId: string) => void
  selectFindings: (findingIds: readonly string[]) => void
  clearSelection: () => void
  setFindingDecision: (findingId: string, decision: ContentReviewDecision) => void
  setDecisionForChecked: (decision: Exclude<ContentReviewDecision, 'unreviewed'>) => void
  commitAppliedActionUpdates: (updates: ContentReviewAppliedActionUpdates) => void
  reconcileAppliedActions: () => void
  clear: () => void
}

const EMPTY_SESSION = {
  findings: [] as ContentReviewFinding[],
  offerVisible: false,
  reviewRequested: false,
  cueSignature: null as string | null,
  analyzedCueSignature: null as string | null,
  decisions: {} as ContentReviewDecisionMap,
  appliedActions: {} as ContentReviewAppliedActionMap,
  selectedFindingId: null as string | null,
  checkedFindingIds: [] as string[]
}

export function contentReviewCueSignature(cues: readonly SrtCue[]): string {
  return JSON.stringify(cues.map((cue) => [cue.start, cue.end, cue.text]))
}

export function contentReviewAnalysisSignature(
  cues: readonly SrtCue[],
  customTerms: readonly string[]
): string {
  return JSON.stringify([cues.map((cue) => [cue.start, cue.end, cue.text]), customTerms])
}

function runContentReviewDetector(
  cues: readonly SrtCue[],
  detector: ContentReviewDetector,
  customTerms: readonly string[]
): ContentReviewFinding[] {
  return detector === analyzeSubtitleCues
    ? analyzeSubtitleCues(cues, 2, customTerms)
    : detector(cues)
}

export function analyzeImportedCuesWhenEnabled(
  cues: readonly SrtCue[],
  enabled: boolean,
  detector: ContentReviewDetector = analyzeSubtitleCues,
  customTerms: readonly string[] = []
): ContentReviewImportResult {
  if (!enabled) return { findings: [], offerVisible: false }
  const findings = runContentReviewDetector(cues, detector, customTerms)
  return { findings, offerVisible: findings.length > 0 }
}

export const useContentReviewSessionStore = create<ContentReviewSessionState>((set, get) => ({
  ...EMPTY_SESSION,

  analyzeImportedCues: (cues, enabled, detector = analyzeSubtitleCues) => {
    const signature = contentReviewCueSignature(cues)
    const customTerms = readContentReviewPreferences().customTerms
    const analysisSignature = contentReviewAnalysisSignature(cues, customTerms)
    const result = analyzeImportedCuesWhenEnabled(cues, enabled, detector, customTerms)
    set({
      findings: result.findings,
      offerVisible: result.offerVisible,
      reviewRequested: false,
      cueSignature: signature,
      analyzedCueSignature: enabled ? analysisSignature : null,
      decisions: createInitialContentReviewDecisions(result.findings),
      appliedActions: {},
      selectedFindingId: result.findings[0]?.id ?? null,
      checkedFindingIds: []
    })
    return result
  },

  requestReviewForCues: (cues, detector = analyzeSubtitleCues) => {
    const signature = contentReviewCueSignature(cues)
    const customTerms = readContentReviewPreferences().customTerms
    const analysisSignature = contentReviewAnalysisSignature(cues, customTerms)
    get().reconcileAppliedActions()
    const current = get()
    const hasCachedAnalysis = current.analyzedCueSignature === analysisSignature
    const findings = hasCachedAnalysis
      ? current.findings
      : runContentReviewDetector(cues, detector, customTerms)
    set({
      findings,
      offerVisible: false,
      reviewRequested: findings.length > 0,
      cueSignature: signature,
      analyzedCueSignature: analysisSignature,
      decisions: hasCachedAnalysis
        ? current.decisions
        : createInitialContentReviewDecisions(findings),
      appliedActions: hasCachedAnalysis ? current.appliedActions : {},
      selectedFindingId: hasCachedAnalysis
        ? current.selectedFindingId ?? findings[0]?.id ?? null
        : findings[0]?.id ?? null,
      checkedFindingIds: hasCachedAnalysis ? current.checkedFindingIds : []
    })
    return findings
  },

  reviewNow: () => {
    get().reconcileAppliedActions()
    set((state) => ({
      offerVisible: false,
      reviewRequested: state.findings.length > 0
    }))
  },

  later: () => set({ offerVisible: false, reviewRequested: false }),

  closeReview: () => set({ reviewRequested: false }),

  setSelectedFinding: (findingId) => set((state) => ({
    selectedFindingId: state.findings.some((finding) => finding.id === findingId)
      ? findingId
      : state.selectedFindingId
  })),

  toggleFindingChecked: (findingId) => set((state) => ({
    checkedFindingIds: state.checkedFindingIds.includes(findingId)
      ? state.checkedFindingIds.filter((id) => id !== findingId)
      : state.findings.some((finding) => finding.id === findingId)
        ? [...state.checkedFindingIds, findingId]
        : state.checkedFindingIds
  })),

  selectFindings: (findingIds) => set((state) => {
    const available = new Set(state.findings.map((finding) => finding.id))
    return { checkedFindingIds: [...new Set(findingIds.filter((id) => available.has(id)))] }
  }),

  clearSelection: () => set({ checkedFindingIds: [] }),

  setFindingDecision: (findingId, decision) => set((state) => (
    findingId in state.decisions
      ? { decisions: { ...state.decisions, [findingId]: decision } }
      : { decisions: state.decisions }
  )),

  setDecisionForChecked: (decision) => set((state) => ({
    decisions: assignDecisionToSelected(
      state.decisions,
      new Set(state.checkedFindingIds),
      decision
    )
  })),

  commitAppliedActionUpdates: (updates) => set((state) => {
    const appliedActions = { ...state.appliedActions }
    Object.entries(updates).forEach(([findingId, applied]) => {
      if (applied) appliedActions[findingId] = applied
      else delete appliedActions[findingId]
    })
    return { appliedActions, checkedFindingIds: [] }
  }),

  reconcileAppliedActions: () => {
    const veil = useVeilStore.getState()
    const muteIds = new Set(veil.mutes.map((item) => item.id))
    const skipIds = new Set(veil.skips.map((item) => item.id))
    set((state) => {
      const appliedActions = { ...state.appliedActions }
      const decisions = { ...state.decisions }
      let changed = false

      Object.entries(state.appliedActions).forEach(([findingId, applied]) => {
        const exists = applied.type === 'mute'
          ? muteIds.has(applied.layerId)
          : skipIds.has(applied.layerId)
        if (exists) return
        delete appliedActions[findingId]
        if (decisions[findingId] === applied.type) decisions[findingId] = 'unreviewed'
        changed = true
      })

      return changed ? { appliedActions, decisions } : {}
    })
  },

  clear: () => set({ ...EMPTY_SESSION })
}))

// Imported subtitles are session state today. Reuse their established clearing lifecycle
// so media/source replacement cannot leave stale Content Review findings behind.
useVeilStore.subscribe((state, previous) => {
  if (state.subtitleCues !== previous.subtitleCues && state.subtitleCues.length === 0) {
    useContentReviewSessionStore.getState().clear()
    return
  }
  if (state.mutes !== previous.mutes || state.skips !== previous.skips) {
    useContentReviewSessionStore.getState().reconcileAppliedActions()
  }
})
