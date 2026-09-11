import { useLanguage } from '../hooks/useLanguage'
import { useMotionPreferences } from '../hooks/useMotionPreferences'
import { t } from '../i18n'
import { writeMotionPreferences, type MotionPreferences } from '../lib/motionPreferences'

export default function MotionSettingsPanel() {
  useLanguage()
  const prefs = useMotionPreferences()

  const update = (patch: Partial<MotionPreferences>): void => {
    writeMotionPreferences({ ...prefs, ...patch })
  }

  return (
    <section className="motion-settings-panel" aria-label={t('settings.playbackMotion')}>
      <label className="motion-settings-panel__row">
        <input
          type="checkbox"
          checked={prefs.reduceMotion}
          onChange={(event) => update({ reduceMotion: event.target.checked })}
        />
        <span>{t('settings.reduceMotion')}</span>
      </label>
      <label className="motion-settings-panel__row">
        <input
          type="checkbox"
          checked={prefs.disableTransitions}
          onChange={(event) => update({ disableTransitions: event.target.checked })}
        />
        <span>{t('settings.disableUiTransitions')}</span>
      </label>
      <label className="motion-settings-panel__row">
        <input
          type="checkbox"
          checked={prefs.disableBlurEffects}
          onChange={(event) => update({ disableBlurEffects: event.target.checked })}
        />
        <span>{t('settings.disableBlurEffects')}</span>
      </label>
    </section>
  )
}
