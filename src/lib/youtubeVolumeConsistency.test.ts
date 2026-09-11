import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolvePlaybackCapabilities } from './playbackCapabilities'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('YouTube playback volume consistency', () => {
  it('uses the existing controlled transport volume for local and YouTube playback', () => {
    const video = read('../components/VideoPlayer.tsx')
    const volume = read('../components/VolumeControl.tsx')

    expect(video).toContain('const [playerVolume, setPlayerVolume] = useState(1)')
    expect(video).toContain('const [playerMuted, setPlayerMuted] = useState(false)')
    expect(video).toContain('volume={playerVolume}')
    expect(video).toContain('muted={effectivePlayerMuted}')
    expect(video).toContain('isYouTube ? youtubeRangePlayback.effectiveMuted : playerMuted')
    expect(video).toContain('onVolumeChange={applyPlayerVolume}')
    expect(video).toContain('onMutedChange={applyPlayerMuted}')
    expect(volume).toContain('volume: controlledVolume')
    expect(volume).toContain('muted: controlledMuted')
    expect(video).not.toContain('const playerVolume = 1')
    expect(video).not.toContain('const playerMuted = false')
  })

  it('preserves volume across rerenders and adapter generations without adding a poller', () => {
    const stage = read('../components/YouTubePlayerStage.tsx')
    const video = read('../components/VideoPlayer.tsx')

    expect(stage).toContain('volumeRef.current = volume')
    expect(stage).toContain('mutedRef.current = muted')
    expect(stage).toContain('volumeRef.current,\n        mutedRef.current,\n        undefined')
    expect(stage).toContain('[source.videoId, source.canonicalUrl, loadGeneration]')
    expect(stage).not.toContain('setInterval')
    expect(video).toContain('playerVolumeRef.current = video.volume')
    expect(video).toContain('playerMutedRef.current = video.muted')
  })

  it('maps the slider endpoint to exact zero and applies zero as a muted iframe state', () => {
    const volume = read('../components/VolumeControl.tsx')
    const adapter = read('../playback/YouTubeAdapter.ts')

    expect(volume).toContain('min={0}')
    expect(volume).toContain('onVolumeChange(Number(event.target.value))')
    expect(adapter).toContain('if (this.muted || this.volume === 0)')
    expect(adapter).toContain('this.player.setVolume(0)\n        this.player.mute()')
    expect(adapter).toContain('this.player.unMute()\n        this.player.setVolume(this.volume)')
  })

  it('enables YouTube Mute and Skip while keeping visual masks unavailable', () => {
    const capabilities = resolvePlaybackCapabilities({
      kind: 'youtube',
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    })

    expect(capabilities.canCreateMuteRange).toBe(true)
    expect(capabilities.canCreateMask).toBe(false)
    expect(capabilities.canCreateSkipRange).toBe(true)
  })
})
