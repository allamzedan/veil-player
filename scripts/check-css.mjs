import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import postcss from 'postcss'

export const TRACKED_APPLICATION_STYLES = [
  'src/styles.css',
  'src/launcher/launcher.css'
]

function hasBalancedPairs(value, pairs) {
  const stack = []
  let quote = null
  let escaped = false
  const closers = Object.values(pairs)

  for (const character of value) {
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\') {
      escaped = true
      continue
    }
    if (quote) {
      if (character === quote) quote = null
      continue
    }
    if ([34, 39].includes(character.charCodeAt(0))) {
      quote = character
      continue
    }
    if (pairs[character]) {
      stack.push(pairs[character])
      continue
    }
    if (closers.includes(character) && stack.pop() !== character) return false
  }

  return quote === null && stack.length === 0
}

function validateSelector(selector) {
  const value = selector.trim()
  if (!value) return 'empty selector'
  if (!hasBalancedPairs(value, { '(': ')', '[': ']' })) {
    return 'unbalanced selector brackets or parentheses'
  }
  if (/(^|,)\s*(,|$)/.test(value)) return 'empty selector-list entry'
  if (value.split(',').some((part) => /^[>+~]|[>+~]$/.test(part.trim()))) {
    return 'selector starts or ends with a combinator'
  }
  return null
}

function validateMediaQuery(params) {
  const value = params.trim()
  if (!value) return 'empty @media query'
  if (!hasBalancedPairs(value, { '(': ')' })) return 'unbalanced @media parentheses'
  if (/(^|,)\s*(,|$)/.test(value)) return 'empty @media query-list entry'
  if (/(?:^|\s)(?:and|or)\s*(?:,|$)/i.test(value)) {
    return '@media query ends with a logical operator'
  }
  return null
}

export function validateCssText(css, from = '<css>') {
  let root
  try {
    root = postcss.parse(css, { from })
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)]
  }

  const errors = []
  root.walkRules((rule) => {
    const error = validateSelector(rule.selector)
    if (error) errors.push(from + ':' + (rule.source?.start?.line ?? '?') + ': ' + error)
  })
  root.walkAtRules('media', (rule) => {
    const error = validateMediaQuery(rule.params)
    if (error) errors.push(from + ':' + (rule.source?.start?.line ?? '?') + ': ' + error)
  })
  return errors
}

export function checkTrackedStyles(root = process.cwd()) {
  const failures = []
  for (const relativePath of TRACKED_APPLICATION_STYLES) {
    const css = readFileSync(resolve(root, relativePath), 'utf8')
    const errors = validateCssText(css, relativePath)
    if (errors.length === 0) console.log('CSS OK: ' + relativePath)
    else failures.push(...errors)
  }
  return failures
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const failures = checkTrackedStyles()
  for (const failure of failures) console.error('CSS ERROR: ' + failure)
  if (failures.length > 0) process.exitCode = 1
}
