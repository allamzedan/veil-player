/** Build-time provider distribution gate. Production builds default disabled. */
export const YOUTUBE_PROVIDER_ENABLED =
  typeof __VEIL_ENABLE_YOUTUBE_PROVIDER__ !== 'undefined' &&
  __VEIL_ENABLE_YOUTUBE_PROVIDER__ === true
