import { useLayoutEffect, useRef, useState } from 'react'
import { splitFilename, shouldRevealFilename } from '../lib/launcherRecentPresentation'

function hasRtlLeadingCharacter(value: string): boolean {
  return /^[\u0590-\u08ff]/.test(value.trim())
}

export default function RecentFilename({ filename }: { filename: string }) {
  const viewportRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(false)
  const [revealDistance, setRevealDistance] = useState(0)
  const { stem, extension } = splitFilename(filename)
  const rtl = hasRtlLeadingCharacter(stem)

  useLayoutEffect(() => {
    const measure = (): void => {
      const viewport = viewportRef.current
      const content = contentRef.current
      if (!viewport || !content) return
      const distance = Math.min(0, viewport.clientWidth - content.scrollWidth)
      setOverflow(distance < -1)
      setRevealDistance(rtl ? -distance : distance)
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (observer && viewportRef.current) observer.observe(viewportRef.current)
    return () => observer?.disconnect()
  }, [filename, rtl])

  const reveal = shouldRevealFilename(overflow, typeof document !== 'undefined' && document.documentElement.classList.contains('motion-reduced'))
  const className = `launcher-filename${overflow ? ' launcher-filename--overflow' : ''}${reveal ? ' launcher-filename--reveal' : ''}`

  return (
    <span ref={viewportRef} className={className} title={filename} dir="auto" style={{ '--reveal-distance': `${revealDistance}px` } as React.CSSProperties}>
      <span ref={contentRef} className="launcher-filename__content" dir={rtl ? 'rtl' : 'ltr'}>
        <span className="launcher-filename__stem" dir="auto">{stem}</span>
        {extension ? <span className="launcher-filename__extension" dir="ltr">{extension}</span> : null}
      </span>
    </span>
  )
}