import {
  buildFullscreenVeilRailMarks,
  type FullscreenVeilRailSourceItem
} from '../lib/fullscreenVeilRail'

interface FullscreenVeilActivityRailProps {
  duration: number
  items: readonly FullscreenVeilRailSourceItem[]
}

export default function FullscreenVeilActivityRail({
  duration,
  items
}: FullscreenVeilActivityRailProps) {
  const marks = buildFullscreenVeilRailMarks(items, duration)
  if (marks.length === 0) return null

  return (
    <div className="fullscreen-veil-rail" aria-hidden="true">
      <div className="fullscreen-veil-rail__track">
        {marks.map((mark) => (
          <span
            key={`${mark.type}:${mark.id}`}
            className={`fullscreen-veil-rail__mark fullscreen-veil-rail__mark--${mark.type} fullscreen-veil-rail__mark--${mark.kind}`}
            style={{
              left: `${mark.leftPercent}%`,
              ...(mark.widthPercent === undefined ? {} : { width: `${mark.widthPercent}%` })
            }}
          />
        ))}
      </div>
    </div>
  )
}
