import type { UnsavedChangesOutcome } from './unsavedChangesDecision'

type RunIfAllowed = (
  action: () => void | Promise<void>
) => Promise<UnsavedChangesOutcome | 'clean-and-continue'>

export type RecentRecoveryOutcome =
  | 'cancelled'
  | 'invalid'
  | 'guard-cancelled'
  | 'failed'
  | 'opened'

export async function runRecentRecovery<T>(options: {
  pick: () => Promise<T | null>
  validate: (candidate: T) => boolean | Promise<boolean>
  runIfAllowed: RunIfAllowed
  activate: (candidate: T) => boolean | Promise<boolean>
  commit: (candidate: T) => void | Promise<void>
}): Promise<RecentRecoveryOutcome> {
  const candidate = await options.pick()
  if (candidate === null) return 'cancelled'
  if (!(await options.validate(candidate))) return 'invalid'

  let activated = false
  const guardOutcome = await options.runIfAllowed(async () => {
    activated = await options.activate(candidate)
  })
  if (guardOutcome === 'cancelled') return 'guard-cancelled'
  if (!activated) return 'failed'

  await options.commit(candidate)
  return 'opened'
}
