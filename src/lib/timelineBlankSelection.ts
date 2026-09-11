interface ClosestTarget {
  closest: (selectors: string) => unknown
}

const BLANK_TIMELINE_EXCLUSIONS = [
  '.timeline-bar',
  '.timeline-bookmark-marker',
  '.timeline-playhead',
  '.timeline-editor__loop-band',
  '.timeline-controls',
  'button',
  'input',
  'select',
  'textarea',
  'a'
].join(', ')

export function isBlankSeekableTimelineTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Partial<ClosestTarget>).closest !== 'function') return false
  const element = target as unknown as ClosestTarget
  if (element.closest(BLANK_TIMELINE_EXCLUSIONS)) return false
  return Boolean(element.closest('.timeline-row__usable-track'))
}

export function isBlankTimelineDeselectionTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Partial<ClosestTarget>).closest !== 'function') return false
  const element = target as unknown as ClosestTarget
  if (element.closest(BLANK_TIMELINE_EXCLUSIONS)) return false
  return Boolean(
    element.closest('.timeline-row__usable-track') ||
    element.closest('.timeline-ruler__usable-track')
  )
}

export function shouldCompleteBlankTimelineDoubleClick(input: {
  elapsedMs: number
  deltaX: number
  secondTargetIsBlankOrPlayhead: boolean
}): boolean {
  return (
    input.elapsedMs >= 0 &&
    input.elapsedMs <= 500 &&
    input.deltaX <= 10 &&
    input.secondTargetIsBlankOrPlayhead
  )
}

export function shouldClearBlankTimelineSelection(target: EventTarget | null, activationCount: number): boolean {
  return activationCount >= 2 && isBlankTimelineDeselectionTarget(target)

}
