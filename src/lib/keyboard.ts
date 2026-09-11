export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  if (target instanceof HTMLTextAreaElement) {
    return true
  }

  if (target instanceof HTMLSelectElement) {
    return true
  }

  if (target instanceof HTMLInputElement) {
    const textLikeInputTypes = new Set([
      'text',
      'search',
      'email',
      'url',
      'tel',
      'password',
      'number',
      'date',
      'datetime-local',
      'month',
      'time',
      'week'
    ])

    return textLikeInputTypes.has(target.type)
  }

  return false
}