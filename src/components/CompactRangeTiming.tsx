import { useRef } from 'react'
import { t } from '../i18n'

interface CompactRangeTimingProps {
  startInput: string
  endInput: string
  durationReadout: string
  durationSeconds: number
  disabled?: boolean
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onNudge: (field: 'start' | 'end', deltaSeconds: number) => void
  onCommit: () => void
}

export default function CompactRangeTiming({
  startInput,
  endInput,
  durationReadout,
  durationSeconds,
  disabled = false,
  onStartChange,
  onEndChange,
  onNudge,
  onCommit
}: CompactRangeTimingProps) {
  const focusValues = useRef<Partial<Record<'start' | 'end', string>>>({})

  const renderPill = (field: 'start' | 'end', value: string) => {
    const label = field === 'start' ? 'Start time' : 'End time'
    const changeValue = field === 'start' ? onStartChange : onEndChange
    return (
      <div className="compact-range-timing__pill" role="group" aria-label={label}>
        <button
          type="button"
          className="compact-range-timing__nudge"
          disabled={disabled}
          aria-label={`Decrease ${field} time by 1 second`}
          onClick={() => onNudge(field, -1)}
        >
          ‹
        </button>
        <input
          type="text"
          className="compact-range-timing__input ltr-digits"
          value={value}
          disabled={disabled}
          dir="ltr"
          aria-label={label}
          onFocus={(event) => {
            focusValues.current[field] = value
            event.currentTarget.select()
          }}
          onChange={(event) => changeValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onCommit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              changeValue(focusValues.current[field] ?? value)
              event.currentTarget.select()
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault()
              onNudge(field, event.key === 'ArrowUp' ? 1 : -1)
            }
          }}
          placeholder={field === 'start' ? '0:00' : '0:05'}
          spellCheck={false}
        />
        <button
          type="button"
          className="compact-range-timing__nudge"
          disabled={disabled}
          aria-label={`Increase ${field} time by 1 second`}
          onClick={() => onNudge(field, 1)}
        >
          ›
        </button>
      </div>
    )
  }

  return (
    <section className="compact-range-timing" aria-label={t('inspector.timing')} dir="ltr">
      <h3 className="selected-item-editor__heading">{t('inspector.timing')}</h3>
      <div className="compact-range-timing__strip">
        {renderPill('start', startInput)}
        <span className="compact-range-timing__arrow" aria-hidden="true">→</span>
        {renderPill('end', endInput)}
        <output
          className="compact-range-timing__duration ltr-digits"
          aria-label={`Duration: ${durationSeconds} seconds`}
          title={`Duration: ${durationSeconds} seconds`}
        >{durationReadout}</output>
      </div>
    </section>
  )
}
