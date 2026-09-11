import { useEffect, useState } from 'react'
import {
  readMotionPreferences,
  subscribeMotionPreferences,
  type MotionPreferences
} from '../lib/motionPreferences'

export function useMotionPreferences(): MotionPreferences {
  const [prefs, setPrefs] = useState<MotionPreferences>(() => readMotionPreferences())

  useEffect(() => {
    return subscribeMotionPreferences(() => {
      setPrefs(readMotionPreferences())
    })
  }, [])

  return prefs
}
