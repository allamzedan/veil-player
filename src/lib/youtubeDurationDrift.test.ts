import { describe, expect, it } from 'vitest'
import {
  evaluateYouTubeDurationDrift,
  YOUTUBE_DURATION_DRIFT_ABS_TOLERANCE_SECONDS,
  YOUTUBE_DURATION_DRIFT_WARNING
} from './youtubeDurationDrift'

describe('evaluateYouTubeDurationDrift', () => {
  it('returns unknown when saved duration is missing', () => {
    expect(evaluateYouTubeDurationDrift(null, 100)).toEqual({
      status: 'unknown',
      reason: 'missing_saved'
    })
    expect(evaluateYouTubeDurationDrift(0, 100).status).toBe('unknown')
  })

  it('returns unknown when current duration is missing', () => {
    expect(evaluateYouTubeDurationDrift(100, undefined)).toEqual({
      status: 'unknown',
      reason: 'missing_current'
    })
  })

  it('tolerates small absolute drift', () => {
    const result = evaluateYouTubeDurationDrift(
      100,
      100 + YOUTUBE_DURATION_DRIFT_ABS_TOLERANCE_SECONDS
    )
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.deltaSeconds).toBeLessThanOrEqual(
        YOUTUBE_DURATION_DRIFT_ABS_TOLERANCE_SECONDS
      )
    }
  })

  it('tolerates small relative drift on long videos', () => {
    const saved = 1000
    const current = 1000 * 1.015
    const result = evaluateYouTubeDurationDrift(saved, current)
    expect(result.status).toBe('ok')
  })

  it('warns on material drift', () => {
    const result = evaluateYouTubeDurationDrift(100, 120)
    expect(result).toEqual({
      status: 'warn',
      deltaSeconds: 20,
      message: YOUTUBE_DURATION_DRIFT_WARNING
    })
  })
})
