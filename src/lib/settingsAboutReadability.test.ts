import { readFileSync } from 'node:fs'
import { parse, type Declaration, type Rule } from 'postcss'
import { describe, expect, it } from 'vitest'

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

describe('Settings About readability', () => {
  it('keeps the logo anchor and applies scoped readable text roles', () => {
    const settings = read('../components/SettingsDialog.tsx')
    expect(settings).toContain('<img src={veilLogo} alt="" className="about-dialog__logo" />')
    for (const className of [
      'settings-dialog__about-title', 'settings-dialog__about-description',
      'settings-dialog__about-meta', 'settings-dialog__about-developer'
    ]) {
      expect(settings).toContain(className)
    }
    expect(declarations('.settings-dialog__about-title').color).toBe('var(--text)')
    expect(declarations('.settings-dialog__about .settings-dialog__about-description').color)
      .toBe('color-mix(in srgb, var(--text) 88%, var(--surface))')
    expect(declarations('.settings-dialog__about .settings-dialog__about-meta,\n.settings-dialog__about .settings-dialog__about-developer').color)
      .toBe('var(--label)')
  })

  it('preserves authoritative version sources and avoids stale schema text', () => {
    const settings = read('../components/SettingsDialog.tsx')
    expect(settings).toContain('version: APP_VERSION')
    expect(settings).toContain('schema: SUPPORTED_TRACK_VERSION')
    expect(settings).not.toContain('schema 1.5.0')
  })
})
