import { useEffect, useState } from 'react'
import {
  hydrateContentReviewCustomTerms,
  readContentReviewPreferences,
  subscribeContentReviewPreferences,
  type ContentReviewPreferences
} from '../lib/contentReviewPreferences'

export function useContentReviewPreferences(): ContentReviewPreferences {
  const [preferences, setPreferences] = useState(readContentReviewPreferences)

  useEffect(() => {
    const unsubscribe = subscribeContentReviewPreferences(() => {
      setPreferences(readContentReviewPreferences())
    })
    void hydrateContentReviewCustomTerms()
    return unsubscribe
  }, [])

  return preferences
}
