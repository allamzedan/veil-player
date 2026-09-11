import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildContentReviewApplyPlan,
  hasContentReviewActionDelta,
  type ContentReviewAppliedActionMap,
  type ContentReviewDecisionMap,
  type ContentReviewFinding
} from './contentReview'
import { createMuteItem, createSkipItem } from './trackItems'
import { buildVeilTrackFromStore } from './trackSerialization'
import type { SrtCue } from './srtParser'
import { useContentReviewSessionStore } from '../state/useContentReviewSessionStore'
import { useVeilStore } from '../state/useVeilStore'

const originalVeilState = useVeilStore.getState()

const finding = (
  id: string,
  start: number,
  end: number,
  category: ContentReviewFinding['category'] = 'profanity'
): ContentReviewFinding => ({
  id,
  start,
  end,
  category,
  cueText: id,
  contextBefore: [],
  contextAfter: []
})

function applyPlan(
  findings: readonly ContentReviewFinding[],
  decisions: ContentReviewDecisionMap,
  appliedActions: ContentReviewAppliedActionMap
): boolean {
  const plan = buildContentReviewApplyPlan(findings, decisions, appliedActions)
  const changed = useVeilStore.getState().reconcileTimedItemsBatch(plan)
  if (changed) {
    useContentReviewSessionStore.getState().commitAppliedActionUpdates(plan.appliedActionUpdates)
  }
  return changed
}

beforeEach(() => {
  useContentReviewSessionStore.getState().clear()
  useVeilStore.setState({
    subtitleCues: [],
    subtitleFileName: null,
    masks: [],
    mutes: [],
    skips: [],
    bookmarks: [],
    selectedItemId: null,
    selectedItemType: null,
    isTrackDirty: false
  })
})

afterEach(() => {
  useContentReviewSessionStore.getState().clear()
  useVeilStore.setState(originalVeilState, true)
})

describe('Content Review applied-action reconciliation', () => {
  it('applies a new ordinary Mute and records its transient layer mapping', () => {
    const findings = [finding('finding-a', 2.125, 3.875)]
    expect(applyPlan(findings, { 'finding-a': 'mute' }, {})).toBe(true)

    const [mute] = useVeilStore.getState().mutes
    expect(mute).toMatchObject({ type: 'mute', start: 2.125, end: 3.875 })
    expect(useContentReviewSessionStore.getState().appliedActions).toEqual({
      'finding-a': { layerId: mute.id, type: 'mute' }
    })
    expect(useVeilStore.getState().isTrackDirty).toBe(true)
  })

  it('retains an applied Mute and its selected decision when Review Content reopens', () => {
    const cues: SrtCue[] = [{ index: 1, start: 2, end: 3, text: 'A weapon is mentioned.' }]
    const findings = [finding('finding-a', 2, 3, 'violenceRelatedLanguage')]
    const session = useContentReviewSessionStore.getState()
    session.requestReviewForCues(cues, () => findings)
    session.setFindingDecision('finding-a', 'mute')
    applyPlan(findings, useContentReviewSessionStore.getState().decisions, {})
    session.closeReview()
    session.requestReviewForCues(cues, () => findings)

    expect(useContentReviewSessionStore.getState()).toMatchObject({
      reviewRequested: true,
      decisions: { 'finding-a': 'mute' },
      appliedActions: {
        'finding-a': expect.objectContaining({ type: 'mute' })
      }
    })
  })

  it('reapplying the same mapped Mute is idempotent and leaves Apply disabled', () => {
    const findings = [finding('finding-a', 2, 3)]
    applyPlan(findings, { 'finding-a': 'mute' }, {})
    const applied = useContentReviewSessionStore.getState().appliedActions
    const originalId = useVeilStore.getState().mutes[0].id

    expect(hasContentReviewActionDelta(findings, { 'finding-a': 'mute' }, applied)).toBe(false)
    expect(applyPlan(findings, { 'finding-a': 'mute' }, applied)).toBe(false)
    expect(useVeilStore.getState().mutes.map((item) => item.id)).toEqual([originalId])
  })

  it('replaces a tracked Mute with exactly one Skip and preserves unrelated same-range items', () => {
    const findings = [finding('finding-a', 5.25, 6.75)]
    const manualMute = createMuteItem(5.25, 6.75)
    useVeilStore.setState({ mutes: [manualMute] })
    applyPlan(findings, { 'finding-a': 'mute' }, {})
    const trackedMute = useVeilStore.getState().mutes.find((item) => item.id !== manualMute.id)!
    const applied = { 'finding-a': { layerId: trackedMute.id, type: 'mute' as const } }

    expect(applyPlan(findings, { 'finding-a': 'skip' }, applied)).toBe(true)
    const state = useVeilStore.getState()
    expect(state.mutes.map((item) => item.id)).toEqual([manualMute.id])
    expect(state.skips).toEqual([
      expect.objectContaining({ type: 'skip', start: 5.25, end: 6.75 })
    ])
    expect(useContentReviewSessionStore.getState().appliedActions['finding-a']).toEqual({
      layerId: state.skips[0].id,
      type: 'skip'
    })
  })

  it('replaces a tracked Skip with exactly one Mute', () => {
    const findings = [finding('finding-a', 8.5, 9.75)]
    applyPlan(findings, { 'finding-a': 'skip' }, {})
    const skip = useVeilStore.getState().skips[0]
    const applied = { 'finding-a': { layerId: skip.id, type: 'skip' as const } }

    expect(applyPlan(findings, { 'finding-a': 'mute' }, applied)).toBe(true)
    expect(useVeilStore.getState()).toMatchObject({
      skips: [],
      mutes: [expect.objectContaining({ start: 8.5, end: 9.75, type: 'mute' })]
    })
    expect(useContentReviewSessionStore.getState().appliedActions['finding-a'].type).toBe('mute')
  })

  it('removes only the tracked layer when an applied action changes to Ignore', () => {
    const findings = [finding('finding-a', 11, 12)]
    const unrelated = createSkipItem(11, 12)
    useVeilStore.setState({ skips: [unrelated] })
    applyPlan(findings, { 'finding-a': 'skip' }, {})
    const tracked = useVeilStore.getState().skips.find((item) => item.id !== unrelated.id)!
    const applied = { 'finding-a': { layerId: tracked.id, type: 'skip' as const } }

    expect(hasContentReviewActionDelta(findings, { 'finding-a': 'ignore' }, applied)).toBe(true)
    expect(applyPlan(findings, { 'finding-a': 'ignore' }, applied)).toBe(true)
    expect(useVeilStore.getState().skips.map((item) => item.id)).toEqual([unrelated.id])
    expect(useContentReviewSessionStore.getState().appliedActions).toEqual({})
  })

  it('clears a stale mapping after normal external deletion without recreating the layer', () => {
    const findings = [finding('finding-a', 14, 15)]
    applyPlan(findings, { 'finding-a': 'mute' }, {})
    const mute = useVeilStore.getState().mutes[0]
    useContentReviewSessionStore.setState({ decisions: { 'finding-a': 'mute' } })

    useVeilStore.getState().removeTrackItem(mute.id, 'mute')

    expect(useContentReviewSessionStore.getState()).toMatchObject({
      appliedActions: {},
      decisions: { 'finding-a': 'unreviewed' }
    })
    expect(useVeilStore.getState().mutes).toEqual([])
  })

  it('clears mapping on subtitle replacement/removal without deleting ordinary VEIL layers', () => {
    const firstCues: SrtCue[] = [{ index: 1, start: 2, end: 3, text: 'A weapon is mentioned.' }]
    const replacement: SrtCue[] = [{ index: 1, start: 20, end: 21, text: 'A calm walk.' }]
    const findings = [finding('finding-a', 2, 3)]
    useVeilStore.setState({ subtitleCues: firstCues })
    useContentReviewSessionStore.getState().analyzeImportedCues(firstCues, true, () => findings)
    applyPlan(findings, { 'finding-a': 'mute' }, {})
    const ordinaryMute = useVeilStore.getState().mutes[0]

    useContentReviewSessionStore.getState().analyzeImportedCues(replacement, true, () => [])
    expect(useContentReviewSessionStore.getState().appliedActions).toEqual({})
    expect(useVeilStore.getState().mutes.map((item) => item.id)).toEqual([ordinaryMute.id])

    useVeilStore.setState({ subtitleCues: [] })
    expect(useContentReviewSessionStore.getState().findings).toEqual([])
    expect(useVeilStore.getState().mutes.map((item) => item.id)).toEqual([ordinaryMute.id])
  })

  it('reports an actionable delta only for document mutations', () => {
    const findings = [finding('finding-a', 1, 2)]
    const muteApplied = { 'finding-a': { layerId: 'mute-a', type: 'mute' as const } }

    expect(hasContentReviewActionDelta(findings, { 'finding-a': 'unreviewed' }, {})).toBe(false)
    expect(hasContentReviewActionDelta(findings, { 'finding-a': 'ignore' }, {})).toBe(false)
    expect(hasContentReviewActionDelta(findings, { 'finding-a': 'mute' }, {})).toBe(true)
    expect(hasContentReviewActionDelta(findings, { 'finding-a': 'mute' }, muteApplied)).toBe(false)
    expect(hasContentReviewActionDelta(findings, { 'finding-a': 'skip' }, muteApplied)).toBe(true)
    expect(hasContentReviewActionDelta(findings, { 'finding-a': 'ignore' }, muteApplied)).toBe(true)
  })

  it('serializes applied actions as ordinary current-schema Mute and Skip shapes with no provenance', () => {
    const findings = [finding('finding-mute', 3.25, 4.5), finding('finding-skip', 7, 8.75)]
    useVeilStore.setState({
      videoFileName: 'review-fixture.mp4',
      videoMetadata: {
        name: 'review-fixture.mp4',
        duration: 60,
        fileSize: 1024,
        width: 1280,
        height: 720
      }
    })
    applyPlan(findings, { 'finding-mute': 'mute', 'finding-skip': 'skip' }, {})

    const track = buildVeilTrackFromStore(useVeilStore.getState())
    const serialized = track!.items.filter((item) => item.type === 'mute' || item.type === 'skip')
    const manual = [createMuteItem(3.25, 4.5), createSkipItem(7, 8.75)]
    expect(serialized.map((item) => Object.keys(item).sort())).toEqual(
      manual.map((item) => Object.keys(item).sort())
    )
    expect(serialized.map((item) => ({ ...item, id: '' }))).toEqual(
      manual.map((item) => ({ ...item, id: '' }))
    )
    expect(track!.version).toBe('1.6.0')
    expect(JSON.stringify(serialized)).not.toMatch(
      /contentReview|category|confidence|generatedBy|provenance|source/
    )
  })
})
