import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('timeline visibility state preservation', () => {
  const editor = read('../components/TimelineEditor.tsx')
  const player = read('../components/VideoPlayer.tsx')
  const styles = read('../styles.css')

  it('keeps the eligible timeline mounted while its chrome is hidden', () => {
    expect(player).toContain('const timelineChromeEligible = (')
    expect(player).toContain('{timelineChromeEligible ? (')
    expect(player).toContain('visible={timelineVisible}')
    expect(player).not.toContain('const showTimelineChrome = timelineVisible &&')
    expect(player).toContain('aria-expanded={timelineVisible}')
    expect(player).toContain('inert={timelineHidden}')
    expect(styles).toContain('.player-chrome-timeline.player-chrome-timeline--mode-hidden')
    expect(styles).toContain('pointer-events: none;')
  })

  it('initializes the virtual viewport from duration instead of a one-second canvas', () => {
    expect(editor).toContain('const [viewEnd, setViewEnd] = useState(safeDuration)')
    expect(editor).toContain('const viewEndRef = useRef(safeDuration)')
    expect(editor).toContain('viewEndRef.current = safeDuration')
  })

  it('ignores zero-width hidden measurements and waits to fit', () => {
    expect(editor).toContain('viewport.clientWidth <= 0 || viewport.scrollWidth <= 0')
    expect(editor).toContain('pendingFitRef.current = true')
    expect(editor).toContain('if (entries.every((entry) => entry.contentRect.width <= 0)) return')
    expect(editor).toContain('requestAnimationFrame(restoreWhenMeasurable)')
  })

  it('restores zoom-derived scroll state after repeated visible layouts', () => {
    expect(editor).toContain('restoreViewportScroll({')
    expect(editor).toContain('viewStart: viewStartRef.current')
    expect(editor).toContain('viewEnd: viewEndRef.current')
    expect(editor).toContain('observer.observe(viewport)')
    expect(editor).toContain('observer.disconnect()')
  })
})
