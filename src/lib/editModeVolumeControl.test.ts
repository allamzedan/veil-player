import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

const videoPlayer = read('../components/VideoPlayer.tsx')
const volumeControl = read('../components/VolumeControl.tsx')
const audioTransport = read('../components/player/AudioTransportDock.tsx')
const timelineControls = read('../components/TimelineControls.tsx')
const transportUtilities = videoPlayer.slice(
  videoPlayer.indexOf('<div className="player-controls__utilities">'),
  videoPlayer.indexOf('{(!uiRefreshV1 && !hideEditorChrome)')
)

describe('Edit VEIL transport volume control', () => {
  it('renders the existing control in the refreshed Watch and Edit transport', () => {
    expect(transportUtilities).toMatch(/\{uiRefreshV1\s*\?\s*\(\s*<VolumeControl/)
    expect(transportUtilities).toContain('videoRef={videoRef}')
    expect(transportUtilities).not.toContain('hideEditorChrome ? <VolumeControl')
  })

  it('renders only one volume control in the video transport', () => {
    expect(transportUtilities.match(/<VolumeControl\s+videoRef=\{videoRef\}/g)).toHaveLength(1)
  })

  it('preserves volume and muted state on the shared media element across modes', () => {
    expect(transportUtilities).toContain('volume={playerVolume}')
    expect(transportUtilities).toContain('muted={effectivePlayerMuted}')
    expect(transportUtilities).toContain('onVolumeChange={applyPlayerVolume}')
    expect(transportUtilities).toContain('onMutedChange={applyPlayerMuted}')
    expect(transportUtilities).not.toContain('key={playerMode}')
    expect(volumeControl).toContain('setLocalVolume(video.volume)')
    expect(volumeControl).toContain('setLocalMuted(video.muted)')
    expect(volumeControl).toContain("video.addEventListener('volumechange', sync)")
  })

  it('keeps the same popup, keyboard, and accessible control implementation', () => {
    expect(volumeControl).toContain('aria-expanded={popupOpen}')
    expect(volumeControl).toContain('aria-haspopup="true"')
    expect(volumeControl).toContain("event.key === 'ArrowUp'")
    expect(volumeControl).toContain("event.key === 'ArrowDown'")
  })

  it('keeps YouTube on the same refreshed transport without changing playback mute wiring', () => {
    expect(videoPlayer).toContain('const isYouTube = Boolean(mediaSource && isYouTubeMediaSource(mediaSource))')
    expect(transportUtilities).not.toContain('!isYouTube')
    expect(videoPlayer).toContain('volume={playerVolume}')
    expect(videoPlayer).toContain('muted={effectivePlayerMuted}')
  })

  it('keeps playback volume separate from VEIL Mute Range capability', () => {
    expect(transportUtilities).not.toContain('canCreateMuteRange')
    expect(timelineControls).toContain('capabilities.canCreateMuteRange ? <ToolbarButton')
  })

  it('leaves compact-audio volume placement unchanged', () => {
    expect(audioTransport).toContain('<VolumeControl videoRef={videoRef} orientation="vertical" />')
    expect(audioTransport.match(/<VolumeControl\s+videoRef=\{videoRef\}/g)).toHaveLength(1)
  })

  it('leaves schema 1.6.0 unchanged', () => {
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
})
