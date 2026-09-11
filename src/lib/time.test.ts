import { describe, expect, it } from 'vitest'
import {
  formatSecondsToHMS,
  normalizeTimestampDisplay,
  parseSecondsInput
} from './time'

describe('formatSecondsToHMS', () => {
  it('formats seconds with padded HH:MM:SS', () => {
    expect(formatSecondsToHMS(5)).toBe('00:00:05')
    expect(formatSecondsToHMS(84)).toBe('00:01:24')
    expect(formatSecondsToHMS(5052)).toBe('01:24:12')
  })
})

describe('normalizeTimestampDisplay', () => {
  it('normalizes compact inputs to HH:MM:SS', () => {
    expect(normalizeTimestampDisplay('5')).toBe('00:00:05')
    expect(normalizeTimestampDisplay('0:05')).toBe('00:00:05')
    expect(normalizeTimestampDisplay('1:24')).toBe('00:01:24')
    expect(normalizeTimestampDisplay('1:24:12')).toBe('01:24:12')
  })

  it('returns null for invalid input', () => {
    expect(normalizeTimestampDisplay('')).toBe(null)
    expect(normalizeTimestampDisplay('abc')).toBe(null)
  })
})

describe('parseSecondsInput', () => {
  it('still parses all supported formats', () => {
    expect(parseSecondsInput('5')).toBe(5)
    expect(parseSecondsInput('1:24')).toBe(84)
    expect(parseSecondsInput('1:24:12')).toBe(5052)
  })
})
