import { describe, expect, it } from 'vitest'
import { activateTimelineSelectionKey, isTimelineSelectionKey } from './timelineKeyboard'
import { vi } from 'vitest'

describe('timeline item keyboard selection', () => {
  it('accepts Enter and current/legacy Space values only', () => {
    expect(isTimelineSelectionKey('Enter')).toBe(true)
    expect(isTimelineSelectionKey(' ')).toBe(true)
    expect(isTimelineSelectionKey('Spacebar')).toBe(true)
    expect(isTimelineSelectionKey('Delete')).toBe(false)
  })

  it.each(['Enter', ' '])('selects once and prevents default handling for %j', (key) => {
    const event = { key, preventDefault: vi.fn(), stopPropagation: vi.fn() }
    const select = vi.fn()
    expect(activateTimelineSelectionKey(event, select)).toBe(true)
    expect(select).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
  })

  it('does not consume unrelated keys', () => {
    const event = { key: 'Delete', preventDefault: vi.fn(), stopPropagation: vi.fn() }
    const select = vi.fn()
    expect(activateTimelineSelectionKey(event, select)).toBe(false)
    expect(select).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
