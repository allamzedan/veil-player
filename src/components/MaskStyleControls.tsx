import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { useMotionPreferences } from '../hooks/useMotionPreferences'
import { getRecentMaskColors } from '../lib/recentColors'
import {
  ADVANCED_MASK_PRESENTATIONS,
  MASK_STYLE_PRESETS,
  resolveMaskPresentation
} from '../lib/maskStylePresets'
import { shouldUseBlurEffects } from '../lib/motionPreferences'
import { shouldShowBlurFallbackWarning, supportsBackdropFilter } from '../lib/presentationSupport'
import { t } from '../i18n'
import { pushWarningToast } from '../state/useToastStore'
import type { MaskPresentation, MaskTrackItem } from '../types/track'
import { useVeilStore } from '../state/useVeilStore'

interface MaskStyleControlsProps {
  mask: MaskTrackItem
  disabled?: boolean
  compact?: boolean
  inspectorCompact?: boolean
  styleHeading?: string
}

function presetMatches(
  mask: MaskTrackItem,
  preset: (typeof MASK_STYLE_PRESETS)[number]
): boolean {
  const presentation = resolveMaskPresentation(mask.style)
  return (
    mask.style.color.toLowerCase() === preset.style.color.toLowerCase() &&
    Math.abs(mask.style.opacity - preset.style.opacity) < 0.001 &&
    presentation === (preset.style.presentation ?? 'solid')
  )
}

export default function MaskStyleControls({
  mask,
  disabled = false,
  compact = false,
  inspectorCompact = false,
  styleHeading
}: MaskStyleControlsProps) {
  useLanguage()
  const patchMaskStyle = useVeilStore((state) => state.patchMaskStyle)
  const [recentColors, setRecentColors] = useState(() => getRecentMaskColors())
  const [presentationOpen, setPresentationOpen] = useState(false)
  const motionPrefs = useMotionPreferences()

  const applyMaskColor = useCallback(
    (color: string): void => {
      patchMaskStyle(mask.id, { color })
      setRecentColors(getRecentMaskColors())
    },
    [mask.id, patchMaskStyle]
  )
  const opacityPercent = Math.round(mask.style.opacity * 100)
  const presentation = resolveMaskPresentation(mask.style)
  const blurAllowed = shouldUseBlurEffects(motionPrefs) && supportsBackdropFilter()

  useEffect(() => setPresentationOpen(false), [mask.id])

  const applyPresentation = (next: MaskPresentation): void => {
    if ((next === 'blur' || next === 'frosted') && !blurAllowed) {
      if (shouldShowBlurFallbackWarning()) {
        pushWarningToast(t('toast.blurUnsupported'))
      }
      patchMaskStyle(mask.id, { presentation: 'dim' })
      return
    }
    patchMaskStyle(mask.id, { presentation: next })
  }

  return (
    <section
      className={`mask-style-controls${compact ? ' mask-style-controls--compact' : ''}${inspectorCompact ? ' mask-style-controls--inspector' : ''}`}
      aria-label={t('maskStyle.title')}
    >
      {inspectorCompact ? (
        <h3 className="selected-item-editor__heading selected-item-editor__heading--inline">
          {styleHeading ?? t('selectedItem.style')}
        </h3>
      ) : (
        <h3 className="selected-item-editor__heading">{styleHeading ?? t('selectedItem.style')}</h3>
      )}

      {inspectorCompact ? (
        <>
          <div className="mask-style-controls__appearance-grid">
          <div className="mask-style-controls__inline-row">
            <span className="mask-style-controls__label">{t('maskStyle.color')}</span>
            <label className="mask-style-controls__swatch-wrap mask-style-controls__swatch-wrap--inline">
              <span
                className="mask-style-controls__swatch"
                style={{ backgroundColor: mask.style.color }}
                aria-hidden
              />
              <input
                type="color"
                className="mask-style-controls__color-input"
                value={mask.style.color}
                aria-label={t('maskStyle.maskColorAria')}
                title={mask.style.color}
                disabled={disabled}
                onChange={(event) => applyMaskColor(event.target.value)}
              />
            </label>
          </div>

          <div className="mask-style-controls__inline-row mask-style-controls__opacity-row">
            <span className="mask-style-controls__label">{t('maskStyle.opacity')}</span>
            <input
              type="range"
              className="mask-style-controls__opacity-slider ltr-digits"
              min={0}
              max={1}
              step={0.05}
              value={mask.style.opacity}
              aria-label={t('maskStyle.maskOpacityAria')}
              aria-valuetext={`${opacityPercent}%`}
              disabled={disabled}
              onChange={(event) =>
                patchMaskStyle(mask.id, { opacity: Number(event.target.value) })
              }
            />
            <span className="mask-style-controls__opacity-value ltr-digits" dir="ltr">{opacityPercent}%</span>
          </div>
          </div>

          <details
            className="mask-style-controls__advanced mask-style-controls__advanced--inspector layer-editor-disclosure"
            open={presentationOpen}
            onToggle={(event) => setPresentationOpen(event.currentTarget.open)}
          >
            <summary className="mask-style-controls__advanced-summary" aria-expanded={presentationOpen}>
              {t('maskStyle.presentation')}
            </summary>
            <div className="mask-style-controls__advanced-body">
              <p className="mask-style-controls__hint">{t('maskStyle.blurHint')}</p>
              <div
                className="mask-style-controls__presets"
                role="group"
                aria-label={t('maskStyle.presentationAria')}
              >
                {ADVANCED_MASK_PRESENTATIONS.map((entry) => {
                  const active = presentation === entry.id
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`btn btn-compact btn-secondary mask-style-controls__preset${active ? ' mask-style-controls__preset--active' : ''}`}
                      disabled={disabled}
                      onClick={() => applyPresentation(entry.id)}
                    >
                      {entry.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </details>
        </>
      ) : (
        <>
      <div className="mask-style-controls__field">
        <span className="mask-style-controls__label">{t('maskStyle.color')}</span>
        <div className="mask-style-controls__color">
          <label className="mask-style-controls__swatch-wrap">
            <span
              className="mask-style-controls__swatch"
              style={{ backgroundColor: mask.style.color }}
              aria-hidden
            />
            <input
              type="color"
              className="mask-style-controls__color-input"
              value={mask.style.color}
              aria-label={t('maskStyle.maskColorAria')}
              disabled={disabled}
              onChange={(event) => applyMaskColor(event.target.value)}
            />
          </label>
          <span className="mask-style-controls__hex">{mask.style.color}</span>
        </div>
      </div>

      {recentColors.length > 0 ? (
        <div className="mask-style-controls__field">
          <span className="mask-style-controls__label">{t('maskStyle.recentColors')}</span>
          <div
            className="mask-style-controls__recent"
            role="group"
            aria-label={t('maskStyle.recentColorsAria')}
          >
            {recentColors.map((color) => {
              const active =
                mask.style.color.toLowerCase() === color.toLowerCase()
              return (
                <button
                  key={color}
                  type="button"
                  className={`mask-style-controls__recent-swatch${active ? ' mask-style-controls__recent-swatch--active' : ''}`}
                  style={{ backgroundColor: color }}
                  title={color}
                  aria-label={t('maskStyle.applyColor', { color })}
                  disabled={disabled}
                  onClick={() => applyMaskColor(color)}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mask-style-controls__field mask-style-controls__opacity">
        <span className="mask-style-controls__label">{t('maskStyle.opacity')}</span>
        <input
          type="range"
          className="mask-style-controls__opacity-slider ltr-digits"
          min={0}
          max={1}
          step={0.05}
          value={mask.style.opacity}
          aria-label={t('maskStyle.maskOpacityAria')}
          disabled={disabled}
          onChange={(event) =>
            patchMaskStyle(mask.id, { opacity: Number(event.target.value) })
          }
        />
        <span className="mask-style-controls__opacity-value ltr-digits">{opacityPercent}%</span>
      </div>

      {!compact ? (
        <>
      <div className="mask-style-controls__field">
        <span className="mask-style-controls__label">{t('maskStyle.presets')}</span>
        <div className="mask-style-controls__presets" role="group" aria-label={t('maskStyle.presets')}>
          {MASK_STYLE_PRESETS.map((preset) => {
            const active = presetMatches(mask, preset)
            return (
              <button
                key={preset.id}
                type="button"
                className={`btn btn-compact btn-secondary mask-style-controls__preset${active ? ' mask-style-controls__preset--active' : ''}`}
                disabled={disabled}
                onClick={() => patchMaskStyle(mask.id, preset.style)}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      <details className="mask-style-controls__advanced">
        <summary>{t('common.advanced')}</summary>
        <div className="mask-style-controls__advanced-body">
          <p className="mask-style-controls__hint">{t('maskStyle.blurHint')}</p>
          <div
            className="mask-style-controls__presets"
            role="group"
            aria-label={t('maskStyle.presentationAria')}
          >
            {ADVANCED_MASK_PRESENTATIONS.map((entry) => {
              const active = presentation === entry.id
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`btn btn-compact btn-secondary mask-style-controls__preset${active ? ' mask-style-controls__preset--active' : ''}`}
                  disabled={disabled}
                  onClick={() => applyPresentation(entry.id)}
                >
                  {entry.label}
                </button>
              )
            })}
          </div>
        </div>
      </details>
        </>
      ) : null}
        </>
      )}
    </section>
  )
}
