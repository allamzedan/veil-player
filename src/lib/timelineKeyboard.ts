export function isTimelineSelectionKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar'
}

export function activateTimelineSelectionKey(
  event: { key: string; preventDefault: () => void; stopPropagation: () => void },
  select: () => void
): boolean {
  if (!isTimelineSelectionKey(event.key)) return false
  event.preventDefault()
  event.stopPropagation()
  select()
  return true
}
