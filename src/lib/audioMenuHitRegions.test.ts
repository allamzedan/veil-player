import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('audio watch menu hit regions', () => {
  it('marks menu triggers and items as non-draggable inside the frameless title bar', () => {
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
    expect(css).toContain('.desktop-title-bar--frameless .app-menu__trigger,')
    expect(css).toContain('.desktop-title-bar--frameless .app-menu__item,')
    expect(css).toMatch(
      /\.desktop-title-bar--frameless \.app-menu__item,[\s\S]*?-webkit-app-region:\s*no-drag;/
    )
  })

  it('keeps the audio hero and waveform from intercepting menu or dock input', () => {
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.audio-hero__[\s\S]*?pointer-events:\s*none;/)
  })

  it('draws exactly one title-bar separator on the full-width wrapper via ::after', () => {
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
    expect(css).toMatch(
      /\.desktop-title-bar\s*\{[^}]*border-bottom:\s*none;[^}]*box-shadow:\s*none;/s
    )
    expect(css).toMatch(
      /\.desktop-title-bar::after\s*\{[^}]*height:\s*1px;[^}]*pointer-events:\s*none;/s
    )
    expect(css).toMatch(/\.app-menu\s*\{[^}]*border-bottom:\s*none;/s)
    expect(css).toMatch(
      /\.desktop-title-bar \.app-menu[^\{]*\{[^}]*border-bottom:\s*none;[^}]*background:\s*transparent;[^}]*padding:\s*0;/s
    )
    expect(css).not.toMatch(/\.app-menu\s*\{[^}]*border-bottom:\s*1px/s)
    expect(css).not.toMatch(
      /\.desktop-title-bar\s*\{[^}]*box-shadow:\s*0 1px 0 0/s
    )
  })

  it('keeps embedded title-bar menus transparent under UI-refresh panel overrides', () => {
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')
    expect(css).toMatch(
      /\.app--ui-refresh-v1 \.desktop-title-bar \.app-menu[^\{]*\{[^}]*background:\s*transparent;/s
    )
  })
})
