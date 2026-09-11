import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildTrackSessionFingerprint,
  readCollapsedGroupIds,
  readHiddenGroupIds,
  readSoloGroupId,
  writeCollapsedGroupIds,
  writeHiddenGroupIds,
  writeSoloGroupId
} from '../lib/trackGroupSession'
import { useVeilStore } from '../state/useVeilStore'

export interface TrackGroupSession {
  hiddenGroupIds: Set<string>
  soloGroupId: string | null
  collapsedGroupIds: Set<string>
  totalItems: number
  onToggleHidden: (groupId: string) => void
  onSetSoloGroup: (groupId: string | null) => void
  onToggleGroupCollapsed: (groupId: string) => void
  onCollapseAllGroups: () => void
  onExpandAllGroups: () => void
  onClearSolo: () => void
}

export function useTrackGroupSession(): TrackGroupSession {
  const videoFileName = useVeilStore((state) => state.videoFileName)
  const videoMetadata = useVeilStore((state) => state.videoMetadata)
  const groups = useVeilStore((state) => state.groups)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)

  const sessionKey = useMemo(
    () => buildTrackSessionFingerprint(videoFileName, videoMetadata?.duration ?? 0),
    [videoFileName, videoMetadata?.duration]
  )

  const [hiddenGroupIds, setHiddenGroupIds] = useState<Set<string>>(() =>
    readHiddenGroupIds(sessionKey)
  )
  const [soloGroupId, setSoloGroupId] = useState<string | null>(() => readSoloGroupId(sessionKey))
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() =>
    readCollapsedGroupIds(sessionKey)
  )

  useEffect(() => {
    setHiddenGroupIds(readHiddenGroupIds(sessionKey))
    setSoloGroupId(readSoloGroupId(sessionKey))
    setCollapsedGroupIds(readCollapsedGroupIds(sessionKey))
  }, [sessionKey])

  const onToggleHidden = useCallback(
    (groupId: string): void => {
      setHiddenGroupIds((current) => {
        const next = new Set(current)
        if (next.has(groupId)) {
          next.delete(groupId)
        } else {
          next.add(groupId)
        }
        writeHiddenGroupIds(sessionKey, next)
        return next
      })
    },
    [sessionKey]
  )

  const onSetSoloGroup = useCallback(
    (groupId: string | null): void => {
      setSoloGroupId(groupId)
      writeSoloGroupId(sessionKey, groupId)
    },
    [sessionKey]
  )

  const onToggleGroupCollapsed = useCallback(
    (groupId: string): void => {
      setCollapsedGroupIds((current) => {
        const next = new Set(current)
        if (next.has(groupId)) {
          next.delete(groupId)
        } else {
          next.add(groupId)
        }
        writeCollapsedGroupIds(sessionKey, next)
        return next
      })
    },
    [sessionKey]
  )

  const onCollapseAllGroups = useCallback((): void => {
    const next = new Set(groups.map((group) => group.id))
    setCollapsedGroupIds(next)
    writeCollapsedGroupIds(sessionKey, next)
  }, [groups, sessionKey])

  const onExpandAllGroups = useCallback((): void => {
    setCollapsedGroupIds(new Set())
    writeCollapsedGroupIds(sessionKey, new Set())
  }, [sessionKey])

  const onClearSolo = useCallback((): void => {
    onSetSoloGroup(null)
  }, [onSetSoloGroup])

  const totalItems = masks.length + mutes.length + skips.length

  return {
    hiddenGroupIds,
    soloGroupId,
    collapsedGroupIds,
    totalItems,
    onToggleHidden,
    onSetSoloGroup,
    onToggleGroupCollapsed,
    onCollapseAllGroups,
    onExpandAllGroups,
    onClearSolo
  }
}
