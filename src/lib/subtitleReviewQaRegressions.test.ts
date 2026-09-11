import { readFileSync } from 'node:fs'
import { parse, type Declaration, type Rule } from 'postcss'
import { describe, expect, it } from 'vitest'
import { analyzeSubtitleCues } from './contentReview'
import { DEFAULT_SUBTITLE_COVER_MODE } from './subtitleCoverDefaults'
import { parseSrt } from './srtParser'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const stylesheet = parse(read('../styles.css'))

function declarations(selector: string): Record<string, string> {
  const match = stylesheet.nodes.find(
    (node): node is Rule => node.type === 'rule' && node.selector === selector
  )
  expect(match, `Missing CSS rule ${selector}`).toBeDefined()
  const result: Record<string, string> = {}
  match?.walkDecls((declaration: Declaration) => { result[declaration.prop] = declaration.value })
  return result
}

describe('subtitle review QA regressions', () => {
  it('defaults fresh subtitle sessions to normal subtitle display without import override', () => {
    expect(DEFAULT_SUBTITLE_COVER_MODE).toBe('show')

    const controls = read('../components/SrtImportControls.tsx')
    const importStart = controls.indexOf('const onFileChange = async')
    const importEnd = controls.indexOf('const onGeneratePerCueMasks', importStart)
    const importLifecycle = controls.slice(importStart, importEnd)

    expect(importLifecycle).not.toContain("setSubtitleCoverMode('smartCover')")
    expect(importLifecycle).toContain("if (mode === 'regionCover')")
    expect(importLifecycle).toContain('setShowSubtitleText(true)')
  })

  it('lets the loaded filename and quick actions wrap without collapsing the filename', () => {
    expect(declarations('.subtitle-sheet__file-copy')).toMatchObject({
      'min-width': '0'
    })
    expect(declarations('.subtitle-sheet__file-name')).toMatchObject({
      'min-width': '0',
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      'white-space': 'nowrap'
    })
    expect(declarations('.subtitle-sheet__loaded-state')).toMatchObject({
      display: 'grid',
      'min-width': '0'
    })
    expect(declarations('.subtitle-sheet__loaded-state .subtitle-sheet__quick-actions')).toMatchObject({
      display: 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(9.5rem, 1fr))',
      'min-width': '0'
    })
  })

  it('produces one finding in every existing category from the visual QA fixture', () => {
    const source = read('./__fixtures__/content-review-visual-qa.srt')
    const { cues, skippedCount } = parseSrt(source)
    const findings = analyzeSubtitleCues(cues)

    expect(skippedCount).toBe(0)
    expect(cues).toHaveLength(9)
    expect(findings.map((finding) => finding.category)).toEqual([
      'profanity',
      'sexualLanguage',
      'violenceRelatedLanguage',
      'drugsSubstances',
      'otherConfiguredTerms'
    ])
    expect(findings.map((finding) => [finding.start, finding.end])).toEqual([
      [7, 9],
      [17, 19],
      [22, 24],
      [27, 29],
      [37, 39]
    ])
    expect(findings[3].cueText).toBe('هذا تقرير محلي عن drugs.')
  })
})
