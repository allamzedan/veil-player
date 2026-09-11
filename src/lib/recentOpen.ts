import type { UnsavedChangesOutcome } from './unsavedChangesDecision'

export type GuardedRecentOpenOutcome = 'opened' | 'cancelled' | 'missing'

type RunIfAllowed = (
  action: () => void | Promise<void>
) => Promise<UnsavedChangesOutcome | 'clean-and-continue'>

export async function runGuardedRecentOpen(options: {
  runIfAllowed: RunIfAllowed
  open: () => void | Promise<void>
  validate?: () => boolean | Promise<boolean>
  onMissing?: () => void | Promise<void>
  onOpened?: () => void | Promise<void>
}): Promise<GuardedRecentOpenOutcome> {
  if (options.validate && !(await options.validate())) {
    await options.onMissing?.()
    return 'missing'
  }

  const outcome = await options.runIfAllowed(options.open)
  if (outcome === 'cancelled') return 'cancelled'
  await options.onOpened?.()
  return 'opened'
}