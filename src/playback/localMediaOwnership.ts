import { bindLocalMediaClock, type LocalMediaClockCallbacks } from './localMediaClock'

export interface LocalMediaOwnershipCallbacks extends LocalMediaClockCallbacks {
  onActivate: (media: HTMLMediaElement) => void
}

type MediaRef<T extends HTMLMediaElement> = { current: T | null }

/** Owns the one local media element used by both transport and playhead time. */
export class LocalMediaOwnership<T extends HTMLMediaElement = HTMLMediaElement> {
  private detachClock: (() => void) | null = null

  constructor(private readonly authoritativeRef: MediaRef<T>) {}

  get activeElement(): T | null {
    return this.authoritativeRef.current
  }

  setActiveLocalMediaElement(
    next: T | null,
    callbacks: LocalMediaOwnershipCallbacks
  ): void {
    const previous = this.authoritativeRef.current
    if (previous === next) return

    if (previous) previous.pause()
    this.detachClock?.()
    this.detachClock = null
    this.authoritativeRef.current = null

    if (!next) return

    this.authoritativeRef.current = next
    this.detachClock = bindLocalMediaClock(next, callbacks)
    callbacks.onActivate(next)
  }
}
