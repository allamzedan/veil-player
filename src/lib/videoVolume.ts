export function clampVolume(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function stepVideoVolume(video: HTMLVideoElement, delta: number): void {
  const next = clampVolume(video.volume + delta)
  video.volume = next
  if (next > 0) {
    video.muted = false
  }
}

export function toggleVideoMute(video: HTMLVideoElement): void {
  video.muted = !video.muted
}

export function setVideoVolume(video: HTMLVideoElement, value: number): void {
  const next = clampVolume(value)
  video.volume = next
  if (next > 0) {
    video.muted = false
  }
}
