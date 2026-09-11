import type { YouTubeAdapter } from './YouTubeAdapter'
import { normalizePlaybackDuration, normalizePlaybackTime } from './authoritativeTime'

export const YOUTUBE_TIME_POLL_MS = 250

export interface YouTubeTimingSample {
  currentTime: number
  duration: number | null
  playing: boolean | null
}

type YouTubeClockReader = Pick<
  YouTubeAdapter,
  'getCurrentTime' | 'getDuration' | 'getPlaying'
>

export class YouTubeTimePoller {
  private intervalId: number | null = null
  private reader: YouTubeClockReader | null = null
  private generation = 0

  constructor(private readonly onSample: (sample: YouTubeTimingSample) => void) {}

  start(reader: YouTubeClockReader): void {
    this.stop()
    this.reader = reader
    const generation = this.generation
    this.publish(generation)
    this.intervalId = window.setInterval(() => this.publish(generation), YOUTUBE_TIME_POLL_MS)
  }

  publishNow(includePlaying = true): void {
    this.publish(this.generation, includePlaying)
  }

  stop(): void {
    this.generation += 1
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.reader = null
  }

  private publish(generation: number, includePlaying = true): void {
    const reader = this.reader
    if (!reader || generation !== this.generation) {
      return
    }
    const duration = normalizePlaybackDuration(reader.getDuration())
    const currentTime = normalizePlaybackTime(reader.getCurrentTime(), duration)
    if (currentTime === null) {
      return
    }
    this.onSample({
      currentTime,
      duration,
      playing: includePlaying ? reader.getPlaying() : null
    })
  }
}
