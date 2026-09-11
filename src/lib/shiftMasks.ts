import { enforceMaskTiming } from './maskTiming'

export function shiftMaskTiming(
  start: number,
  end: number,
  deltaSeconds: number
): { start: number; end: number } {
  const duration = end - start
  let nextStart = start + deltaSeconds
  let nextEnd = end + deltaSeconds

  if (nextStart < 0) {
    nextStart = 0
    nextEnd = duration
  }

  return enforceMaskTiming(nextStart, nextEnd)
}
