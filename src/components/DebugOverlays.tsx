import { useSyncExternalStore } from 'react'
import {
  getDebugSnapshot,
  isMatchingDebugEnabled,
  isSeekDebugEnabled,
  subscribeDebugState
} from '../lib/debugState'

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  zIndex: 10000,
  right: 12,
  width: 430,
  maxHeight: '46vh',
  overflow: 'auto',
  padding: 12,
  background: 'rgba(0, 0, 0, 0.88)',
  color: '#ffffff',
  border: '1px solid #ffffff',
  borderRadius: 6,
  font: '12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace',
  whiteSpace: 'pre-wrap'
}

function safeStringify(input: unknown): string {
  try {
    if (input === undefined) {
      return 'undefined'
    }
    if (input === null) {
      return 'null'
    }
    if (typeof input === 'string') {
      return input
    }
    if (typeof input === 'number' || typeof input === 'boolean') {
      return String(input)
    }
    return JSON.stringify(input)
  } catch {
    return '[unserializable]'
  }
}

function value(label: string, input: unknown): string {
  return `${label}: ${safeStringify(input)}`
}

export default function DebugOverlays() {
  if (!import.meta.env.DEV) {
    return null
  }

  const showSeek = isSeekDebugEnabled()
  const showMatching = isMatchingDebugEnabled()

  if (!showSeek && !showMatching) {
    return null
  }

  return <DebugOverlayPanels showSeek={showSeek} showMatching={showMatching} />
}

function DebugOverlayPanels({
  showSeek,
  showMatching
}: {
  showSeek: boolean
  showMatching: boolean
}) {
  const snapshot = useSyncExternalStore(
    subscribeDebugState,
    getDebugSnapshot,
    getDebugSnapshot
  )

  const seek = snapshot?.seek
  const matching = snapshot?.matching
  const seekEvents = Array.isArray(seek?.events) ? seek.events : []

  return (
    <>
      {showSeek ? (
        <aside style={{ ...panelStyle, top: 12 }} aria-label="VEIL seek debug">
          <strong>VEIL seek debug</strong>
          {'\n'}
          {value('video.currentTime', seek?.videoCurrentTime ?? null)}
          {'\n'}
          {value('displayTime', seek?.displayTime ?? null)}
          {'\n'}
          {value('duration', seek?.duration ?? null)}
          {'\n'}
          {value('paused', seek?.paused ?? null)}
          {'\n'}
          {value('readyState', seek?.readyState ?? null)}
          {'\n'}
          {value('networkState', seek?.networkState ?? null)}
          {'\n'}
          {value('video.error.code', seek?.errorCode ?? null)}
          {'\n'}
          {value('video.error.message', seek?.errorMessage ?? null)}
          {'\n'}
          {value('srcKind', seek?.srcKind ?? null)}
          {'\n'}
          {value('seekable.length', seek?.seekableLength ?? null)}
          {'\n'}
          {value('seekableRanges', seek?.seekableRanges ?? [])}
          {'\n'}
          {value('targetWithinSeekableRange', seek?.targetWithinSeekableRange ?? null)}
          {'\n'}
          {value('requestedSeekTarget', seek?.requestedSeekTarget ?? null)}
          {'\n'}
          {value('pendingSeekTarget', seek?.pendingSeekTarget ?? null)}
          {'\n'}
          {value('seekAttemptAt', seek?.seekAttemptAt ?? null)}
          {'\n'}
          {value('lastSeekedEventResult', seek?.lastSeekedEventResult ?? null)}
          {'\n'}
          {value('lastManualSeekTarget', seek?.lastManualSeekTarget ?? null)}
          {'\n'}
          {value('lastSeekSource', seek?.lastSeekSource ?? null)}
          {'\n'}
          {value('lastSeekAt', seek?.lastSeekAt ?? null)}
          {'\n'}
          {value('lastSeekedEventTime', seek?.lastSeekedEventTime ?? null)}
          {'\n'}
          {value('skipLatchState', seek?.skipLatchState ?? 'unknown')}
          {'\n'}
          {value('loopState', seek?.loopState ?? 'unknown')}
          {'\n'}
          {value('lastCurrentTimeSetter', seek?.lastCurrentTimeSetter ?? null)}
          {'\n\n'}
          events:
          {'\n'}
          {seekEvents.length > 0 ? seekEvents.join('\n') : '(none)'}
        </aside>
      ) : null}

      {showMatching ? (
        <aside style={{ ...panelStyle, top: showSeek ? '50vh' : 12 }} aria-label="VEIL matching debug">
          <strong>VEIL matching debug</strong>
          {'\n'}
          {value('videoFilePath', matching?.videoFilePath ?? null)}
          {'\n'}
          {value('videoMetadataLoaded', matching?.videoMetadataLoaded ?? false)}
          {'\n'}
          {value('candidatePaths', matching?.candidatePaths ?? [])}
          {'\n'}
          {value('candidateExists', matching?.candidateExists ?? [])}
          {'\n'}
          {value('matchingCheckTriggeredAt', matching?.matchingCheckTriggeredAt ?? null)}
          {'\n'}
          {value('matchingCheckReason', matching?.matchingCheckReason ?? null)}
          {'\n'}
          {value('matchingDialogOpen', matching?.matchingDialogOpen ?? false)}
          {'\n'}
          {value('matchingError', matching?.matchingError ?? null)}
        </aside>
      ) : null}
    </>
  )
}
