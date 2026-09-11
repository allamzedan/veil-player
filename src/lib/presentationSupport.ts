let backdropFilterSupported: boolean | null = null

export function supportsBackdropFilter(): boolean {
  if (backdropFilterSupported !== null) {
    return backdropFilterSupported
  }
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    backdropFilterSupported = false
    return false
  }
  backdropFilterSupported = CSS.supports('backdrop-filter', 'blur(1px)')
  return backdropFilterSupported
}

let blurWarningShown = false

export function shouldShowBlurFallbackWarning(): boolean {
  if (blurWarningShown) {
    return false
  }
  blurWarningShown = true
  return true
}
