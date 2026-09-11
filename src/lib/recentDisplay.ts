export function formatMediaDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return '—'
  }

  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
  }

  return `${minutes}:${String(remaining).padStart(2, '0')}`
}

export function formatRecentOpened(openedAt: number, locale = 'en'): string {
  const diffMs = openedAt - Date.now()
  const diffMinutes = Math.round(diffMs / 60_000)

  try {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    if (Math.abs(diffMinutes) < 60) {
      return formatter.format(diffMinutes, 'minute')
    }
    const diffHours = Math.round(diffMinutes / 60)
    if (Math.abs(diffHours) < 24) {
      return formatter.format(diffHours, 'hour')
    }
    const diffDays = Math.round(diffHours / 24)
    if (Math.abs(diffDays) < 7) {
      return formatter.format(diffDays, 'day')
    }
  } catch {
    // fall through
  }

  return new Date(openedAt).toLocaleDateString(locale)
}
