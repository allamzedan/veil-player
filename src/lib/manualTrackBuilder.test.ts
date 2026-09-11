import { describe, expect, it } from 'vitest'
import {
  formatManualTrackBuilderTimestamp,
  incrementManualTrackBuilderTimestamp,
  parseManualTrackRows
} from './manualTrackBuilder'

describe('parseManualTrackRows', () => {
  it('increments formatted timestamps predictably without losing fractional precision', () => {
    expect(incrementManualTrackBuilderTimestamp('00:00:01.25', 0.1)).toBe('00:00:01.35')
    expect(incrementManualTrackBuilderTimestamp('00:00:00', -0.1)).toBe('00:00:00')
    expect(formatManualTrackBuilderTimestamp(3661.125)).toBe('01:01:01.125')
  })
  it('rejects end before start', () => {
    const result = parseManualTrackRows(
      [
        {
          id: 'r1',
          start: '0:10',
          end: '0:05',
          type: 'mask',
          label: ''
        }
      ],
      { videoDuration: 120 }
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.rowErrors.r1?.end).toMatch(/greater than start/i)
    }
  })

  it('imports mask, mute, and skip rows', () => {
    const result = parseManualTrackRows(
      [
        {
          id: 'm1',
          start: '0',
          end: '5',
          type: 'mask',
          label: 'Intro'
        },
        {
          id: 'u1',
          start: '10',
          end: '12',
          type: 'mute',
          label: ''
        },
        {
          id: 's1',
          start: '20',
          end: '22',
          type: 'skip',
          label: 'Jump'
        }
      ],
      { videoDuration: 60 }
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.batch.masks).toHaveLength(1)
      expect(result.batch.masks[0]?.style.color).toBe('#000000')
      expect(result.batch.masks[0]?.rect.xPercent).toBe(35)
      expect(result.batch.masks[0]?.label).toBe('Intro')
      expect(result.batch.mutes).toHaveLength(1)
      expect(result.batch.skips).toHaveLength(1)
      expect(result.batch.skips[0]?.label).toBe('Jump')
    }
  })

  it('rejects end beyond video duration', () => {
    const result = parseManualTrackRows(
      [
        {
          id: 'r1',
          start: '0',
          end: '90',
          type: 'mute',
          label: ''
        }
      ],
      { videoDuration: 60 }
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.rowErrors.r1?.end).toMatch(/video duration/i)
    }
  })

  it('skips video duration check when validation is disabled', () => {
    const result = parseManualTrackRows(
      [
        {
          id: 'r1',
          start: '0',
          end: '90',
          type: 'mute',
          label: ''
        }
      ],
      { videoDuration: 60, validateVideoDuration: false }
    )

    expect(result.ok).toBe(true)
  })
})
