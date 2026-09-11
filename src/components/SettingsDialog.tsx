import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import veilLogo from '../assets/veil-logo.png'
import MotionSettingsPanel from './MotionSettingsPanel'
import SubtitleAppearanceControls from './SubtitleAppearanceControls'
import SubtitleOffsetControls from './SubtitleOffsetControls'
import Modal from './Modal'
import { ShortcutHelpContent } from './ShortcutHelp'
import { useLanguage } from '../hooks/useLanguage'
import { setLanguage, supportedLanguages, t, type LanguageCode } from '../i18n'
import { readShowStatusBar, writeShowStatusBar } from '../lib/appChromePreferences'
import { useThemePreference, writeThemePreference } from '../lib/themePreferences'
import { patchPlaybackActivityPreferences } from '../lib/playbackActivityPreferences'
import { usePlaybackActivityPreferences } from '../hooks/usePlaybackActivityPreferences'
import {
  appendContentReviewCustomTerm,
  MAX_CONTENT_REVIEW_CUSTOM_TERM_LENGTH,
  patchContentReviewPreferences,
  removeContentReviewCustomTerm
} from '../lib/contentReviewPreferences'
import { useContentReviewPreferences } from '../hooks/useContentReviewPreferences'
import { APP_VERSION } from '../lib/appVersion'
import { resolvePlaybackCapabilities } from '../lib/playbackCapabilities'
import { SETTINGS_SECTION_EVENT, type SettingsSection } from '../lib/settingsNavigation'
import { useVeilStore } from '../state/useVeilStore'
import { SUPPORTED_TRACK_VERSION, type SubtitleCoverMode } from '../types/track'

interface SettingsDialogProps {
  open: boolean
  showStatusBar: boolean
  onShowStatusBarChange: (value: boolean) => void
  onClose: () => void
}

const sections: SettingsSection[] = [
  'general',
  'playback',
  'subtitles',
  'contentReview',
  'appearance',
  'shortcuts',
  'about'
]

const sectionLabel = (section: SettingsSection): string =>
  section === 'contentReview'
    ? t('settings.subtitleContentReview')
    : t(`settings.${section}`)

export default function SettingsDialog({
  open,
  showStatusBar,
  onShowStatusBarChange,
  onClose
}: SettingsDialogProps) {
  const language = useLanguage()
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')
  const [customReviewTermInput, setCustomReviewTermInput] = useState('')
  const themePreference = useThemePreference()
  const playbackActivity = usePlaybackActivityPreferences()
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const contentReview = useContentReviewPreferences()
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const subtitleCoverMode = useVeilStore((state) => state.subtitleCoverMode)
  const setSubtitleCoverMode = useVeilStore((state) => state.setSubtitleCoverMode)
  const capabilities = useMemo(
    () => resolvePlaybackCapabilities(mediaSource, mediaKind),
    [mediaKind, mediaSource]
  )


  useEffect(() => {
    const onSection = (event: Event): void => {
      const section = (event as CustomEvent<SettingsSection>).detail
      if (sections.includes(section)) setActiveSection(section)
    }
    window.addEventListener(SETTINGS_SECTION_EVENT, onSection)
    return () => window.removeEventListener(SETTINGS_SECTION_EVENT, onSection)
  }, [])

  const onLanguageChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setLanguage(event.target.value as LanguageCode)
  }

  const toggleStatusBar = (): void => {
    const next = !readShowStatusBar()
    writeShowStatusBar(next)
    onShowStatusBarChange(next)
  }


  const onNavKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let next = index
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % sections.length
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + sections.length) % sections.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = sections.length - 1
    else return
    event.preventDefault()
    setActiveSection(sections[next])
    document.querySelector<HTMLButtonElement>(`[data-settings-section="${sections[next]}"]`)?.focus()
  }

  const canAddCustomReviewTerm =
    appendContentReviewCustomTerm(contentReview.customTerms, customReviewTermInput).length
      > contentReview.customTerms.length

  const onAddCustomReviewTerm = (): void => {
    const customTerms = appendContentReviewCustomTerm(contentReview.customTerms, customReviewTermInput)
    if (customTerms.length === contentReview.customTerms.length) return
    patchContentReviewPreferences({ customTerms })
    setCustomReviewTermInput('')
  }

  const onCustomReviewTermKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key !== 'Enter' || !canAddCustomReviewTerm) return
    event.preventDefault()
    onAddCustomReviewTerm()
  }

  const onRemoveCustomReviewTerm = (term: string): void => {
    patchContentReviewPreferences({
      customTerms: removeContentReviewCustomTerm(contentReview.customTerms, term)
    })
  }

  const subtitleModes: Array<{ value: SubtitleCoverMode; label: string; description: string }> = [
    {
      value: 'show',
      label: t('subtitles.showSubtitles'),
      description: t('subtitles.showDescription')
    },
    ...(capabilities.canUseSmartCover
      ? [{
          value: 'smartCover' as const,
          label: t('subtitles.smartCover'),
          description: t('subtitles.smartCoverDescription')
        }]
      : []),
    ...(capabilities.canUseRegionCover
      ? [{
          value: 'regionCover' as const,
          label: t('subtitles.regionCover'),
          description: t('subtitles.regionCoverDescription')
        }]
      : [])
  ]

  const sectionContent = {
    general: (
      <>
        <label className="settings-dialog__row settings-dialog__row--language">
          <span>{t('settings.language')}</span>
          <select className="settings-dialog__select" value={language} onChange={onLanguageChange} aria-label={t('settings.language')}>
            {supportedLanguages.map((entry) => <option key={entry.code} value={entry.code}>{entry.nativeLabel}</option>)}
          </select>
        </label>
        <label className="settings-dialog__row">
          <input type="checkbox" checked={showStatusBar} onChange={toggleStatusBar} />
          <span>{t('settings.showStatusBar')}</span>
        </label>
      </>
    ),
    playback: (
      <>
        <label className="settings-dialog__row">
          <input type="checkbox" checked={playbackActivity.showFullscreenVeilRail} onChange={(event) => patchPlaybackActivityPreferences({ showFullscreenVeilRail: event.target.checked })} />
          <span>{t('settings.showFullscreenVeilRail')}</span>
        </label>
        {([
          ['defaultMaskDurationSeconds', 'settings.defaultMaskDuration'],
          ['defaultMuteDurationSeconds', 'settings.defaultMuteDuration'],
          ['defaultSkipDurationSeconds', 'settings.defaultSkipDuration']
        ] as const).map(([key, label]) => (
          <label key={key} className="settings-dialog__row settings-dialog__row--number">
            <span>{t(label)}</span>
            <span className="settings-dialog__number-with-unit">
              <input className="settings-dialog__number ltr-digits" type="number" min="0.1" max="3600" step="0.1" value={playbackActivity[key]} onChange={(event) => patchPlaybackActivityPreferences({ [key]: Number(event.target.value) })} />
              <span aria-hidden="true">s</span>
            </span>
          </label>
        ))}
        <label className="settings-dialog__row settings-dialog__row--number">
          <span>{t('settings.bookmarkActivityDisplayTime')}</span>
          <span className="settings-dialog__number-with-unit">
            <input className="settings-dialog__number ltr-digits" type="number" min="1" max="30" step="1" value={playbackActivity.bookmarkActivityDurationMs / 1000} onChange={(event) => patchPlaybackActivityPreferences({ bookmarkActivityDurationMs: Number(event.target.value) * 1000 })} />
            <span aria-hidden="true">s</span>
          </span>
        </label>
        <p className="settings-dialog__hint">{t('settings.durationSecondsHint')}</p>
        <div className="settings-dialog__subsection"><h4>{t('settings.playbackMotion')}</h4><MotionSettingsPanel /></div>
      </>
    ),
    subtitles: (
      <>
        <h4 className="settings-dialog__subheading">{t('settings.subtitleAppearance')}</h4>
        <SubtitleAppearanceControls />
        <section className="settings-dialog__subsection settings-dialog__subtitle-modes">
          <h4>{t('settings.subtitleDisplayMode')}</h4>
          {subtitleModes.map((mode) => (
            <label key={mode.value} className="settings-dialog__row settings-dialog__subtitle-mode">
              <input type="radio" name="settings-subtitle-mode" checked={subtitleCoverMode === mode.value} onChange={() => setSubtitleCoverMode(mode.value)} />
              <span className="settings-dialog__subtitle-mode-copy">
                <span>{mode.label}</span>
                <small>{mode.description}</small>
              </span>
            </label>
          ))}
        </section>
        <div className="settings-dialog__subsection">
          <SubtitleOffsetControls />
        </div>
      </>
    ),
    contentReview: (
      <section className="settings-dialog__content-review">
          <label className="settings-dialog__row">
            <input
              type="checkbox"
              checked={contentReview.analyzeImportedSubtitles}
              onChange={(event) =>
                patchContentReviewPreferences({
                  analyzeImportedSubtitles: event.target.checked
                })
              }
            />
            <span>{t('contentReview.settingLabel')}</span>
          </label>
          <p className="settings-dialog__hint">{t('contentReview.settingHint')}</p>
          <div className="settings-dialog__content-review-terms">
            <h4>{t('contentReview.customTerms')}</h4>
            <p className="settings-dialog__content-review-terms-help">{t('contentReview.customTermsHelp')}</p>
            <div className="settings-dialog__content-review-term-entry">
              <input
                id="settings-content-review-custom-term"
                aria-label={t('contentReview.customTerms')}
                type="text"
                dir="auto"
                maxLength={MAX_CONTENT_REVIEW_CUSTOM_TERM_LENGTH}
                value={customReviewTermInput}
                placeholder={t('contentReview.customTermsPlaceholder')}
                onChange={(event) => setCustomReviewTermInput(event.target.value)}
                onKeyDown={onCustomReviewTermKeyDown}
              />
              <button type="button" className="btn btn-secondary" disabled={!canAddCustomReviewTerm} onClick={onAddCustomReviewTerm}>
                {t('contentReview.customTermsAdd')}
              </button>
            </div>
            {contentReview.customTerms.length > 0 ? (
              <ul className="settings-dialog__content-review-term-list">
                {contentReview.customTerms.map((term) => (
                  <li key={term}>
                    <span dir="auto">{term}</span>
                    <button type="button" onClick={() => onRemoveCustomReviewTerm(term)} aria-label={t('contentReview.customTermsRemove', { term })}>×</button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="settings-dialog__content-review-terms-local">{t('contentReview.customTermsLocal')}</p>
          </div>
      </section>
    ),
    appearance: (
      <>
        <section className="settings-dialog__subsection settings-dialog__theme">
          <h4>{t('settings.theme')}</h4>
          <label className="settings-dialog__row settings-dialog__theme-option">
            <input type="radio" name="settings-theme" value="dark" checked={themePreference === 'dark'} onChange={() => writeThemePreference('dark')} />
            <span className="settings-dialog__theme-copy"><span>{t('settings.themeDark')}</span><small>{t('settings.themeDarkDescription')}</small></span>
          </label>
          <label className="settings-dialog__row settings-dialog__theme-option">
            <input type="radio" name="settings-theme" value="light" checked={themePreference === 'light'} onChange={() => writeThemePreference('light')} />
            <span className="settings-dialog__theme-copy"><span>{t('settings.themeLight')}</span><small>{t('settings.themeLightDescription')}</small></span>
          </label>
          <label className="settings-dialog__row settings-dialog__theme-option">
            <input type="radio" name="settings-theme" value="system" checked={themePreference === 'system'} onChange={() => writeThemePreference('system')} />
            <span className="settings-dialog__theme-copy"><span>{t('settings.themeSystem')}</span><small>{t('settings.themeSystemDescription')}</small></span>
          </label>
        </section>
      </>
    ),
    shortcuts: <ShortcutHelpContent />,
    about: (
      <div className="settings-dialog__about">
        <img src={veilLogo} alt="" className="about-dialog__logo" />
        <h4 className="about-dialog__product-title settings-dialog__about-title">VEIL Player</h4>
        <p className="settings-dialog__about-description">{t('about.lead')}</p>
        <p className="settings-dialog__about-description">{t('about.privacy')}</p>
        <p className="settings-dialog__about-meta ltr-digits">{t('about.metaVersion', { version: APP_VERSION, schema: SUPPORTED_TRACK_VERSION })}</p>
        <p className="settings-dialog__about-developer">{t('about.developer')}</p>
      </div>
    )
  }[activeSection]

  return (
    <Modal open={open} title={t('settings.title')} onClose={onClose} panelClassName="modal__panel--settings" mountToDocument footer={<button type="button" className="btn btn-secondary" onClick={onClose}>{t('watch.done')}</button>}>
      <div className="settings-dialog">
        <nav className="settings-dialog__nav" aria-label={t('settings.navigation')}>
          {sections.map((section, index) => (
            <button key={section} type="button" data-settings-section={section} className={`settings-dialog__nav-item${activeSection === section ? ' settings-dialog__nav-item--active' : ''}`} aria-current={activeSection === section ? 'page' : undefined} onClick={() => setActiveSection(section)} onKeyDown={(event) => onNavKeyDown(event, index)}>
              {sectionLabel(section)}
            </button>
          ))}
        </nav>
        <section className="settings-dialog__content" aria-labelledby={`settings-${activeSection}-heading`}>
          <h3 id={`settings-${activeSection}-heading`} className="settings-dialog__heading">{sectionLabel(activeSection)}</h3>
          {sectionContent}
        </section>
      </div>
    </Modal>
  )
}
