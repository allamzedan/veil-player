import { describe, expect, it, vi } from 'vitest'
import { hasYouTubeProviderConsent, recordYouTubeProviderConsent, YOUTUBE_PROVIDER_CONSENT_KEY } from './youtubeProviderConsent'

describe('YouTube provider consent', () => {
  it('is denied by default and persists only the versioned acknowledgement', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: vi.fn((key: string, value: string) => values.set(key, value))
    }
    expect(hasYouTubeProviderConsent(storage)).toBe(false)
    recordYouTubeProviderConsent(storage)
    expect(storage.setItem).toHaveBeenCalledWith(YOUTUBE_PROVIDER_CONSENT_KEY, 'accepted')
    expect(hasYouTubeProviderConsent(storage)).toBe(true)
  })
})
