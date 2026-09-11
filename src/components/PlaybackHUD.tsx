import { useEffect, useState } from 'react'
import { useMotionPreferences } from '../hooks/useMotionPreferences'
import { shouldAnimateTransitions } from '../lib/motionPreferences'
import {
  subscribePlaybackHud,
  type PlaybackHudState
} from '../lib/playbackHud'

export default function PlaybackHUD() {
  const motionPrefs = useMotionPreferences()
  const [state, setState] = useState<PlaybackHudState | null>(null)
  const motionAllowed = shouldAnimateTransitions(motionPrefs)

  useEffect(() => subscribePlaybackHud(setState), [])

  if (!state?.visible) {
    return null
  }

  return (
    <div
      className={[
        'playback-hud',
        `playback-hud--${state.kind}`,
        motionAllowed ? 'playback-hud--motion' : 'playback-hud--instant',
        state.extendOnly ? 'playback-hud--extend' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
      aria-atomic
    >
      {state.message}
    </div>
  )
}

