export const MIN_MASK_DURATION_SECONDS = 0.1

export const DEFAULT_MASK_DURATION_SECONDS = 5

export function enforceMaskTiming(start: number, end: number): { start: number; end: number } {
  const safeStart = Math.max(0, start)
  let safeEnd = end

  if (safeEnd <= safeStart) {
    safeEnd = safeStart + MIN_MASK_DURATION_SECONDS
  } else if (safeEnd - safeStart < MIN_MASK_DURATION_SECONDS) {
    safeEnd = safeStart + MIN_MASK_DURATION_SECONDS
  }

  return { start: safeStart, end: safeEnd }
}

export function resolveNewMaskTiming(
  startSeconds?: number,
  endSeconds?: number
): { start: number; end: number } {
  const start = startSeconds ?? 0
  const end = endSeconds ?? start + DEFAULT_MASK_DURATION_SECONDS
  return enforceMaskTiming(start, end)
}
