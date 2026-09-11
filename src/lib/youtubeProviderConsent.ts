export const YOUTUBE_PROVIDER_CONSENT_KEY = 'veil.youtubeProviderConsent.v1'
export const VEIL_PRIVACY_POLICY_URL = 'https://github.com/allamzedan/veil-player/blob/main/PRIVACY.md'
export const YOUTUBE_TERMS_URL = 'https://www.youtube.com/t/terms'
export const GOOGLE_PRIVACY_POLICY_URL = 'https://policies.google.com/privacy'

export function hasYouTubeProviderConsent(storage: Pick<Storage, 'getItem'>): boolean {
  return storage.getItem(YOUTUBE_PROVIDER_CONSENT_KEY) === 'accepted'
}

export function recordYouTubeProviderConsent(storage: Pick<Storage, 'setItem'>): void {
  storage.setItem(YOUTUBE_PROVIDER_CONSENT_KEY, 'accepted')
}
