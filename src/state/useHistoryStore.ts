import { create } from 'zustand'
import {
  captureTrackSnapshot,
  snapshotsEqual,
  type TrackHistorySnapshot,
  type TrackSnapshotSource
} from '../lib/historySnapshot'

const MAX_SNAPSHOTS = 100

interface HistoryState {
  past: TrackHistorySnapshot[]
  future: TrackHistorySnapshot[]
  coalesceBaseline: TrackHistorySnapshot | null
  pushSnapshot: (snapshot: TrackHistorySnapshot) => void
  beginCoalescedUpdate: (source: TrackSnapshotSource) => void
  endCoalescedUpdate: (commit: boolean) => void
  isCoalescing: () => boolean
  undo: (current: TrackSnapshotSource) => TrackHistorySnapshot | null
  redo: (current: TrackSnapshotSource) => TrackHistorySnapshot | null
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  coalesceBaseline: null,

  pushSnapshot: (snapshot) => {
    if (get().coalesceBaseline !== null) {
      return
    }

    set((state) => {
      const top = state.past[state.past.length - 1]
      if (top && snapshotsEqual(top, snapshot)) {
        return state
      }

      const past = [...state.past, snapshot]
      if (past.length > MAX_SNAPSHOTS) {
        past.shift()
      }

      return { past, future: [] }
    })
  },

  beginCoalescedUpdate: (source) => {
    set({ coalesceBaseline: captureTrackSnapshot(source) })
  },

  endCoalescedUpdate: (commit) => {
    const baseline = get().coalesceBaseline
    if (!baseline) {
      return
    }

    set({ coalesceBaseline: null })

    if (commit) {
      get().pushSnapshot(baseline)
    }

    return baseline
  },

  isCoalescing: () => get().coalesceBaseline !== null,

  undo: (current) => {
    const { past, future } = get()
    if (past.length === 0) {
      return null
    }

    const previous = past[past.length - 1]
    const nextPast = past.slice(0, -1)
    const currentSnapshot = captureTrackSnapshot(current)

    set({
      past: nextPast,
      future: [...future, currentSnapshot]
    })

    return previous
  },

  redo: (current) => {
    const { past, future } = get()
    if (future.length === 0) {
      return null
    }

    const next = future[future.length - 1]
    const nextFuture = future.slice(0, -1)
    const currentSnapshot = captureTrackSnapshot(current)

    set({
      past: [...past, currentSnapshot],
      future: nextFuture
    })

    return next
  },

  clear: () => {
    set({ past: [], future: [], coalesceBaseline: null })
  },

  canUndo: () => get().past.length > 0,

  canRedo: () => get().future.length > 0
}))
