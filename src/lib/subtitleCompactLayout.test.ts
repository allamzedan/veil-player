import { readFileSync } from 'node:fs'
import { parse, type Declaration, type Rule } from 'postcss'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SUBTITLE_PRESENTATION } from './subtitlePresentationPreferences'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const styles = read('../styles.css')
const stylesheet = parse(styles)

function declarations(selector: string): Record<string, string> {
  const match = stylesheet.nodes.find(
    (node): node is Rule => node.type === 'rule' && node.selector === selector
  )
  expect(match, `Missing CSS rule ${selector}`).toBeDefined()
  const result: Record<string, string> = {}
  match?.walkDecls((declaration: Declaration) => { result[declaration.prop] = declaration.value })
  return result
}

describe('compact subtitle appearance layout', () => {
  it('uses an aligned, tightly spaced Settings-only grid', () => {
    expect(declarations('.subtitle-appearance-controls')).toMatchObject({
      display: 'grid',
      gap: '0.35rem',
      width: 'min(100%, 32rem)'
    })
    expect(declarations('.subtitle-appearance-controls__row')).toMatchObject({
      display: 'grid',
      'grid-template-columns': '9rem minmax(10rem, 1fr) 3rem',
      gap: '0.6rem',
      'min-height': '1.8rem'
    })
    expect(declarations('.subtitle-appearance-controls__value')['text-align']).toBe('end')
  })

  it('keeps every appearance control and disables box controls when background is off', () => {
    const controls = read('../components/SubtitleAppearanceControls.tsx')
    for (const preference of [
      'fontScale', 'textColor', 'fontFamily', 'backgroundMode', 'backgroundColor',
      'backgroundOpacity', 'textOpacity', 'shadowStrength', 'bottomOffsetPercent'
    ]) {
      expect(controls).toContain(`prefs.${preference}`)
    }
    expect(controls.match(/disabled=\{prefs\.backgroundMode === 'off'\}/g)).toHaveLength(2)
    expect(styles).toContain('.subtitle-appearance-controls__row:has(:disabled) > span:first-child')
  })

  it('preserves persisted preference keys and defaults', () => {
    expect(DEFAULT_SUBTITLE_PRESENTATION).toEqual({
      fontScale: 1,
      textOpacity: 1,
      shadowStrength: 0.65,
      bottomOffsetPercent: 12,
      textColor: '#ffffff',
      backgroundMode: 'off',
      backgroundColor: '#000000',
      backgroundOpacity: 0.65,
      fontFamily: 'default'
    })
  })
})
