export type UnsavedChangesDecision = 'save' | 'discard' | 'cancel'
export type UnsavedChangesOutcome =
  | 'saved-and-continue'
  | 'discarded-and-continue'
  | 'cancelled'

export async function executeUnsavedChangesDecision(
  decision: UnsavedChangesDecision,
  actions: {
    save: () => Promise<'saved' | 'canceled' | 'failed'>
    discard: () => void
    proceed: (outcome: Exclude<UnsavedChangesOutcome, 'cancelled'>) => void | Promise<void>
  }
): Promise<UnsavedChangesOutcome> {
  if (decision === 'cancel') return 'cancelled'
  let outcome: Exclude<UnsavedChangesOutcome, 'cancelled'>
  if (decision === 'save') {
    const result = await actions.save()
    if (result !== 'saved') return 'cancelled'
    outcome = 'saved-and-continue'
  } else {
    actions.discard()
    outcome = 'discarded-and-continue'
  }
  await actions.proceed(outcome)
  return outcome
}
