import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { registerSubtitleSheetBridge, requestCloseSubtitleSheet, requestOpenSubtitleSheet } from './subtitleSheetBridge'

describe('fullscreen subtitle control parity', () => {
  it('keeps fullscreen CC on the shared subtitle action and renders its sheet inside the stage', () => {
    const player = readFileSync(new URL('../components/VideoPlayer.tsx', import.meta.url), 'utf8')
    const overlay = readFileSync(new URL('../components/FullscreenEditOverlay.tsx', import.meta.url), 'utf8')
    expect(overlay).toContain('<PlayerUtilityControls')
    expect(overlay).toContain('showCc={capabilities.canImportCustomSubtitles}')
    const fullscreenIndex = player.indexOf('<FullscreenEditOverlay')
    const sheetIndex = player.indexOf('<SubtitleSheet', fullscreenIndex)
    const stageCloseIndex = player.indexOf('<YouTubePlaybackFailurePanel', fullscreenIndex)
    expect(fullscreenIndex).toBeGreaterThanOrEqual(0)
    expect(sheetIndex).toBeGreaterThan(fullscreenIndex)
    expect(sheetIndex).toBeLessThan(stageCloseIndex)
    const modal = readFileSync(new URL('../components/Modal.tsx', import.meta.url), 'utf8')
    expect(modal).toContain('document.fullscreenElement ?? document.body')
  })

  it('routes the shared CC action through the existing subtitle sheet bridge', () => {
    let opened = false
    const unregister = registerSubtitleSheetBridge({ open: () => { opened = true }, close: () => { opened = false }, isOpen: () => opened, triggerImport: () => {} })
    requestOpenSubtitleSheet()
    expect(opened).toBe(true)
    requestCloseSubtitleSheet()
    expect(opened).toBe(false)
    unregister()
  })
})
