export interface LocalMediaClockCallbacks {
  onPlay: () => void
  onPause: () => void
  onSeeked: () => void
  onTimeUpdate: () => void
  onDurationChange: () => void
  onEnded: () => void
}

export function bindLocalMediaClock(
  media: HTMLMediaElement,
  callbacks: LocalMediaClockCallbacks
): () => void {
  const bindings: Array<[keyof HTMLElementEventMap, EventListener]> = [
    ['play', callbacks.onPlay],
    ['pause', callbacks.onPause],
    ['seeked', callbacks.onSeeked],
    ['timeupdate', callbacks.onTimeUpdate],
    ['durationchange', callbacks.onDurationChange],
    ['ended', callbacks.onEnded]
  ]
  for (const [eventName, listener] of bindings) media.addEventListener(eventName, listener)
  return () => {
    for (const [eventName, listener] of bindings) media.removeEventListener(eventName, listener)
  }
}
