import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { getTotalTrackItemCount } from '../lib/trackItems'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'

interface TrackOffsetControlsProps {
  onAfterChange?: () => void
  onAfterTimingMutation?: () => void
}

const OFFSET_STEP_SECONDS = 0.5
const SHIFT_STEP_SECONDS = 1

export default function TrackOffsetControls({ onAfterTimingMutation }: TrackOffsetControlsProps) {
  useLanguage()
  const globalOffsetSeconds = useVeilStore((state) => state.globalOffsetSeconds)
  const setGlobalOffsetSeconds = useVeilStore((state) => state.setGlobalOffsetSeconds)
  const shiftAllTrackItems = useVeilStore((state) => state.shiftAllTrackItems)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)

  const [shiftInput, setShiftInput] = useState('')

  const totalItems = getTotalTrackItemCount({ masks, mutes, skips })
  const subtitleCues = useVeilStore((state) => state.subtitleCues)
  const hasItems = totalItems > 0
  const canShift = hasItems || subtitleCues.length > 0

  const applyOffsetDelta = (delta: number): void => {
    setGlobalOffsetSeconds(globalOffsetSeconds + delta)
    onAfterTimingMutation?.()
  }

  const applyShiftDelta = (delta: number): void => {
    if (!canShift) {
      return
    }
    shiftAllTrackItems(delta)
    onAfterTimingMutation?.()
  }

  const onApplyShiftInput = (): void => {
    const trimmed = shiftInput.trim()
    if (trimmed.length === 0) {
      return
    }
    const delta = Number(trimmed)
    if (!Number.isFinite(delta)) {
      return
    }
    applyShiftDelta(delta)
    setShiftInput('')
  }

  return (
    <section className="track-offset-controls" aria-label={t('offset.ariaLabel')}>
      <h2 className="track-sidebar__title">{t('offset.title')}</h2>
      <p className="track-offset-controls__hint">{t('offset.globalHint')}</p>
      <div className="track-offset-controls__row">
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          onClick={() => applyOffsetDelta(-OFFSET_STEP_SECONDS)}
        >
          {t('offset.decrease')}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          onClick={() => applyOffsetDelta(OFFSET_STEP_SECONDS)}
        >
          {t('offset.increase')}
        </button>
        <span className="track-offset-controls__readout">
          {globalOffsetSeconds >= 0 ? '+' : ''}
          {globalOffsetSeconds.toFixed(1)}s
        </span>
      </div>

      <h2 className="track-sidebar__title">{t('offset.shiftTitle')}</h2>
      <p className="track-offset-controls__hint">{t('offset.shiftHint')}</p>
      <div className="track-offset-controls__row">
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          disabled={!canShift}
          onClick={() => applyShiftDelta(-SHIFT_STEP_SECONDS)}
        >
          {t('offset.shiftDecrease')}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          disabled={!canShift}
          onClick={() => applyShiftDelta(SHIFT_STEP_SECONDS)}
        >
          {t('offset.shiftIncrease')}
        </button>
      </div>
      <div className="track-offset-controls__row">
        <label className="track-offset-controls__field">
          <span>{t('offset.shiftByLabel')}</span>
          <input
            type="text"
            className="track-offset-controls__input"
            value={shiftInput}
            disabled={!canShift}
            onChange={(event) => setShiftInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onApplyShiftInput()
              }
            }}
            placeholder={t('offset.shiftPlaceholder')}
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          disabled={!hasItems}
          onClick={onApplyShiftInput}
        >
          {t('common.apply')}
        </button>
      </div>
    </section>
  )
}
