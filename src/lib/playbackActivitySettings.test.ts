import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('playback activity settings integration', () => {
  it('wires independent defaults into every range creation surface', () => {
    const video = read('../components/VideoPlayer.tsx')
    const timeline = read('../components/TimelineControls.tsx')
    const trackActions = read('../components/TrackActionControls.tsx')
    for (const [type, property] of [['Mask', 'defaultMaskDurationSeconds'], ['Mute', 'defaultMuteDurationSeconds'], ['Skip', 'defaultSkipDurationSeconds']] as const) {
      expect(video).toContain(`add${type}(start, start + playbackActivityPreferences.${property})`)
      expect(timeline).toContain(`playbackActivityPreferences.${property}`)
      expect(trackActions).toContain(`playbackActivityPreferences.${property}`)
    }
    expect(video).toContain('addBookmark({ start: timestamp })')
  })

  it('passes rail visibility and bookmark activity lifetime through shared fullscreen UI', () => {
    const video = read('../components/VideoPlayer.tsx')
    const overlay = read('../components/FullscreenEditOverlay.tsx')
    expect(video).toContain('showActivityRail={playbackActivityPreferences.showFullscreenVeilRail}')
    expect(video).toContain('bookmarkActivityDisplayDurationMs={playbackActivityPreferences.bookmarkActivityDurationMs}')
    expect(video).toContain('displayDurationMs={playbackActivityPreferences.bookmarkActivityDurationMs}')
    expect(overlay).toContain('showActivityRail ? (')
    expect(overlay.match(/displayDurationMs=\{bookmarkActivityDisplayDurationMs\}/g)).toHaveLength(2)
  })

  it('exposes bounded accessible controls in the Playback section', () => {
    const settings = read('../components/SettingsDialog.tsx')
    expect(settings).toContain("'playback'")
    expect(settings).toContain('checked={playbackActivity.showFullscreenVeilRail}')
    for (const key of ['defaultMaskDurationSeconds', 'defaultMuteDurationSeconds', 'defaultSkipDurationSeconds']) {
      expect(settings).toContain(`'${key}'`)
    }
    expect(settings).toContain('min="0.1" max="3600" step="0.1"')
    expect(settings).toContain('bookmarkActivityDurationMs: Number(event.target.value) * 1000')
    expect(settings).toContain("t('settings.durationSecondsHint')")
  })
})
