import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject
} from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { setVideoVolume, toggleVideoMute } from '../lib/videoVolume'
import {
  resolveVerticalVolumePopupPlacement,
  VERTICAL_VOLUME_POPUP
} from '../lib/volumePopupLayout'
import { VolumeHighIcon, VolumeLowIcon, VolumeMutedIcon } from './icons'

interface VolumeControlProps {
  videoRef: RefObject<HTMLVideoElement | null>
  /** Vertical popup slider (Audio Watch dock). Default matches existing video watch control. */
  orientation?: 'horizontal' | 'vertical'
  volume?: number
  muted?: boolean
  onVolumeChange?: (volume: number) => void
  onMutedChange?: (muted: boolean) => void
}

const POPUP_HIDE_MS = 180

function VolumeIcon({ muted, volume }: { muted: boolean; volume: number }) {
  if (muted || volume === 0) {
    return <VolumeMutedIcon className="player-controls__icon" />
  }
  if (volume < 0.5) {
    return <VolumeLowIcon className="player-controls__icon" />
  }
  return <VolumeHighIcon className="player-controls__icon" />
}

export function isVolumePopupOpen(open: boolean): boolean {
  return open
}

export function shouldDismissVolumePopup(args: {
  escapePressed?: boolean
  targetInsideControl?: boolean
  targetInsidePopup?: boolean
}): boolean {
  return Boolean(
    args.escapePressed || (!args.targetInsideControl && !args.targetInsidePopup)
  )
}

export default function VolumeControl({
  videoRef,
  orientation = 'horizontal',
  volume: controlledVolume,
  muted: controlledMuted,
  onVolumeChange: onControlledVolumeChange,
  onMutedChange: onControlledMutedChange
}: VolumeControlProps) {
  useLanguage()

  const [localVolume, setLocalVolume] = useState(1)
  const [localMuted, setLocalMuted] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [verticalPopupStyle, setVerticalPopupStyle] = useState<CSSProperties | undefined>()
  const [placementTick, setPlacementTick] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const vertical = orientation === 'vertical'
  const volume = controlledVolume ?? localVolume
  const muted = controlledMuted ?? localMuted

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const sync = (): void => {
      setLocalVolume(video.volume)
      setLocalMuted(video.muted)
    }

    sync()
    video.addEventListener('volumechange', sync)
    return () => video.removeEventListener('volumechange', sync)
  }, [videoRef])

  const clearHideTimer = (): void => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const showPopup = (): void => {
    clearHideTimer()
    setPopupOpen(true)
  }

  const hidePopupSoon = (): void => {
    if (vertical) {
      return
    }
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setPopupOpen(false)
    }, POPUP_HIDE_MS)
  }

  const togglePopup = (): void => {
    clearHideTimer()
    setPopupOpen((open) => !open)
  }

  useEffect(() => {
    return () => {
      clearHideTimer()
    }
  }, [])

  useLayoutEffect(() => {
    if (!popupOpen || !vertical || !rootRef.current) {
      setVerticalPopupStyle(undefined)
      return
    }

    const button = rootRef.current.querySelector('button')
    const rect = (button ?? rootRef.current).getBoundingClientRect()
    const placement = resolveVerticalVolumePopupPlacement({
      buttonRect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      popup: {
        width: VERTICAL_VOLUME_POPUP.widthPx,
        height: VERTICAL_VOLUME_POPUP.heightPx
      }
    })

    setVerticalPopupStyle({
      position: 'fixed',
      top: placement.top,
      left: placement.left,
      right: 'auto',
      bottom: 'auto',
      transform: 'none',
      width: VERTICAL_VOLUME_POPUP.widthPx,
      height: VERTICAL_VOLUME_POPUP.heightPx,
      zIndex: 80
    })
  }, [popupOpen, vertical, placementTick])

  useEffect(() => {
    if (!popupOpen) {
      return
    }

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node
      if (
        shouldDismissVolumePopup({
          targetInsideControl: rootRef.current?.contains(target) ?? false,
          targetInsidePopup: popupRef.current?.contains(target) ?? false
        })
      ) {
        setPopupOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (shouldDismissVolumePopup({ escapePressed: event.key === 'Escape' })) {
        setPopupOpen(false)
      }
    }

    const onResize = (): void => {
      if (vertical) {
        setPlacementTick((tick) => tick + 1)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [popupOpen, vertical])

  const toggleMute = (): void => {
    if (onControlledMutedChange) {
      onControlledMutedChange(!muted)
      return
    }
    const video = videoRef.current
    if (!video) {
      return
    }
    toggleVideoMute(video)
  }

  const onVolumeChange = (value: number): void => {
    if (onControlledVolumeChange) {
      onControlledVolumeChange(value)
      return
    }
    const video = videoRef.current
    if (!video) {
      return
    }
    setVideoVolume(video, value)
  }

  const onMuteKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (vertical) {
        toggleMute()
        return
      }
      toggleMute()
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      onVolumeChange(Math.min(1, (muted ? 0 : volume) + 0.05))
      showPopup()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      onVolumeChange(Math.max(0, (muted ? 0 : volume) - 0.05))
      showPopup()
    }
  }

  const muteLabel = muted || volume === 0 ? t('playback.unmute') : t('playback.mute')
  const volumeLabel = t('playback.volume')

  const onMuteClick = (): void => {
    if (vertical) {
      togglePopup()
      return
    }
    toggleMute()
  }

  const onMuteContextMenu = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    if (!vertical) {
      return
    }
    event.preventDefault()
    toggleMute()
  }

  const popup = (
    <div
      ref={popupRef}
      className={`volume-control__popup${vertical ? ' volume-control__popup--vertical' : ''}`}
      role="dialog"
      aria-label={volumeLabel}
      style={vertical ? verticalPopupStyle : undefined}
      onMouseEnter={vertical ? undefined : showPopup}
      onMouseLeave={vertical ? undefined : hidePopupSoon}
    >
      <label className="volume-control__slider-wrap">
        <span className="sr-only">{volumeLabel}</span>
        <input
          type="range"
          className={`volume-control__slider${vertical ? ' volume-control__slider--vertical' : ''}`}
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          aria-label={volumeLabel}
          style={
            vertical
              ? ({
                  ['--volume-percent' as string]: `${Math.round((muted ? 0 : volume) * 100)}%`
                } as CSSProperties)
              : undefined
          }
        />
      </label>
    </div>
  )

  return (
    <div
      ref={rootRef}
      className={`volume-control player-controls__volume${vertical ? ' volume-control--vertical' : ''}${popupOpen ? ' volume-control--open' : ''}`}
      onMouseEnter={vertical ? undefined : showPopup}
      onMouseLeave={vertical ? undefined : hidePopupSoon}
    >
      <button
        type="button"
        className={`btn btn-compact btn-ghost volume-control__mute player-controls__icon-btn${popupOpen ? ' player-controls__icon-btn--active' : ''}`}
        onClick={onMuteClick}
        onContextMenu={onMuteContextMenu}
        onKeyDown={onMuteKeyDown}
        aria-label={vertical ? volumeLabel : muteLabel}
        title={vertical ? volumeLabel : muteLabel}
        aria-expanded={popupOpen}
        aria-haspopup="true"
      >
        <VolumeIcon muted={muted} volume={volume} />
      </button>
      {popupOpen
        ? vertical
          ? verticalPopupStyle
            ? createPortal(popup, document.body)
            : null
          : popup
        : null}
    </div>
  )
}
