import { MIN_MASK_DURATION_SECONDS } from './maskTiming'

/** Always HH:MM:SS with two-digit hours, minutes, and seconds. */
export function formatSecondsToHMS(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00:00'
  }

  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }

  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/** @deprecated Use formatSeconds — kept for existing player UI. */
export function formatTime(seconds: number): string {
  return formatSeconds(seconds)
}

export function clampTime(value: number, min = 0, max?: number): number {
  if (!Number.isFinite(value)) {
    return min
  }

  let clamped = Math.max(min, value)
  if (max !== undefined && Number.isFinite(max)) {
    clamped = Math.min(clamped, max)
  }
  return clamped
}

/**
 * Parse user timing input: seconds ("12.5"), mm:ss ("1:05"), or hh:mm:ss.
 * Returns null when the value cannot be parsed.
 */
export function parseSecondsInput(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed)
    return Number.isFinite(seconds) ? seconds : null
  }

  const segments = trimmed.split(':')
  if (segments.length < 2 || segments.length > 3) {
    return null
  }

  const numbers = segments.map((segment) => Number(segment))
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) {
    return null
  }

  if (segments.length === 2) {
    const [minutes, seconds] = numbers
    return minutes * 60 + seconds
  }

  const [hours, minutes, seconds] = numbers
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Parse a timestamp string and return HH:MM:SS display, or null when invalid.
 */
export function normalizeTimestampDisplay(value: string): string | null {
  const parsed = parseSecondsInput(value)
  if (parsed === null) {
    return null
  }

  return formatSecondsToHMS(parsed)
}

export function ensureMinimumDuration(
  start: number,
  end: number,
  minDurationSeconds: number = MIN_MASK_DURATION_SECONDS
): { start: number; end: number } {
  const safeStart = clampTime(start)
  let safeEnd = end

  if (!Number.isFinite(safeEnd)) {
    safeEnd = safeStart + minDurationSeconds
  }

  if (safeEnd <= safeStart) {
    safeEnd = safeStart + minDurationSeconds
  } else if (safeEnd - safeStart < minDurationSeconds) {
    safeEnd = safeStart + minDurationSeconds
  }

  return { start: safeStart, end: safeEnd }
}

export function isValidMaskTiming(start: number, end: number): boolean {
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end > start &&
    end - start >= MIN_MASK_DURATION_SECONDS
  )
}
