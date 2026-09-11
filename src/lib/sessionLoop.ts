export interface SessionLoop {
  start: number
  end: number
  enabled: boolean
}

export const EMPTY_SESSION_LOOP: SessionLoop = {
  start: 0,
  end: 0,
  enabled: false
}

const LOOP_EPSILON = 0.05

export function isValidSessionLoop(loop: SessionLoop): boolean {
  return loop.enabled && Number.isFinite(loop.start) && Number.isFinite(loop.end) && loop.end > loop.start
}

export function shouldSeekToLoopStart(currentTime: number, loop: SessionLoop): boolean {
  if (!isValidSessionLoop(loop)) {
    return false
  }
  return currentTime >= loop.end - LOOP_EPSILON
}

/** True when playback crossed loop end while playing forward (not when paused or seeking past end). */
export function shouldApplyLoopJump(
  previousTime: number,
  currentTime: number,
  loop: SessionLoop,
  isPaused: boolean
): boolean {
  if (isPaused || !isValidSessionLoop(loop)) {
    return false
  }
  return (
    previousTime < loop.end - LOOP_EPSILON &&
    currentTime >= loop.end - LOOP_EPSILON
  )
}

export function readSessionLoop(storageKey: string): SessionLoop {
  const raw = sessionStorage.getItem(storageKey)
  if (!raw) {
    return { ...EMPTY_SESSION_LOOP }
  }
  try {
    const parsed = JSON.parse(raw) as SessionLoop
    return {
      start: typeof parsed.start === 'number' ? parsed.start : 0,
      end: typeof parsed.end === 'number' ? parsed.end : 0,
      enabled: Boolean(parsed.enabled)
    }
  } catch {
    return { ...EMPTY_SESSION_LOOP }
  }
}

export function writeSessionLoop(storageKey: string, loop: SessionLoop): void {
  sessionStorage.setItem(storageKey, JSON.stringify(loop))
}

export function formatLoopReadout(loop: SessionLoop): string {
  if (!isValidSessionLoop(loop)) {
    return 'No loop set'
  }
  return `Loop ${loop.start.toFixed(1)}s → ${loop.end.toFixed(1)}s`
}
