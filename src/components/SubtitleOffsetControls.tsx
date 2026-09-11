import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { getTotalTrackItemCount } from '../lib/trackItems'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'

interface SubtitleOffsetControlsProps {
  onAfterTimingMutation?: () => void
}

const OFFSET_STEP_SECONDS = 0.5
const SHIFT_STEP_SECONDS = 1

export function nextSubtitleOffset(current: number, delta: number): number {
  return current + delta
}

export default function SubtitleOffsetControls({
  onAfterTimingMutation
}: SubtitleOffsetControlsProps) {
  useLanguage()
  const globalOffsetSeconds = useVeilStore((state) => state.globalOffsetSeconds)
  const setGlobalOffsetSeconds = useVeilStore((state) => state.setGlobalOffsetSeconds)
  const shiftAllTrackItems = useVeilStore((state) => state.shiftAllTrackItems)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const subtitleCues = useVeilStore((state) => state.subtitleCues)

  const [shiftInput, setShiftInput] = useState('')

  const totalItems = getTotalTrackItemCount({ masks, mutes, skips })
  const hasTrackItems = totalItems > 0
  const hasSubtitleCues = subtitleCues.length > 0
  const canShift = hasTrackItems || hasSubtitleCues

  const applyOffsetDelta = (delta: number): void => {
    setGlobalOffsetSeconds(nextSubtitleOffset(useVeilStore.getState().globalOffsetSeconds, delta))
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
    <section className="subtitle-offset-controls" aria-label={t('subtitles.offsetAria')}>
      <h4 className="settings-dialog__subheading">{t('settings.subtitleTiming')}</h4>
      <p className="subtitle-offset-controls__hint">{t('subtitles.offsetHint')}</p>
      <div className="subtitle-offset-controls__row">
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          onClick={() => applyOffsetDelta(-OFFSET_STEP_SECONDS)}
        >
          {t('offset.decreaseCompact')}
        </button>
        <span className="subtitle-offset-controls__readout ltr-digits">
          {t('subtitles.offset')}: {globalOffsetSeconds >= 0 ? '+' : ''}
          {globalOffsetSeconds.toFixed(1)} s
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-compact"
          onClick={() => applyOffsetDelta(OFFSET_STEP_SECONDS)}
        >
          {t('offset.increaseCompact')}
        </button>
      </div>

      {hasSubtitleCues ? (
        <>
          <p className="subtitle-offset-controls__hint">{t('subtitles.cueShiftHint')}</p>
          <div className="subtitle-offset-controls__row">
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
          <div className="subtitle-offset-controls__row">
            <label className="subtitle-offset-controls__field">
              <span>{t('offset.shiftByLabel')}</span>
              <input
                type="text"
                className="subtitle-offset-controls__input"
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
              disabled={!canShift}
              onClick={onApplyShiftInput}
            >
              {t('common.apply')}
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
