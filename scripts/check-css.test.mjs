import assert from 'node:assert/strict'
import test from 'node:test'
import { validateCssText } from './check-css.mjs'

test('accepts representative application CSS', () => {
  const css = '@media (width >= 40rem) { .panel:is(.open, [data-x]) { color: red; } }'
  assert.deepEqual(validateCssText(css), [])
})

test('rejects an unclosed declaration block', () => {
  assert.notEqual(validateCssText('.panel { color: red;').length, 0)
})

test('rejects an empty selector-list entry', () => {
  assert.notEqual(validateCssText('.panel, , .dialog { color: red; }').length, 0)
})

test('rejects an empty media query', () => {
  assert.notEqual(validateCssText('@media { .panel { color: red; } }').length, 0)
})
