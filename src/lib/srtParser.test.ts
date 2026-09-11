import { describe, expect, it } from 'vitest'
import { parseSrt } from './srtParser'

describe('parseSrt', () => {
  it('parses a minimal valid block', () => {
    const text = `1
00:00:01,000 --> 00:00:04,000
Hello world`
    const result = parseSrt(text)
    expect(result.cues).toHaveLength(1)
    expect(result.cues[0].text).toBe('Hello world')
    expect(result.cues[0].start).toBe(1)
    expect(result.cues[0].end).toBe(4)
  })

  it('skips invalid timing blocks', () => {
    const text = `1
not a timing line
Missing timing`
    const result = parseSrt(text)
    expect(result.cues).toHaveLength(0)
    expect(result.skippedCount).toBeGreaterThan(0)
  })

  it('handles empty input', () => {
    const result = parseSrt('')
    expect(result.cues).toHaveLength(0)
  })
})
