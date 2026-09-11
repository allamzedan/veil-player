interface AuthoritativeMediaAutoplayOptions<T extends HTMLMediaElement> {
  element: T
  isAuthoritative: () => boolean
  hasAttempted: () => boolean
  markAttempted: () => void
  requestPlay: () => Promise<void>
  onResolved?: () => void
  onRejected?: () => void
}

const HAVE_FUTURE_DATA = 3

/** Arms autoplay for one physical media element while it remains authoritative. */
export function armAuthoritativeMediaAutoplay<T extends HTMLMediaElement>({
  element,
  isAuthoritative,
  hasAttempted,
  markAttempted,
  requestPlay,
  onResolved,
  onRejected
}: AuthoritativeMediaAutoplayOptions<T>): () => void {
  let disposed = false

  const isCurrent = (): boolean => !disposed && isAuthoritative()
  const removeCanPlayListener = (): void => {
    element.removeEventListener('canplay', attemptAutoplay)
  }
  const attemptAutoplay = (): void => {
    if (!isCurrent()) {
      removeCanPlayListener()
      return
    }
    if (hasAttempted()) {
      return
    }

    // Requalify immediately before play() so a captured, replaced element cannot start.
    if (!isCurrent()) {
      removeCanPlayListener()
      return
    }
    markAttempted()

    let playPromise: Promise<void>
    try {
      playPromise = requestPlay()
    } catch {
      if (isCurrent()) onRejected?.()
      return
    }
    void playPromise.then(
      () => {
        if (isCurrent()) onResolved?.()
      },
      () => {
        if (isCurrent()) onRejected?.()
      }
    )
  }

  if (element.readyState >= HAVE_FUTURE_DATA) {
    attemptAutoplay()
  } else {
    element.addEventListener('canplay', attemptAutoplay, { once: true })
  }

  return () => {
    disposed = true
    removeCanPlayListener()
  }
}
