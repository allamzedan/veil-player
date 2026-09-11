import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clearAppMenuActions, registerAppMenuActions } from '../lib/appMenuBridge'
import type { SessionLoop } from '../lib/sessionLoop'
import { parseSrt } from '../lib/srtParser'
import { userMessages } from '../lib/userMessages'
import { useLanguage } from '../hooks/useLanguage'
import { useContentReviewPreferences } from '../hooks/useContentReviewPreferences'
import { t } from '../i18n'
import { confirmNative } from '../lib/nativeConfirm'
import { pushSuccessToast, pushWarningToast } from '../state/useToastStore'
import { resolvePlaybackCapabilities } from '../lib/playbackCapabilities'
import { useVeilStore } from '../state/useVeilStore'
import { useContentReviewSessionStore } from '../state/useContentReviewSessionStore'
import type { SubtitleCoverMode } from '../types/track'
import LoopControls from './LoopControls'
import SubtitleAppearanceControls from './SubtitleAppearanceControls'
import SubtitleNavigationControls from './SubtitleNavigationControls'
import {
  EyeIcon,
  EyeOffIcon,
  RefreshIcon,
  SettingsIcon,
  SubtitleFileIcon,
  TrashIcon,
  UploadFileIcon,
  ZoomToSelectionIcon
} from './icons'

const MAX_CUE_STORAGE_WARNING = 5000
const LARGE_MASK_GENERATE_THRESHOLD = 1000
export type SrtImportControlsVariant = 'legacy' | 'sheet'

interface SrtImportControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  getCurrentTime: () => number
  onAfterImport?: () => void
  onAfterSeek?: () => void
  sessionLoop?: SessionLoop
  onSessionLoopChange?: (loop: SessionLoop) => void
  autoPauseAtCueEnd?: boolean
  onAutoPauseAtCueEndChange?: (value: boolean) => void
  reviewIsolation?: boolean
  onToggleReviewIsolation?: () => void
  fullReveal?: boolean
  onFullRevealChange?: (value: boolean) => void
  variant?: SrtImportControlsVariant
  onOpenSubtitleSettings?: () => void
  onRegisterImportTrigger?: (trigger: () => void) => void
}

function modeOptions(regionCoverEnabled: boolean): { value: SubtitleCoverMode; label: string; hint: string }[] {
  return [
    {
      value: 'show',
      label: t('subtitles.showSubtitles'),
      hint: t('subtitles.showDescription')
    },
    ...(regionCoverEnabled
      ? [
          {
            value: 'smartCover' as const,
            label: t('subtitles.smartCover'),
            hint: t('subtitles.smartCoverDescription')
          },
          {
            value: 'regionCover' as const,
            label: t('subtitles.regionCover'),
            hint: t('subtitles.regionCoverDescription')
          }
        ]
      : [])
  ]
}

export default function SrtImportControls({
  videoRef,
  getCurrentTime,
  onAfterImport,
  onAfterSeek,
  sessionLoop,
  onSessionLoopChange,
  autoPauseAtCueEnd = false,
  onAutoPauseAtCueEndChange,
  reviewIsolation = false,
  onToggleReviewIsolation,
  fullReveal = false,
  onFullRevealChange,
  variant = 'legacy',
  onOpenSubtitleSettings,
  onRegisterImportTrigger
}: SrtImportControlsProps) {
  const language = useLanguage()
  const contentReviewPreferences = useContentReviewPreferences()
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const capabilities = useMemo(
    () => resolvePlaybackCapabilities(mediaSource, mediaKind),
    [mediaKind, mediaSource]
  )
  const regionCoverEnabled = capabilities.canUseRegionCover
  const modes = useMemo(() => modeOptions(regionCoverEnabled), [language, regionCoverEnabled])
  const masks = useVeilStore((state) => state.masks)
  const subtitleCues = useVeilStore((state) => state.subtitleCues)
  const subtitleFileName = useVeilStore((state) => state.subtitleFileName)
  const subtitleCoverMode = useVeilStore((state) => state.subtitleCoverMode)
  const showSubtitleText = useVeilStore((state) => state.showSubtitleText)
  const setShowSubtitleText = useVeilStore((state) => state.setShowSubtitleText)
  const setSubtitleCoverMode = useVeilStore((state) => state.setSubtitleCoverMode)
  const setSubtitleCues = useVeilStore((state) => state.setSubtitleCues)
  const clearSubtitleCues = useVeilStore((state) => state.clearSubtitleCues)
  const setSubtitleFileName = useVeilStore((state) => state.setSubtitleFileName)
  const generatePerCueSubtitleMasks = useVeilStore((state) => state.generatePerCueSubtitleMasks)
  const contentReviewFindings = useContentReviewSessionStore((state) => state.findings)
   const contentReviewOfferVisible = useContentReviewSessionStore((state) => state.offerVisible)
   const analyzeImportedCues = useContentReviewSessionStore((state) => state.analyzeImportedCues)
   const requestReviewForCues = useContentReviewSessionStore(
     (state) => state.requestReviewForCues
   )
   const reviewContentNow = useContentReviewSessionStore((state) => state.reviewNow)
   const deferContentReview = useContentReviewSessionStore((state) => state.later)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [generatedMaskCount, setGeneratedMaskCount] = useState<number | null>(null)

  const cueCount = subtitleCues.length
  const isSheet = variant === 'sheet'
  const subtitleMaskCount = useMemo(
    () => masks.filter((mask) => mask.source?.kind === 'srt').length,
    [masks]
  )
  const loop = sessionLoop ?? { start: 0, end: 0, enabled: false }

  const onImportClick = useCallback((): void => {
    if (!capabilities.canImportCustomSubtitles) {
      pushWarningToast(t('youtube.customSubtitlesUnavailable'))
      return
    }
    fileInputRef.current?.click()
  }, [capabilities.canImportCustomSubtitles])

  useEffect(() => {
    if (!regionCoverEnabled && subtitleCoverMode !== 'show') {
      setSubtitleCoverMode('show')
    }
  }, [regionCoverEnabled, setSubtitleCoverMode, subtitleCoverMode])

  useEffect(() => {
    if (!capabilities.canImportCustomSubtitles) {
      return
    }
    registerAppMenuActions({
      importSrt: onImportClick
    })
    return () => {
      clearAppMenuActions(['importSrt'])
    }
  }, [capabilities.canImportCustomSubtitles, onImportClick])

  useEffect(() => {
    onRegisterImportTrigger?.(onImportClick)
  }, [onImportClick, onRegisterImportTrigger])

  const onModeChange = (mode: SubtitleCoverMode): void => {
    setSubtitleCoverMode(mode)
    if (mode === 'regionCover') {
      setShowSubtitleText(false)
    } else if (cueCount > 0) {
      setShowSubtitleText(true)
    }
  }

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !capabilities.canImportCustomSubtitles) {
      return
    }

    setImportStatus(null)
    setGeneratedMaskCount(null)

    let text: string
    try {
      text = await file.text()
    } catch {
      setImportStatus(userMessages.srtReadFailed)
      return
    }

    const { cues, skippedCount } = parseSrt(text)

    if (cues.length === 0) {
      setImportStatus(userMessages.srtNoCues)
      return
    }

    if (cues.length > MAX_CUE_STORAGE_WARNING) {
      pushWarningToast(t('subtitles.largeCueWarning', { count: cues.length }))
    }

  setSubtitleCues(cues)
  setSubtitleFileName(file.name)
  analyzeImportedCues(
    cues,
    contentReviewPreferences.analyzeImportedSubtitles
  )

  const mode = useVeilStore.getState().subtitleCoverMode
  if (mode === 'regionCover') {
    setShowSubtitleText(false)
  } else {
    setShowSubtitleText(true)
  }

    onAfterImport?.()
    pushSuccessToast(t('toast.subtitleLoaded'))

    if (skippedCount > 0) {
      setImportStatus(
        skippedCount === 1
          ? t('subtitles.skippedCues', { count: skippedCount })
          : t('subtitles.skippedCuesPlural', { count: skippedCount })
      )
    }
  }

  const onGeneratePerCueMasks = (): void => {
    if (cueCount === 0) {
      return
    }

    if (cueCount > LARGE_MASK_GENERATE_THRESHOLD) {
      const proceed = confirmNative(t('dialog.generateSubtitleMasks'), t('subtitles.generateMasksConfirm', { count: cueCount }))
      if (!proceed) {
        return
      }
    }

    const count = generatePerCueSubtitleMasks()
    if (count > 0) {
      setGeneratedMaskCount(count)
      setImportStatus(null)
      onAfterImport?.()
    }
  }

  const onClearCues = (): void => {
    clearSubtitleCues()
    setShowSubtitleText(false)
    setImportStatus(null)
    setGeneratedMaskCount(null)
  }
   const onReviewContent = (): void => {
    const findings = requestReviewForCues(subtitleCues)
    if (findings.length === 0) {
      pushSuccessToast(t('contentReview.noneFound'))
    }
  }

  if (!capabilities.canImportCustomSubtitles) {
    return <p className="subtitle-sheet__empty-text">{t('youtube.customSubtitlesUnavailable')}</p>
  }

  const modeFieldset = (
    <fieldset className="srt-import-controls__modes">
      <legend className="srt-import-controls__legend">{t('subtitles.mode')}</legend>
      {modes.map((option) => (
        <div key={option.value} className="srt-import-controls__mode-option">
          <label className="srt-import-controls__option">
            <input
              type="radio"
              name={isSheet ? 'subtitle-cover-mode-sheet' : 'subtitle-cover-mode'}
              value={option.value}
              checked={subtitleCoverMode === option.value}
              onChange={() => onModeChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
          {!isSheet ? <p className="srt-import-controls__hint">{option.hint}</p> : null}
        </div>
      ))}
    </fieldset>
  )

  return (
    <div
      className={`srt-import-controls${isSheet ? ' srt-import-controls--sheet' : ''}`}
      role="group"
      aria-label={t('sidebar.subtitles')}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt,text/plain"
        hidden
        onChange={(event) => void onFileChange(event)}
      />

      {isSheet && cueCount === 0 ? (
        <div className="subtitle-sheet__empty">
          <span className="subtitle-sheet__empty-icon" aria-hidden>
            <SubtitleFileIcon size={25} />
          </span>
          <div className="subtitle-sheet__empty-copy">
            <strong>{t('subtitles.noSubtitleLoaded')}</strong>
            <p>{t('subtitles.emptyDescription')}</p>
          </div>
          <button type="button" className="btn btn-primary subtitle-sheet__empty-action" onClick={onImportClick}>
            <UploadFileIcon size={16} />
            <span>{t('subtitles.loadSubtitle')}</span>
          </button>
          <button type="button" className="btn btn-secondary subtitle-sheet__empty-action" onClick={onOpenSubtitleSettings}>
            <SettingsIcon size={16} />
            <span>{t('subtitles.openSettings')}</span>
          </button>
        </div>
      ) : null}

      {isSheet && cueCount > 0 ? (
        <>
          <div className="subtitle-sheet__loaded-state">
            <div className="subtitle-sheet__file-card">
              <span className="subtitle-sheet__file-icon" aria-hidden>
                <SubtitleFileIcon size={19} />
              </span>
              <div className="subtitle-sheet__file-copy">
                <p className="subtitle-sheet__file-name" dir="auto" title={subtitleFileName ?? undefined}>
                  {subtitleFileName ?? t('subtitles.loadedSubtitle')}
                </p>
                <span className="subtitle-sheet__loaded-status">{t('subtitles.loadedStatus')}</span>
              </div>
            </div>
            <div className="subtitle-sheet__quick-actions">
              <button type="button" className="btn btn-secondary btn-compact" aria-pressed={showSubtitleText} onClick={() => setShowSubtitleText(!showSubtitleText)}>
                {showSubtitleText ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                <span>{showSubtitleText ? t('subtitles.hideSubtitle') : t('subtitles.showSubtitle')}</span>
              </button>
              <button type="button" className="btn btn-ghost btn-compact" onClick={onImportClick}>
                <RefreshIcon size={15} />
                <span>{t('subtitles.replaceSubtitle')}</span>
              </button>
              <button type="button" className="btn btn-ghost btn-compact" onClick={onReviewContent}>
                <ZoomToSelectionIcon size={15} />
                <span>{t('contentReview.reviewContent')}</span>
              </button>
              <button type="button" className="btn btn-ghost btn-compact subtitle-sheet__action--remove" onClick={onClearCues}>
                <TrashIcon size={15} />
                <span>{t('subtitles.removeSubtitle')}</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-compact subtitle-sheet__settings"
            onClick={onOpenSubtitleSettings}
          >
            <SettingsIcon size={15} />
            <span>{t('subtitles.openSettings')}</span>
          </button>
          {contentReviewOfferVisible ? (
            <section className="subtitle-sheet__section" role="status" aria-live="polite">
              <strong>{t('contentReview.offerTitle')}</strong>
              <p className="srt-import-controls__status">
                {t('contentReview.offerCount', {
                  count: contentReviewFindings.length
                })}
              </p>
              <div className="subtitle-sheet__quick-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={reviewContentNow}
                >
                  {t('contentReview.reviewNow')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  onClick={deferContentReview}
                >
                  {t('contentReview.later')}
                </button>
              </div>
            </section>
          ) : null}
          {importStatus ? (
            <p className="srt-import-controls__status" aria-live="polite">
              {importStatus}
            </p>
          ) : null}
        </>
      ) : null}

      {!isSheet ? (
        <>
          <button type="button" className="btn btn-secondary btn-compact" onClick={onImportClick}>
            {t('subtitles.importFile')}
          </button>
          {modeFieldset}
          <p className="srt-import-controls__reveal-hint">{t('subtitles.revealHint')}</p>
          <details className="srt-import-controls__appearance">
            <summary>{t('subtitles.appearance')}</summary>
            <div className="srt-import-controls__appearance-body">
              <SubtitleAppearanceControls />
            </div>
          </details>
          <details className="srt-import-controls__advanced">
            <summary>{t('subtitles.advanced')}</summary>
            <div className="srt-import-controls__advanced-body">
              {cueCount > 0 ? (
                <SubtitleNavigationControls
                  videoRef={videoRef}
                  getCurrentTime={getCurrentTime}
                  onAfterSeek={onAfterSeek}
                />
              ) : null}
              {onSessionLoopChange ? (
                <LoopControls
                  sessionLoop={loop}
                  getCurrentTime={getCurrentTime}
                  onSetLoopStart={(time) => onSessionLoopChange({ ...loop, start: time })}
                  onSetLoopEnd={(time) => onSessionLoopChange({ ...loop, end: time })}
                  onToggleLoop={() => onSessionLoopChange({ ...loop, enabled: !loop.enabled })}
                  onClearLoop={() => onSessionLoopChange({ start: 0, end: 0, enabled: false })}
                />
              ) : null}
              {onAutoPauseAtCueEndChange ? (
                <label className="srt-import-controls__option">
                  <input
                    type="checkbox"
                    checked={autoPauseAtCueEnd}
                    onChange={() => onAutoPauseAtCueEndChange(!autoPauseAtCueEnd)}
                  />
                  <span>{t('subtitles.autoPauseAtCueEnd')}</span>
                </label>
              ) : null}
              {onToggleReviewIsolation ? (
                <label className="srt-import-controls__option">
                  <input
                    type="checkbox"
                    checked={reviewIsolation}
                    onChange={onToggleReviewIsolation}
                  />
                  <span>{t('subtitles.isolateSelectedMask')}</span>
                </label>
              ) : null}
              {onFullRevealChange ? (
                <label className="srt-import-controls__option">
                  <input
                    type="checkbox"
                    checked={fullReveal}
                    onChange={() => onFullRevealChange(!fullReveal)}
                  />
                  <span>{t('subtitles.hideAllMasks')}</span>
                </label>
              ) : null}
              <p className="srt-import-controls__hint">{t('subtitles.perCueMasksHint')}</p>
              <button
                type="button"
                className="btn btn-secondary btn-compact"
                disabled={cueCount === 0}
                onClick={onGeneratePerCueMasks}
              >
                {t('subtitles.generatePerCueMasks')}
              </button>
            </div>
          </details>
          <div className="srt-import-controls__status-block" aria-live="polite">
            {cueCount > 0 ? (
              <p className="srt-import-controls__status">
                {cueCount === 1
                  ? t('subtitles.loadedCue', { count: cueCount })
                  : t('subtitles.loadedCues', { count: cueCount })}
              </p>
            ) : (
              <p className="srt-import-controls__status srt-import-controls__status--muted">
                {t('subtitles.noCuesLoaded')}
              </p>
            )}
            {generatedMaskCount !== null ? (
              <p className="srt-import-controls__status">
                {generatedMaskCount === 1
                  ? t('subtitles.generatedMask', { count: generatedMaskCount })
                  : t('subtitles.generatedMasks', { count: generatedMaskCount })}
              </p>
            ) : subtitleMaskCount > 0 ? (
              <p className="srt-import-controls__status">
                {subtitleMaskCount === 1
                  ? t('subtitles.perCueMaskOnTrack', { count: subtitleMaskCount })
                  : t('subtitles.perCueMasksOnTrack', { count: subtitleMaskCount })}
              </p>
            ) : null}
            {importStatus ? <p className="srt-import-controls__status">{importStatus}</p> : null}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            disabled={cueCount === 0}
            onClick={onClearCues}
          >
            {t('subtitles.clearCues')}
          </button>
        </>
      ) : null}
    </div>
  )
}
