import { readFileSync } from 'node:fs'
import { parse, type AtRule, type Container, type Declaration, type Rule } from 'postcss'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const stylesheet = parse(styles)

function declarations(rule: Rule): Record<string, string> {
  const result: Record<string, string> = {}
  rule.walkDecls((declaration: Declaration) => { result[declaration.prop] = declaration.value })
  return result
}

function rule(selector: string, parent: Container = stylesheet): Rule {
  const match = parent.nodes?.find(
    (node): node is Rule => node.type === 'rule' && node.selector === selector
  )
  expect(match, `Missing CSS rule: ${selector}`).toBeDefined()
  return match!
}

describe('Settings shell', () => {
  it('keeps the shell stable while only its content pane scrolls', () => {
    expect(declarations(rule('.modal__panel--settings'))).toMatchObject({
      display: 'grid',
      'grid-template-rows': 'auto minmax(0, 1fr) auto',
      width: 'min(46rem, calc(100vw - 2rem))',
      height: 'min(38rem, calc(100vh - 2rem))',
      overflow: 'hidden'
    })
    expect(declarations(rule('.modal__panel--settings .modal__body'))).toMatchObject({
      overflow: 'hidden',
      'min-height': '0',
      padding: '0'
    })
    expect(declarations(rule('.settings-dialog__content'))).toMatchObject({
      overflow: 'auto',
      'min-width': '0'
    })
    expect(declarations(rule('.modal__panel--settings .modal__footer'))['border-top']).toBe(
      '1px solid var(--border)'
    )
  })

  it('clamps the Settings panel to a small viewport', () => {
    const media = stylesheet.nodes.find(
      (node): node is AtRule => node.type === 'atrule' && node.name === 'media' && node.params === '(max-width: 620px)'
    )
    expect(media).toBeDefined()
    expect(declarations(rule('.modal__panel--settings', media!))).toMatchObject({
      width: 'calc(100vw - 1rem)',
      height: 'calc(100vh - 1rem)',
      'max-height': 'calc(100vh - 1rem)'
    })
  })

  it('scopes readable and disabled colors to Settings', () => {
    expect(declarations(rule('.settings-dialog__content')).color).toBe('var(--text)')
    expect(declarations(rule('.settings-dialog__row')).color).toBe('var(--text)')
    expect(declarations(rule('.settings-dialog__subsection h4,\n.settings-dialog__subheading')).color).toBe('var(--text)')
    expect(declarations(rule(
      ".modal__panel--settings :is(button, input, select, textarea):disabled,\n.modal__panel--settings [aria-disabled='true']"
    ))).toMatchObject({ color: 'var(--muted)', opacity: '0.48' })
    expect(styles).not.toContain('\nbutton:disabled,\n')
  })
})
