import { useEffect, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import {
  DEFAULT_SUBTITLE_PRESENTATION,
  readSubtitlePresentation,
  subscribeSubtitlePresentation,
  writeSubtitlePresentation,
  type SubtitlePresentationPreferences
} from '../lib/subtitlePresentationPreferences'

export default function SubtitleAppearanceControls() {
  useLanguage()
  const [prefs, setPrefs] = useState<SubtitlePresentationPreferences>(() =>
    readSubtitlePresentation()
  )

  useEffect(() => subscribeSubtitlePresentation(() => setPrefs(readSubtitlePresentation())), [])

  const update = (patch: Partial<SubtitlePresentationPreferences>): void => {
    writeSubtitlePresentation({ ...prefs, ...patch })
  }

  return (
    <section className="subtitle-appearance-controls" aria-label={t('settings.subtitleAppearance')}>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.textSize')}</span>
        <input
          type="range"
          className="subtitle-appearance-controls__range ltr-digits"
          min={0.8}
          max={1.4}
          step={0.05}
          value={prefs.fontScale}
          onChange={(event) => update({ fontScale: Number(event.target.value) })}
        />
        <span className="subtitle-appearance-controls__value ltr-digits">
          {prefs.fontScale.toFixed(2)}×
        </span>
      </label>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.subtitleTextColor')}</span>
        <input
          type="color"
          value={prefs.textColor}
          onChange={(event) => update({ textColor: event.target.value })}
        />
      </label>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.subtitleFontFamily')}</span>
        <select
          value={prefs.fontFamily}
          onChange={(event) => update({
            fontFamily: event.target.value as SubtitlePresentationPreferences['fontFamily']
          })}
        >
          <option value="default">{t('settings.subtitleFontDefault')}</option>
          <option value="sans-serif">{t('settings.subtitleFontSans')}</option>
          <option value="serif">{t('settings.subtitleFontSerif')}</option>
          <option value="monospace">{t('settings.subtitleFontMonospace')}</option>
        </select>
      </label>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.subtitleBackground')}</span>
        <select
          value={prefs.backgroundMode}
          onChange={(event) => update({
            backgroundMode: event.target.value as SubtitlePresentationPreferences['backgroundMode']
          })}
        >
          <option value="off">{t('settings.subtitleBackgroundOff')}</option>
          <option value="box">{t('settings.subtitleBackgroundBox')}</option>
        </select>
      </label>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.subtitleBackgroundColor')}</span>
        <input
          type="color"
          value={prefs.backgroundColor}
          disabled={prefs.backgroundMode === 'off'}
          onChange={(event) => update({ backgroundColor: event.target.value })}
        />
      </label>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.subtitleBackgroundOpacity')}</span>
        <input
          type="range"
          className="subtitle-appearance-controls__range ltr-digits"
          min={0}
          max={1}
          step={0.05}
          value={prefs.backgroundOpacity}
          disabled={prefs.backgroundMode === 'off'}
          onChange={(event) => update({ backgroundOpacity: Number(event.target.value) })}
        />
        <span className="subtitle-appearance-controls__value ltr-digits">
          {Math.round(prefs.backgroundOpacity * 100)}%
        </span>
      </label>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.textOpacity')}</span>
        <input
          type="range"
          className="subtitle-appearance-controls__range ltr-digits"
          min={0.5}
          max={1}
          step={0.05}
          value={prefs.textOpacity}
          onChange={(event) => update({ textOpacity: Number(event.target.value) })}
        />
        <span className="subtitle-appearance-controls__value ltr-digits">
          {Math.round(prefs.textOpacity * 100)}%
        </span>
      </label>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.shadow')}</span>
        <input
          type="range"
          className="subtitle-appearance-controls__range ltr-digits"
          min={0}
          max={1}
          step={0.05}
          value={prefs.shadowStrength}
          onChange={(event) => update({ shadowStrength: Number(event.target.value) })}
        />
        <span className="subtitle-appearance-controls__value ltr-digits">
          {Math.round(prefs.shadowStrength * 100)}%
        </span>
      </label>
      <label className="subtitle-appearance-controls__row">
        <span>{t('settings.bottomOffset')}</span>
        <input
          type="range"
          className="subtitle-appearance-controls__range ltr-digits"
          min={4}
          max={24}
          step={1}
          value={prefs.bottomOffsetPercent}
          onChange={(event) => update({ bottomOffsetPercent: Number(event.target.value) })}
        />
        <span className="subtitle-appearance-controls__value ltr-digits">
          {prefs.bottomOffsetPercent}%
        </span>
      </label>
      <button
        type="button"
        className="btn btn-ghost btn-compact"
        onClick={() => writeSubtitlePresentation({ ...DEFAULT_SUBTITLE_PRESENTATION })}
      >
        {t('settings.resetAppearance')}
      </button>
    </section>
  )
}
