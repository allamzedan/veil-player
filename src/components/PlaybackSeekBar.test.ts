import { Children, createRef, isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  PlaybackSeekBarView,
  playbackSeekHoverReducer,
  type PlaybackSeekBarProps
} from './PlaybackSeekBar'

type TestElement = ReactElement<Record<string, any>>

const baseProps = (): PlaybackSeekBarProps => ({
  ariaLabel: 'Seek',
  ariaValueText: '0:00 / 6:06',
  className: 'seekbar-container',
  disabled: false,
  duration: 366,
  onChange: vi.fn(),
  onMouseDown: vi.fn(),
  onMouseUp: vi.fn(),
  onTouchEnd: vi.fn(),
  onTouchStart: vi.fn(),
  step: 0.1,
  value: 0
})

function findElement(root: ReactElement, type: string): TestElement | undefined {
  return Children.toArray((root.props as { children?: ReactNode }).children).find(
    (child) => isValidElement(child) && child.type === type
  ) as TestElement | undefined
}

function renderView(overrides: Partial<Parameters<typeof PlaybackSeekBarView>[0]> = {}) {
  return PlaybackSeekBarView({
    ...baseProps(),
    hover: null,
    inputRef: createRef<HTMLInputElement>(),
    onPointerLeave: vi.fn(),
    onPointerMove: vi.fn(),
    tooltipRef: createRef<HTMLOutputElement>(),
    tooltipWidth: 48,
    ...overrides
  })
}

describe('PlaybackSeekBar', () => {
  it('hides the tooltip until a valid pointer target exists', () => {
    expect(findElement(renderView(), 'output')).toBeUndefined()
  })

  it('shows formatted LTR hover time and clamps its rendered position', () => {
    const tooltip = findElement(
      renderView({ hover: { pointerX: 0, time: 183, trackWidth: 216 } }),
      'output'
    )

    expect(tooltip?.props.children).toBe('3:03')
    expect(tooltip?.props.className).toContain('ltr-digits')
    expect(tooltip?.props.style).toEqual({ left: '24px' })
    expect(tooltip?.props['aria-hidden']).toBe('true')
  })

  it('clears hover state on pointer leave', () => {
    const hover = playbackSeekHoverReducer(null, {
      type: 'move',
      clientX: 208,
      rect: { left: 100, width: 216 },
      duration: 366
    })

    expect(hover?.time).toBe(183)
    expect(playbackSeekHoverReducer(hover, { type: 'leave' })).toBeNull()
  })

  it('does not invoke seek when the pointer moves', () => {
    const onChange = vi.fn()
    const onPointerMove = vi.fn()
    const root = renderView({ onChange, onPointerMove })

    root.props.onPointerMove({ clientX: 208 })

    expect(onPointerMove).toHaveBeenCalledOnce()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps range changes wired to the existing seek callback', () => {
    const onChange = vi.fn()
    const input = findElement(renderView({ onChange }), 'input')
    const event = { target: { value: '183' } }

    input?.props.onChange(event)

    expect(onChange).toHaveBeenCalledWith(event)
  })

  it('keeps the existing accessible range values unchanged', () => {
    const input = findElement(renderView(), 'input')

    expect(input?.props['aria-label']).toBe('Seek')
    expect(input?.props['aria-valuetext']).toBe('0:00 / 6:06')
    expect(input?.props.min).toBe('0')
    expect(input?.props.max).toBe(366)
  })
})
