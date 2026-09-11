/**
 * Duration drift policy for YouTube-bound VEILs.
 * Small technical jitter is tolerated; material changes warn without rewriting timestamps.
 */

/** Absolute seconds ignored as trivial player/rounding noise. */
export const YOUTUBE_DURATION_DRIFT_ABS_TOLERANCE_SECONDS = 1.5

/** Relative fraction of saved duration ignored as trivial. */
export const YOUTUBE_DURATION_DRIFT_REL_TOLERANCE = 0.02

export type DurationDriftResult =
  | { status: 'unknown'; reason: 'missing_saved' | 'missing_current' }
  | { status: 'ok'; deltaSeconds: number }
  | { status: 'warn'; deltaSeconds: number; message: string }

export const YOUTUBE_DURATION_DRIFT_WARNING =
  "This video's duration has changed since this VEIL was created. Some bookmarks may no longer align exactly."

export function evaluateYouTubeDurationDrift(
  savedDuration: number | null | undefined,
  currentDuration: number | null | undefined
): DurationDriftResult {
  if (savedDuration == null || !Number.isFinite(savedDuration) || savedDuration <= 0) {
    return { status: 'unknown', reason: 'missing_saved' }
  }
  if (currentDuration == null || !Number.isFinite(currentDuration) || currentDuration <= 0) {
    return { status: 'unknown', reason: 'missing_current' }
  }

  const delta = Math.abs(currentDuration - savedDuration)
  const rel = delta / savedDuration
  if (
    delta <= YOUTUBE_DURATION_DRIFT_ABS_TOLERANCE_SECONDS ||
    rel <= YOUTUBE_DURATION_DRIFT_REL_TOLERANCE
  ) {
    return { status: 'ok', deltaSeconds: delta }
  }

  return {
    status: 'warn',
    deltaSeconds: delta,
    message: YOUTUBE_DURATION_DRIFT_WARNING
  }
}
