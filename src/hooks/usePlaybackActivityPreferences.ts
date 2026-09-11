import { useEffect, useState } from 'react'
import {
  readPlaybackActivityPreferences,
  subscribePlaybackActivityPreferences,
  type PlaybackActivityPreferences
} from '../lib/playbackActivityPreferences'

export function usePlaybackActivityPreferences(): PlaybackActivityPreferences {
  const [preferences, setPreferences] = useState(readPlaybackActivityPreferences)

  useEffect(() => subscribePlaybackActivityPreferences(() => {
    setPreferences(readPlaybackActivityPreferences())
  }), [])

  return preferences
}
