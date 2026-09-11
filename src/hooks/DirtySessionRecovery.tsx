import { useEffect } from 'react'
import type { SessionRecoverySnapshot } from '../../electron/lib/sessionRecoveryStore'
import { confirmNative } from '../lib/nativeConfirm'
import {
  buildVeilTrackFromStore,
  parseAndDeserializeTrackJson
} from '../lib/trackSerialization'
import { useVeilStore } from '../state/useVeilStore'
import { useTrackFileActionsContext } from './TrackFileActionsProvider'

const RECOVERY_WRITE_DELAY_MS = 300

function basename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath
}

export function snapshotMatchesTrack(snapshot: SessionRecoverySnapshot): boolean {
  const parsed = parseAndDeserializeTrackJson(snapshot.trackJson)
  if (!parsed.ok) return false
  if (snapshot.mediaIdentity.kind === 'youtube') {
    return parsed.track.media?.kind === 'youtube' &&
      parsed.track.media.videoId === snapshot.mediaIdentity.key
  }
  return Boolean(
    parsed.track.video &&
    basename(snapshot.mediaIdentity.key).toLocaleLowerCase() ===
      parsed.track.video.name.toLocaleLowerCase()
  )
}

function buildRecoverySnapshot(
  fallbackIdentity: SessionRecoverySnapshot['mediaIdentity'] | null
): SessionRecoverySnapshot | null {
  const state = useVeilStore.getState()
  const track = buildVeilTrackFromStore({
    masks: state.masks,
    mutes: state.mutes,
    skips: state.skips,
    bookmarks: state.bookmarks,
    preservedUnsupportedItems: state.preservedUnsupportedItems,
    preservedUnknownItems: state.preservedUnknownItems,
    preservedUnknownRootFields: state.preservedUnknownRootFields,
    globalOffsetSeconds: state.globalOffsetSeconds,
    trackMetadata: state.trackMetadata,
    groups: state.groups,
    anchors: state.anchors,
    subtitleCoverMode: state.subtitleCoverMode,
    regionCoverRect: state.regionCoverRect,
    videoMetadata: state.videoMetadata,
    videoFileName: state.videoFileName,
    mediaSource: state.mediaSource
  })
  if (!track) return null

  const mediaIdentity = state.mediaSource?.kind === 'youtube'
    ? { kind: 'youtube' as const, key: state.mediaSource.videoId }
    : state.videoFilePath
      ? { kind: 'local' as const, key: state.videoFilePath }
      : fallbackIdentity
  if (!mediaIdentity) return null

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    trackJson: JSON.stringify(track),
    trackFilePath: state.trackFilePath,
    mediaIdentity
  }
}

export default function DirtySessionRecovery() {
  const { loadTrackFromJsonText } = useTrackFileActionsContext()

  useEffect(() => {
    const api = window.veil
    if (!api?.readSessionRecovery) return

    let disposed = false
    let unsubscribe: (() => void) | undefined
    let writeTimer: ReturnType<typeof setTimeout> | null = null
    let fallbackIdentity: SessionRecoverySnapshot['mediaIdentity'] | null = null

    const clearTimer = (): void => {
      if (writeTimer !== null) {
        clearTimeout(writeTimer)
        writeTimer = null
      }
    }

    void (async (): Promise<void> => {
      const recovered = await api.readSessionRecovery()
      if (disposed) return

      if (recovered) {
        if (!snapshotMatchesTrack(recovered)) {
          await api.clearSessionRecovery()
        } else if (confirmNative(
          'Recover unsaved changes?',
          'VEIL found unsaved changes from an interrupted session. Recover them now?'
        )) {
          fallbackIdentity = recovered.mediaIdentity
          const result = await loadTrackFromJsonText(recovered.trackJson, {
            trackFilePath: recovered.trackFilePath
          })
          if (result === 'loaded') {
            useVeilStore.getState().markTrackDirty()
          } else {
            await api.clearSessionRecovery()
          }
        } else {
          await api.clearSessionRecovery()
        }
      }

      if (disposed) return
      unsubscribe = useVeilStore.subscribe((state) => {
        clearTimer()
        if (!state.isTrackDirty) {
          void api.clearSessionRecovery()
          return
        }
        writeTimer = setTimeout(() => {
          const snapshot = buildRecoverySnapshot(fallbackIdentity)
          if (snapshot) {
            fallbackIdentity = snapshot.mediaIdentity
            void api.writeSessionRecovery(snapshot)
          }
        }, RECOVERY_WRITE_DELAY_MS)
      })
    })().catch(() => undefined)

    return () => {
      disposed = true
      clearTimer()
      unsubscribe?.()
    }
  }, [loadTrackFromJsonText])

  return null
}
