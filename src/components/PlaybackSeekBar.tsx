import {
  type ChangeEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
  type RefObject,
  type TouchEventHandler,
  useLayoutEffect,
  useReducer,
  useRef,
  useState
} from 'react'
import {
  clampSeekTooltipX,
  type PlaybackSeekHover,
  playbackSeekHoverFromPointer,
  type SeekTrackRect
} from '../lib/playbackSeekHover'
import { formatTime } from '../lib/time'

export interface PlaybackSeekBarProps {
  ariaLabel: string
  ariaValueText?: string
  children?: ReactNode
  className: string
  disabled: boolean
  duration: number
  onChange: ChangeEventHandler<HTMLInputElement>
  onMouseDown: MouseEventHandler<HTMLInputElement>
  onMouseUp: MouseEventHandler<HTMLInputElement>
  onTouchEnd: TouchEventHandler<HTMLInputElement>
  onTouchStart: TouchEventHandler<HTMLInputElement>
  step: number
  value: number
}

export type PlaybackSeekHoverAction =
  | { type: 'leave' }
  | { type: 'move'; clientX: number; rect: SeekTrackRect; duration: number }

export function playbackSeekHoverReducer(
  _state: PlaybackSeekHover | null,
  action: PlaybackSeekHoverAction
): PlaybackSeekHover | null {
  if (action.type === 'leave') return null
  return playbackSeekHoverFromPointer(action.clientX, action.rect, action.duration)
}

interface PlaybackSeekBarViewProps extends PlaybackSeekBarProps {
  hover: PlaybackSeekHover | null
  inputRef: RefObject<HTMLInputElement | null>
  onPointerLeave: PointerEventHandler<HTMLDivElement>
  onPointerMove: PointerEventHandler<HTMLDivElement>
  tooltipRef: RefObject<HTMLOutputElement | null>
  tooltipWidth: number
}

export function PlaybackSeekBarView({
  ariaLabel,
  ariaValueText,
  children,
  className,
  disabled,
  duration,
  hover,
  inputRef,
  onChange,
  onMouseDown,
  onMouseUp,
  onPointerLeave,
  onPointerMove,
  onTouchEnd,
  onTouchStart,
  step,
  tooltipRef,
  tooltipWidth,
  value
}: PlaybackSeekBarViewProps) {
  const tooltipX = hover
    ? clampSeekTooltipX(hover.pointerX, hover.trackWidth, tooltipWidth)
    : 0
  const rangeMaximum = Number.isFinite(duration) && duration > 0 ? duration : 0

  return (
    <div
      className={className}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
      <input
        ref={inputRef}
        type="range"
        min="0"
        max={rangeMaximum}
        step={step}
        value={value}
        onChange={onChange}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText}
        disabled={disabled}
      />
      {hover ? (
        <output
          ref={tooltipRef}
          className="playback-seek-bar__hover-time ltr-digits"
          style={{ left: `${tooltipX}px` }}
          aria-hidden="true"
        >
          {formatTime(hover.time)}
        </output>
      ) : null}
    </div>
  )
}

export function PlaybackSeekBar(props: PlaybackSeekBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const tooltipRef = useRef<HTMLOutputElement>(null)
  const [hover, dispatchHover] = useReducer(playbackSeekHoverReducer, null)
  const [tooltipWidth, setTooltipWidth] = useState(0)

  useLayoutEffect(() => {
    if (!hover || !tooltipRef.current) return
    const measuredWidth = tooltipRef.current.getBoundingClientRect().width
    setTooltipWidth((current) => (current === measuredWidth ? current : measuredWidth))
  }, [hover])

  const handlePointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    const input = inputRef.current
    if (!input || props.disabled) {
      dispatchHover({ type: 'leave' })
      return
    }

    dispatchHover({
      type: 'move',
      clientX: event.clientX,
      rect: input.getBoundingClientRect(),
      duration: props.duration
    })
  }

  return (
    <PlaybackSeekBarView
      {...props}
      hover={hover}
      inputRef={inputRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => dispatchHover({ type: 'leave' })}
      tooltipRef={tooltipRef}
      tooltipWidth={tooltipWidth}
    />
  )
}
