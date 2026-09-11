import { beforeEach, describe, expect, it } from 'vitest'
import { useVeilStore } from '../state/useVeilStore'
import { clearExplicitLayerSelection } from './explicitLayerSelection'
import {
  isBlankSeekableTimelineTarget,
  shouldClearBlankTimelineSelection
} from './timelineBlankSelection'

function targetWithClosest(matches: readonly string[]): EventTarget {
  return {
    closest: (selectors: string) => matches.some((match) => selectors.includes(match))
      ? { className: matches.join(' ') }
      : null
  } as unknown as EventTarget
}

describe('blank timeline double-click deselection', () => {
  beforeEach(() => {
    useVeilStore.setState({ selectedItemId: 'mask-1', selectedItemType: 'mask' })
  })

  it('clears the selected item only for the second blank activation', () => {
    const blank = targetWithClosest(['.timeline-row__usable-track'])
    expect(isBlankSeekableTimelineTarget(blank)).toBe(true)
    expect(shouldClearBlankTimelineSelection(blank, 1)).toBe(false)
    expect(useVeilStore.getState().selectedItemId).toBe('mask-1')

    expect(shouldClearBlankTimelineSelection(blank, 2)).toBe(true)
    clearExplicitLayerSelection()
    expect(useVeilStore.getState().selectedItemId).toBeNull()
    expect(useVeilStore.getState().selectedItemType).toBeNull()
  })

  it('does not clear when the second activation lands on an item hit region', () => {
    const item = targetWithClosest(['.timeline-row__usable-track', '.timeline-bar'])
    expect(shouldClearBlankTimelineSelection(item, 2)).toBe(false)
    expect(useVeilStore.getState().selectedItemId).toBe('mask-1')
  })
})
