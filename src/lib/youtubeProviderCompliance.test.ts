import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('YouTube provider compliance invariants', () => {
  it('uses enhanced privacy embeds and documented controls', () => {
    const stage = readFileSync('src/components/YouTubePlayerStage.tsx', 'utf8')
    const adapter = readFileSync('src/playback/YouTubeAdapter.ts', 'utf8')
    const capabilities = readFileSync('src/lib/playbackCapabilities.ts', 'utf8')
    expect(stage).toContain('youtube-nocookie.com')
    expect(adapter).toContain('seekTo(safe, true)')
    expect(adapter).toContain('this.player.mute()')
    expect(adapter).toContain('this.player.unMute()')
    expect(capabilities).toContain('canCreateMask: false')
    expect(capabilities).toContain('canUseVisualOverlays: false')
  })

  it('enforces the minimum on the actual iframe host', () => {
    const css = readFileSync('src/styles.css', 'utf8')
    const block = css.slice(css.indexOf('.youtube-player-stage {'), css.indexOf('.youtube-player-stage iframe'))
    expect(block).toContain('min-width: 200px;')
    expect(block).toContain('min-height: 200px;')
  })
})
