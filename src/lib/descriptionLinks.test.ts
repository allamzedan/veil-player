import { describe, expect, it } from 'vitest'
import { tokenizeDescription } from './descriptionLinks'

describe('YouTube description safety', () => {
  it('keeps HTML and scripts as inert text while tokenizing only HTTPS links', () => {
    const input = '<script>alert(1)</script> مرحبا שלום\nhttps://example.com/watch?v=1.'
    const tokens = tokenizeDescription(input)
    expect(tokens[0]).toEqual({ kind: 'text', value: '<script>alert(1)</script> مرحبا שלום\n' })
    expect(tokens).toContainEqual({ kind: 'link', value: 'https://example.com/watch?v=1' })
  })

  it('does not link javascript or inline HTML', () => {
    expect(tokenizeDescription('javascript:alert(1) <b>bold</b>')).toEqual([
      { kind: 'text', value: 'javascript:alert(1) <b>bold</b>' }
    ])
  })
})
