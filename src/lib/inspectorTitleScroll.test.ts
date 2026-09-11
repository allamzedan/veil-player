import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

const inspector = read('../components/InspectorPanel.tsx')
const styles = read('../styles.css')
const titleMarkup = inspector.slice(
  inspector.indexOf('ref={titleRef}'),
  inspector.indexOf('<p>{sourceLabel}')
)
const fullTitle = 'The_Anatomy_of_a_Domestic_Cold_War'

describe('Inspector title overflow reveal', () => {
  it('supplies and renders the complete media title', () => {
    const fileName = `${fullTitle}.mp4`
    const renderedTextContent = fileName.replace(/\.[^.\\/]+$/, '')

    expect(renderedTextContent).toBe(fullTitle)
    expect(inspector).toContain("return mediaTitle.replace(/\\.[^.\\\\/]+$/, '') || mediaTitle")
    expect(inspector).not.toContain("resolveTrackDisplayName({")
    expect(titleMarkup).toContain('title={trackName}')
    expect(titleMarkup).toContain('{trackName}</span>')
  })

  it('keeps short titles static and out of the keyboard tab order', () => {
    expect(inspector).toContain('Math.max(0, text.scrollWidth - title.clientWidth)')
    expect(inspector).toContain('observer.observe(text)')
    expect(titleMarkup).toContain("titleOverflow > 0 ? ' inspector-panel__title--overflow' : ''")
    expect(titleMarkup).toContain('tabIndex={titleOverflow > 0 ? 0 : undefined}')
    expect(inspector).toContain("const titleScrollStyle = titleOverflow > 0")
  })

  it('keeps overflowing titles ellipsized and motionless by default', () => {
    const titleTextRule = styles.slice(
      styles.indexOf('.inspector-panel__title-text {'),
      styles.indexOf('}', styles.indexOf('.inspector-panel__title-text {')) + 1
    )

    expect(styles).toMatch(/\.inspector-panel__identity \.inspector-panel__title\s*\{[^}]*position: relative;[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*white-space: nowrap;/s)
    expect(styles).toMatch(/\.inspector-panel__title--overflow::after\s*\{[^}]*content: '…';/s)
    expect(titleTextRule).toContain('transform: translateX(0)')
    expect(titleTextRule).not.toContain('animation:')
  })

  it('runs one delayed reveal on hover or focus and pauses at the end', () => {
    const viewportWidth = 180
    const trackWidth = 320
    const overflowDistance = Math.max(0, trackWidth - viewportWidth)
    const translationDistance = overflowDistance + 4
    const finalTrackRight = trackWidth - translationDistance

    expect(overflowDistance).toBe(140)
    expect(translationDistance).toBe(144)
    expect(finalTrackRight).toBeLessThanOrEqual(viewportWidth - 2)
    expect(inspector).toContain("'--inspector-title-scroll-distance': `${titleOverflow + 4}px`")
    expect(styles).toMatch(/\.inspector-panel__title--overflow:hover \.inspector-panel__title-text,[\s\S]*\.inspector-panel__title--overflow:focus \.inspector-panel__title-text\s*\{[^}]*animation: inspector-title-reveal var\(--inspector-title-scroll-duration\) linear 500ms 1 forwards;/)
    expect(styles).toMatch(/@keyframes inspector-title-reveal\s*\{[\s\S]*0%\s*\{[^}]*translateX\(0\);[^}]*\}[\s\S]*80%,\s*100%\s*\{[^}]*--inspector-title-scroll-distance/s)
    expect(inspector).toContain("Math.max(3000, titleOverflow * 30 + 1000)")
  })

  it('removes the ellipsis while revealing the complete moving title', () => {
    expect(styles).toMatch(/@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*html:not\(\.motion-reduced\) \.inspector-panel__title--overflow:hover::after,[\s\S]*opacity: 0;/)
    expect(styles).toMatch(/\.inspector-panel__title-text\s*\{[^}]*display: inline-block;[^}]*width: max-content;[^}]*max-width: none;[^}]*overflow: visible;[^}]*text-overflow: clip;[^}]*white-space: nowrap;/s)
    expect(styles).not.toMatch(/\.inspector-panel__title-text\s*\{[^}]*text-overflow: ellipsis;/s)
    expect(titleMarkup).toContain('<span ref={titleTextRef} className="inspector-panel__title-text">{trackName}</span>')
  })

  it('resets the track and idle ellipsis when pointer or focus interaction ends', () => {
    expect(styles).toMatch(/\.inspector-panel__title-text\s*\{[^}]*transform: translateX\(0\);/s)
    expect(styles).not.toMatch(/\.inspector-panel__title--overflow::after\s*\{[^}]*opacity: 0;/s)
    expect(styles).toMatch(/\.inspector-panel__title--overflow:hover \.inspector-panel__title-text,[\s\S]*\.inspector-panel__title--overflow:focus \.inspector-panel__title-text/)
  })

  it('disables title movement for reduced-motion users', () => {
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*\.inspector-panel__title--overflow:hover[\s\S]*animation: none;[\s\S]*transform: translateX\(0\);/)
    expect(styles).toMatch(/html\.motion-reduced \.inspector-panel__title--overflow:hover[\s\S]*animation: none;/)
  })

  it('preserves the native tooltip and one accessible copy of the full title', () => {
    expect(titleMarkup).toContain('title={trackName}')
    expect(titleMarkup).toContain('<span ref={titleTextRef} className="inspector-panel__title-text">{trackName}</span>')
    expect(titleMarkup).not.toContain('aria-hidden')
    expect(titleMarkup.match(/\{trackName\}/g)).toHaveLength(2)
  })

  it('leaves sidebar sections and schema 1.6.0 contracts intact', () => {
    for (const section of [
      'inspector.sectionCreate',
      'inspector.sectionSummary',
      'inspector.sectionManage',
      'inspector.mediaNotes'
    ]) {
      expect(inspector).toContain(section)
    }
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
})
