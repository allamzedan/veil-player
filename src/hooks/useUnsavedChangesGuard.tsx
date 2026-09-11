import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode
} from 'react'
import UnsavedChangesModal from '../components/UnsavedChangesModal'
import { useVeilStore } from '../state/useVeilStore'
import { useTrackFileActionsContext } from './TrackFileActionsProvider'
import {
  executeUnsavedChangesDecision,
  type UnsavedChangesOutcome
} from '../lib/unsavedChangesDecision'

type GuardedAction = () => void | Promise<void>

interface UnsavedChangesGuardContextValue {
  runIfAllowed: (action: GuardedAction) => Promise<UnsavedChangesOutcome | 'clean-and-continue'>
}

interface PendingGuardedAction {
  action: GuardedAction
  resolve: (outcome: UnsavedChangesOutcome) => void
}

const UnsavedChangesGuardContext = createContext<UnsavedChangesGuardContextValue | null>(null)

interface UnsavedChangesGuardProviderProps {
  children: ReactNode
}

export function UnsavedChangesGuardProvider({
  children
}: UnsavedChangesGuardProviderProps) {
  const [open, setOpen] = useState(false)
  const pendingActionRef = useRef<PendingGuardedAction | null>(null)
  const markTrackClean = useVeilStore((state) => state.markTrackClean)
  const { saveTrack } = useTrackFileActionsContext()

  const runPending = useCallback(async (
    outcome: Exclude<UnsavedChangesOutcome, 'cancelled'>
  ): Promise<void> => {
    const pending = pendingActionRef.current
    pendingActionRef.current = null
    setOpen(false)
    if (pending) {
      await pending.action()
      pending.resolve(outcome)
    }
  }, [])

  const runIfAllowed = useCallback(
    async (action: GuardedAction): Promise<UnsavedChangesOutcome | 'clean-and-continue'> => {
      if (!useVeilStore.getState().isTrackDirty) {
        await action()
        return 'clean-and-continue'
      }

      if (pendingActionRef.current) return 'cancelled'
      return new Promise<UnsavedChangesOutcome>((resolve) => {
        pendingActionRef.current = { action, resolve }
        setOpen(true)
      })
    },
    []
  )

  const onCancel = useCallback((): void => {
    pendingActionRef.current?.resolve('cancelled')
    pendingActionRef.current = null
    setOpen(false)
  }, [])

  const onDiscard = useCallback((): void => {
    void executeUnsavedChangesDecision('discard', {
      save: async () => 'canceled',
      discard: markTrackClean,
      proceed: runPending
    })
  }, [markTrackClean, runPending])

  const onSave = useCallback((): void => {
    void (async (): Promise<void> => {
      await executeUnsavedChangesDecision('save', {
        save: saveTrack,
        discard: markTrackClean,
        proceed: runPending
      })
    })()
  }, [markTrackClean, runPending, saveTrack])

  return (
    <UnsavedChangesGuardContext.Provider value={{ runIfAllowed }}>
      {children}
      <UnsavedChangesModal
        open={open}
        onCancel={onCancel}
        onDiscard={onDiscard}
        onSave={onSave}
      />
    </UnsavedChangesGuardContext.Provider>
  )
}

export function useUnsavedChangesGuard(): UnsavedChangesGuardContextValue {
  const context = useContext(UnsavedChangesGuardContext)
  if (!context) {
    throw new Error('useUnsavedChangesGuard must be used within UnsavedChangesGuardProvider')
  }
  return context
}
