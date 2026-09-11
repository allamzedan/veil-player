import { captureTrackSnapshot, type TrackSnapshotSource } from './historySnapshot'
import { incrementWorkflowMetric } from './workflowMetrics'
import { useHistoryStore } from '../state/useHistoryStore'
import { useVeilStore } from '../state/useVeilStore'

export function getTrackSnapshotSource(): TrackSnapshotSource {
  const state = useVeilStore.getState()
  return {
    masks: state.masks,
    mutes: state.mutes,
    skips: state.skips,
    bookmarks: state.bookmarks,
    globalOffsetSeconds: state.globalOffsetSeconds,
    trackMetadata: state.trackMetadata,
    groups: state.groups,
    anchors: state.anchors
  }
}

export function recordTrackHistoryBefore(): void {
  if (useHistoryStore.getState().isCoalescing()) {
    return
  }
  useHistoryStore.getState().pushSnapshot(captureTrackSnapshot(getTrackSnapshotSource()))
}

export function beginTrackHistoryCoalesced(): void {
  useHistoryStore.getState().beginCoalescedUpdate(getTrackSnapshotSource())
}

export function endTrackHistoryCoalesced(commit: boolean): void {
  const baseline = useHistoryStore.getState().endCoalescedUpdate(commit)
  if (!commit && baseline) {
    applyTrackSnapshot(baseline)
  }
}

export function applyTrackSnapshot(snapshot: TrackSnapshotSource): void {
  useVeilStore.setState({
    masks: structuredClone(snapshot.masks),
    mutes: structuredClone(snapshot.mutes),
    skips: structuredClone(snapshot.skips),
    bookmarks: structuredClone(snapshot.bookmarks),
    globalOffsetSeconds: snapshot.globalOffsetSeconds,
    trackMetadata: structuredClone(snapshot.trackMetadata),
    groups: structuredClone(snapshot.groups),
    anchors: structuredClone(snapshot.anchors),
    isTrackDirty: true
  })
  useVeilStore.getState().validateAndFixSelection()
}

export function clearTrackHistory(): void {
  useHistoryStore.getState().clear()
}

export function undoTrack(): boolean {
  const snapshot = useHistoryStore.getState().undo(getTrackSnapshotSource())
  if (!snapshot) {
    return false
  }
  applyTrackSnapshot(snapshot)
  incrementWorkflowMetric('undo')
  return true
}

export function redoTrack(): boolean {
  const snapshot = useHistoryStore.getState().redo(getTrackSnapshotSource())
  if (!snapshot) {
    return false
  }
  applyTrackSnapshot(snapshot)
  incrementWorkflowMetric('redo')
  return true
}
