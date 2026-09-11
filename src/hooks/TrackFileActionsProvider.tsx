import { createContext, useContext, type ReactNode } from 'react'
import TrackImportDialog from '../components/TrackImportDialog'
import YouTubeMismatchDialog from '../components/YouTubeMismatchDialog'
import MissingTrackMediaDialog from '../components/MissingTrackMediaDialog'
import { youtubeMismatchDialogModel } from '../lib/youtubeTrackMismatch'
import { useTrackFileActions } from './useTrackFileActions'

type TrackFileActionsValue = ReturnType<typeof useTrackFileActions>

const TrackFileActionsContext = createContext<TrackFileActionsValue | null>(null)

interface TrackFileActionsProviderProps {
  children: ReactNode
  onAfterTrackMutation?: () => void
}

export function TrackFileActionsProvider({
  children,
  onAfterTrackMutation
}: TrackFileActionsProviderProps) {
  const actions = useTrackFileActions({ onAfterTrackMutation })
  const youtubeMismatch = youtubeMismatchDialogModel(actions.pendingYouTubeMismatch)

  return (
    <TrackFileActionsContext.Provider value={actions}>
      {children}
      <TrackImportDialog
        open={actions.pendingImport !== null}
        manifest={actions.pendingImport?.manifest ?? null}
        classified={actions.pendingImport?.classified ?? null}
        suggestedOffset={actions.pendingImport?.suggestedOffset ?? null}
        onCancel={actions.cancelPendingImport}
        onConfirm={actions.confirmPendingImport}
      />
      <MissingTrackMediaDialog
        expected={actions.pendingMissingMedia}
        pending={actions.missingMediaPending}
        onLocate={() => void actions.locateMissingMedia()}
        onContinue={actions.continueWithoutMissingMedia}
      />
      <YouTubeMismatchDialog
        open={youtubeMismatch.open}
        phase={youtubeMismatch.open ? youtubeMismatch.phase : 'awaiting-decision'}
        trackVideoId={youtubeMismatch.open ? youtubeMismatch.trackVideoId : ''}
        currentVideoId={youtubeMismatch.open ? youtubeMismatch.currentVideoId : ''}
        errorMessage={youtubeMismatch.open ? youtubeMismatch.errorMessage : null}
        onOpenMatching={actions.openMatchingYouTubeVideo}
        onRetry={actions.retryYouTubeMismatch}
        onOpenOnYouTube={actions.openPendingYouTubeOnYouTube}
        onCancel={actions.cancelYouTubeMismatch}
        onCloseError={actions.closeYouTubeMismatch}
      />
    </TrackFileActionsContext.Provider>
  )
}

export function useTrackFileActionsContext(): TrackFileActionsValue {
  const context = useContext(TrackFileActionsContext)
  if (!context) {
    throw new Error('useTrackFileActionsContext must be used within TrackFileActionsProvider')
  }
  return context
}
