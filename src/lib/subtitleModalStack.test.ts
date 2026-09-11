import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('subtitle modal ownership and fullscreen parity', () => {
  it('uses the shared modal portal and one authoritative sheet state', () => {
    const player = readFileSync(new URL('../components/VideoPlayer.tsx', import.meta.url), 'utf8')
    const sheet = readFileSync(new URL('../components/SubtitleSheet.tsx', import.meta.url), 'utf8')
    const modal = readFileSync(new URL('../components/Modal.tsx', import.meta.url), 'utf8')
    expect(player.match(/const \[subtitleSheetOpen, setSubtitleSheetOpen\]/g)).toHaveLength(1)
    expect(sheet).toContain('mountToDocument')
    expect(modal).toContain('document.fullscreenElement ?? document.body')
    expect(modal).toContain("document.addEventListener('fullscreenchange', syncPortalTarget)")
    expect(modal).toContain('registerInteractiveOverlay()')
  })

  it('closes the sheet before opening subtitle settings and restores invoking focus', () => {
    const player = readFileSync(new URL('../components/VideoPlayer.tsx', import.meta.url), 'utf8')
    const modal = readFileSync(new URL('../components/Modal.tsx', import.meta.url), 'utf8')
    const transition = player.slice(player.indexOf('onOpenSettings={() => {'), player.indexOf('videoRef={videoRef}', player.indexOf('onOpenSettings={() => {')))
    expect(transition.indexOf('setSubtitleSheetOpen(false)')).toBeLessThan(transition.indexOf("requestSettingsSection('subtitles')"))
    expect(modal).toContain('previousFocusRef.current?.isConnected')
    expect(modal).toContain('previousFocusRef.current.focus({ preventScroll: true })')
    expect(modal).toContain('input:not([disabled]):not([hidden])')
    expect(modal).toContain('if (panel && !panel.contains(document.activeElement)) panel.focus()')
  })

  it('keeps fullscreen CC, load, and settings on the existing subtitle actions', () => {
    const overlay = readFileSync(new URL('../components/FullscreenEditOverlay.tsx', import.meta.url), 'utf8')
    const sheet = readFileSync(new URL('../components/SubtitleSheet.tsx', import.meta.url), 'utf8')
    expect(overlay).toContain('<PlayerUtilityControls')
    expect(sheet).toContain('<SrtImportControls')
    expect(sheet).toContain('onOpenSubtitleSettings={onOpenSettings}')
  })
})
