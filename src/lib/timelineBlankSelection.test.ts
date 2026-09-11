import { describe, expect, it } from 'vitest'
import { isBlankSeekableTimelineTarget } from './timelineBlankSelection'

function targetWithClosest(matches: readonly string[]): EventTarget {
  return {
    closest: (selectors: string) => matches.some((match) => selectors.includes(match))
      ? { className: matches.join(' ') }
      : null
  } as unknown as EventTarget
}

describe('blank timeline pointer routing', () => {
  it('recognizes the packaged nested usable-track target shape as blank', () => {
    const blankPresentationChild = targetWithClosest(['.timeline-row__usable-track'])
    expect(isBlankSeekableTimelineTarget(blankPresentationChild)).toBe(true)
  })

  it.each([
    '.timeline-bar',
    '.timeline-bookmark-marker',
    '.timeline-playhead',
    '.timeline-ruler',
    '.timeline-editor__loop-band',
    '.timeline-controls',
    'button'
  ])('excludes interactive or non-seekable %s targets', (interactiveSelector) => {
    const target = targetWithClosest(
      interactiveSelector === '.timeline-bar' || interactiveSelector === 'button'
        ? ['.timeline-row__usable-track', interactiveSelector]
        : [interactiveSelector]
    )
    expect(isBlankSeekableTimelineTarget(target)).toBe(false)
  })
})
