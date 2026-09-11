import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { t } from '../i18n'
import {
  CONTENT_REVIEW_CATEGORIES,
  hasContentReviewActionDelta,
  type ContentReviewAppliedActionMap,
  type ContentReviewAppliedActionUpdates,
  type ContentReviewCategory,
  type ContentReviewDecision,
  type ContentReviewDecisionMap,
  type ContentReviewFinding
} from '../lib/contentReview'
import {
  contentReviewPreviewReducer,
  getContentReviewPreviewWindow,
  getDisplayedContentReviewContext,
  hasContentReviewPreviewReachedEnd,
  isContentReviewFindingPreviewActive,
  type ActiveContentReviewPreview
} from '../lib/contentReviewPreview'
import { formatSecondsToHMS } from '../lib/time'
import { useContentReviewSessionStore } from '../state/useContentReviewSessionStore'
import Modal from './Modal'
import {
  MaskIcon,
  MuteIcon,
  PlayIcon,
  PowerIcon,
  SkipIcon,
  StopIcon,
  VolumeHighIcon,
  ZoomToSelectionIcon
} from './icons'

export type ContentReviewFilter = 'all' | ContentReviewCategory

interface ContentReviewDialogProps {
  onPreview: (time: number) => void
  onStopPreview: () => void
  onReviewSessionOpen: () => void
  onReviewSessionExit: () => void
  videoRef: RefObject<HTMLVideoElement | null>
  previewMode: 'local-video' | 'audio' | 'youtube'
  playbackTime: number
  onApply: (
    findings: readonly ContentReviewFinding[],
    decisions: ContentReviewDecisionMap,
    appliedActions: ContentReviewAppliedActionMap
  ) => ContentReviewAppliedActionUpdates | null
}

type VisibleContentReviewDecision = Exclude<ContentReviewDecision, 'unreviewed'>

const VISIBLE_DECISIONS: readonly VisibleContentReviewDecision[] = ['ignore', 'mute', 'skip']

const CATEGORY_LABEL_KEYS: Record<ContentReviewCategory, string> = {
  profanity: 'contentReview.category.profanity',
  sexualLanguage: 'contentReview.category.sexualLanguage',
  violenceRelatedLanguage: 'contentReview.category.violenceRelatedLanguage',
  drugsSubstances: 'contentReview.category.drugsSubstances',
  otherConfiguredTerms: 'contentReview.category.otherConfiguredTerms'
}

const CATEGORY_SYMBOLS: Record<ContentReviewCategory, string> = {
  profanity: '#',
  sexualLanguage: '◇',
  violenceRelatedLanguage: '!',
  drugsSubstances: '✚',
  otherConfiguredTerms: '…'
}

const DECISION_LABEL_KEYS: Record<VisibleContentReviewDecision, string> = {
  ignore: 'contentReview.action.ignore',
  mute: 'contentReview.action.mute',
  skip: 'contentReview.action.skip'
}

const DECISION_DESCRIPTION_KEYS: Record<VisibleContentReviewDecision, string> = {
  ignore: 'contentReview.action.ignoreDescription',
  mute: 'contentReview.action.muteDescription',
  skip: 'contentReview.action.skipDescription'
}

interface ContentReviewVisibleStatus {
  decision: VisibleContentReviewDecision
  applied: boolean
  labelKey: string
}

function getContentReviewVisibleStatus(
  decision: ContentReviewDecision,
  applied: ContentReviewAppliedActionMap[string] | undefined
): ContentReviewVisibleStatus | null {
  if (decision === 'ignore') {
    return { decision, applied: false, labelKey: 'contentReview.status.ignoreSelected' }
  }
  if (decision === 'mute' || decision === 'skip') {
    const isApplied = applied?.type === decision
    return {
      decision,
      applied: isApplied,
      labelKey: isApplied
        ? `contentReview.status.${decision}Applied`
        : `contentReview.status.${decision}Selected`
    }
  }
  if (applied) {
    return {
      decision: applied.type,
      applied: true,
      labelKey: `contentReview.status.${applied.type}Applied`
    }
  }
  return null
}

export function filterContentReviewFindings(
  findings: readonly ContentReviewFinding[],
  filter: ContentReviewFilter
): ContentReviewFinding[] {
  return filter === 'all'
    ? [...findings]
    : findings.filter((finding) => finding.category === filter)
}

export function getNextContentReviewFilter(
  current: ContentReviewFilter,
  clicked: ContentReviewFilter
): ContentReviewFilter {
  return clicked === 'all' ? 'all' : current === clicked ? 'all' : clicked
}

export function formatContentReviewRange(finding: ContentReviewFinding): string {
  return `${formatSecondsToHMS(finding.start)} – ${formatSecondsToHMS(finding.end)}`
}

export default function ContentReviewDialog({
  onPreview,
  onStopPreview,
  onReviewSessionOpen,
  onReviewSessionExit,
  onApply,
  videoRef,
  previewMode,
  playbackTime
}: ContentReviewDialogProps) {
  const [filter, setFilter] = useState<ContentReviewFilter>('all')
  const [previewFrameReady, setPreviewFrameReady] = useState(false)
  const [activePreview, setActivePreview] = useState<ActiveContentReviewPreview | null>(null)
  const activePreviewRef = useRef<ActiveContentReviewPreview | null>(null)
  const reviewSessionOpenRef = useRef(false)
  const applyGuardRef = useRef(false)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const {
    findings,
    reviewRequested,
    decisions,
    appliedActions,
    selectedFindingId,
    checkedFindingIds,
    closeReview,
    setSelectedFinding,
    toggleFindingChecked,
    selectFindings,
    clearSelection,
    setFindingDecision,
    commitAppliedActionUpdates,
    reconcileAppliedActions
  } = useContentReviewSessionStore()

  const categoryCounts = useMemo(() => {
    const counts = new Map<ContentReviewCategory, number>()
    findings.forEach((finding) => counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1))
    return counts
  }, [findings])

  const visibleFindings = useMemo(
    () => filterContentReviewFindings(findings, filter),
    [filter, findings]
  )
  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId) ?? null
  const visibleCheckedIds = visibleFindings
    .filter((finding) => checkedFindingIds.includes(finding.id))
    .map((finding) => finding.id)
  const hasActionableDelta = hasContentReviewActionDelta(findings, decisions, appliedActions)

  const updateActivePreview = useCallback((nextPreview: ActiveContentReviewPreview | null): void => {
    activePreviewRef.current = nextPreview
    setActivePreview(nextPreview)
  }, [])

  const stopContentReviewPreview = useCallback((): void => {
    if (!activePreviewRef.current) return
    onStopPreview()
    updateActivePreview(contentReviewPreviewReducer(activePreviewRef.current, { type: 'stop' }))
  }, [onStopPreview, updateActivePreview])

  const toggleFindingPreview = useCallback((finding: ContentReviewFinding): void => {
    if (isContentReviewFindingPreviewActive(activePreviewRef.current, finding.id)) {
      stopContentReviewPreview()
      return
    }

    if (activePreviewRef.current) {
      onStopPreview()
    }
    const previewWindow = getContentReviewPreviewWindow(finding)
    updateActivePreview(contentReviewPreviewReducer(activePreviewRef.current, {
      type: 'play',
      findingId: finding.id,
      previewEnd: previewWindow.end
    }))
    onPreview(previewWindow.start)
  }, [onPreview, onStopPreview, stopContentReviewPreview, updateActivePreview])

  const closeDialog = useCallback((): void => {
    stopContentReviewPreview()
    onReviewSessionExit()
    closeReview()
  }, [closeReview, onReviewSessionExit, stopContentReviewPreview])

  useEffect(() => {
    const isOpen = reviewRequested && findings.length > 0
    if (isOpen && !reviewSessionOpenRef.current) {
      reviewSessionOpenRef.current = true
      onReviewSessionOpen()
      return
    }
    if (!isOpen) {
      reviewSessionOpenRef.current = false
    }
  }, [findings.length, onReviewSessionOpen, reviewRequested])

  useEffect(() => {
    if (reviewRequested && findings.length > 0 && !selectedFinding) {
      setSelectedFinding(findings[0].id)
    }
  }, [findings, reviewRequested, selectedFinding, setSelectedFinding])

  useEffect(() => {
    if (reviewRequested) {
      reconcileAppliedActions()
      applyGuardRef.current = false
    }
  }, [reconcileAppliedActions, reviewRequested])

  useEffect(() => {
    if (!hasContentReviewPreviewReachedEnd(activePreview, playbackTime)) return
    onStopPreview()
    updateActivePreview(contentReviewPreviewReducer(activePreview, {
      type: 'time',
      currentTime: playbackTime
    }))
  }, [activePreview, onStopPreview, playbackTime, updateActivePreview])

  useEffect(() => {
    if (!reviewRequested) {
      stopContentReviewPreview()
    }
  }, [reviewRequested, stopContentReviewPreview])

  useEffect(() => {
    return () => {
      if (activePreviewRef.current) {
        onStopPreview()
        activePreviewRef.current = null
      }
    }
  }, [onStopPreview])

  useEffect(() => {
    if (!reviewRequested || findings.length === 0 || previewMode !== 'local-video') {
      setPreviewFrameReady(false)
      return
    }

    let animationFrame = 0
    let cancelled = false
    const drawPreviewFrame = (): void => {
      if (cancelled) return
      const video = videoRef.current
      const canvas = previewCanvasRef.current
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          const width = 480
          const height = Math.max(1, Math.round(width * video.videoHeight / video.videoWidth))
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width
            canvas.height = height
          }
          const context = canvas.getContext('2d')
          if (context) {
            context.drawImage(video, 0, 0, width, height)
            setPreviewFrameReady(true)
          }
        } catch {
          setPreviewFrameReady(false)
        }
      }
      animationFrame = requestAnimationFrame(drawPreviewFrame)
    }

    animationFrame = requestAnimationFrame(drawPreviewFrame)
    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrame)
    }
  }, [findings.length, previewMode, reviewRequested, videoRef])

  const assignVisibleChecked = (decision: Exclude<ContentReviewDecision, 'unreviewed'>): void => {
    visibleCheckedIds.forEach((findingId) => setFindingDecision(findingId, decision))
  }

  const applyToVeil = (): void => {
    if (!hasActionableDelta || applyGuardRef.current) return
    applyGuardRef.current = true
    const updates = onApply(findings, decisions, appliedActions)
    if (!updates) {
      applyGuardRef.current = false
      return
    }
    commitAppliedActionUpdates(updates)
    closeDialog()
  }

  return (
    <Modal
      open={reviewRequested && findings.length > 0}
      title={t('contentReview.dialogTitle')}
      titleIcon={<ZoomToSelectionIcon size={19} className="content-review-dialog__title-icon" />}
      titleContent={(
        <span className="content-review-dialog__header-copy">
          <span>{t('contentReview.dialogTitle')}</span>
          <small>{t('contentReview.dialogIntro')}</small>
        </span>
      )}
      onClose={closeDialog}
      closeOnBackdrop={false}
      panelClassName="modal__panel--content-review"
      mountToDocument
      footer={(
        <>
          <button type="button" className="btn btn-secondary btn-compact" onClick={closeDialog}>
            {t('common.close')}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-compact"
            disabled={!hasActionableDelta}
            onClick={applyToVeil}
          >
            {t('contentReview.applyToVeil')}
          </button>
        </>
      )}
    >
      <div className="content-review-dialog">
        <div className="content-review-dialog__summary" aria-label={t('contentReview.filterByCategory')}>
          {CONTENT_REVIEW_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`content-review-dialog__summary-item content-review-dialog__summary-item--${category}${filter === category ? ' content-review-dialog__summary-item--active' : ''}`}
              aria-pressed={filter === category}
              onClick={() => setFilter((current) => getNextContentReviewFilter(current, category))}
            >
              <span className="content-review-dialog__summary-icon" aria-hidden>{CATEGORY_SYMBOLS[category]}</span>
              <span className="content-review-dialog__summary-label">{t(CATEGORY_LABEL_KEYS[category])}</span>
              <strong>{categoryCounts.get(category) ?? 0}</strong>
            </button>
          ))}
          <button
            type="button"
            className={`content-review-dialog__summary-total${filter === 'all' ? ' content-review-dialog__summary-total--active' : ''}`}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            <span>{t('contentReview.totalFindings')}</span>
            <strong>{findings.length}</strong>
          </button>
        </div>

        <div className="content-review-dialog__workspace">
          <section className="content-review-dialog__findings" aria-label={t('contentReview.findings')}>
            <div className="content-review-dialog__batch-toolbar">
              <button type="button" className="btn btn-secondary btn-compact" onClick={() => selectFindings(visibleFindings.map((finding) => finding.id))}>
                {t('contentReview.selectAllVisible')}
              </button>
              <button type="button" className="btn btn-secondary btn-compact" disabled={checkedFindingIds.length === 0} onClick={clearSelection}>
                {t('contentReview.clearSelection')}
              </button>
              <span>{t('contentReview.selectedCount', { count: checkedFindingIds.length })}</span>
            </div>

            <div className="content-review-dialog__list">
              {visibleFindings.map((finding) => {
                const decision = decisions[finding.id] ?? 'unreviewed'
                const status = getContentReviewVisibleStatus(decision, appliedActions[finding.id])
                const isSelected = finding.id === selectedFindingId
                const isPreviewActive = isContentReviewFindingPreviewActive(activePreview, finding.id)
                return (
                  <article
                    key={finding.id}
                    className={`content-review-dialog__row${isSelected ? ' content-review-dialog__row--selected' : ''}`}
                    onClick={() => setSelectedFinding(finding.id)}
                  >
                    <input
                      type="checkbox"
                      checked={checkedFindingIds.includes(finding.id)}
                      aria-label={t('contentReview.selectFinding')}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleFindingChecked(finding.id)}
                    />
                    <div className="content-review-dialog__row-main">
                      <div className="content-review-dialog__row-meta">
                        <span className="content-review-dialog__range ltr-digits" dir="ltr">
                          {formatContentReviewRange(finding)}
                        </span>
                        <span className="content-review-dialog__category">{t(CATEGORY_LABEL_KEYS[finding.category])}</span>
                      </div>
                      <span className="content-review-dialog__preview-text" dir="auto">{finding.cueText}</span>
                    </div>
                    <div className="content-review-dialog__row-actions">
                      {status ? (
                        <span className={`content-review-dialog__status content-review-dialog__status--${status.decision}${status.applied ? ' content-review-dialog__status--applied' : ''}`}>
                          {status.decision === 'mute' ? <MuteIcon size={13} /> : status.decision === 'skip' ? <SkipIcon size={13} /> : <PowerIcon size={13} />}
                          <span>{t(status.labelKey)}</span>
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={`btn btn-secondary btn-icon content-review-dialog__preview-button${isPreviewActive ? ' content-review-dialog__preview-button--active' : ''}`}
                        aria-label={t(isPreviewActive ? 'contentReview.stopPreview' : 'contentReview.preview')}
                        title={t(isPreviewActive ? 'contentReview.stopPreview' : 'contentReview.preview')}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleFindingPreview(finding)
                        }}
                      >
                        {isPreviewActive ? <StopIcon size={13} /> : <PlayIcon size={13} />}
                        <span className="sr-only">
                          {t(isPreviewActive ? 'contentReview.stopPreview' : 'contentReview.preview')}
                        </span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="content-review-dialog__batch-actions">
              <button type="button" className="btn btn-secondary btn-compact" disabled={visibleCheckedIds.length === 0} onClick={() => assignVisibleChecked('ignore')}>
                {t('contentReview.ignoreSelected')}
              </button>
              <button type="button" className="btn btn-secondary btn-compact content-review-dialog__batch-action--mute" disabled={visibleCheckedIds.length === 0} onClick={() => assignVisibleChecked('mute')}>
                {t('contentReview.muteSelected')}
              </button>
              <button type="button" className="btn btn-secondary btn-compact content-review-dialog__batch-action--skip" disabled={visibleCheckedIds.length === 0} onClick={() => assignVisibleChecked('skip')}>
                {t('contentReview.skipSelected')}
              </button>
            </div>
            <p className="content-review-dialog__advisory">{t('contentReview.advisory')}</p>
          </section>

          <section className="content-review-dialog__details" aria-label={t('contentReview.findingDetails')}>
            {selectedFinding ? (
              <>
                <div className="content-review-dialog__details-main">
                  <div className={`content-review-dialog__media-preview content-review-dialog__media-preview--${previewMode}`}>
                  {previewMode === 'local-video' ? (
                    <>
                      <canvas ref={previewCanvasRef} className="content-review-dialog__preview-canvas" aria-label={t('contentReview.videoPreview')} />
                      {!previewFrameReady ? <span className="content-review-dialog__preview-placeholder">{t('contentReview.previewWaiting')}</span> : null}
                    </>
                  ) : previewMode === 'audio' ? (
                    <div className="content-review-dialog__nonvideo-preview">
                      <VolumeHighIcon size={18} />
                      <span>{t('contentReview.audioPreview')}</span>
                      <span className="ltr-digits" dir="ltr">{formatSecondsToHMS(playbackTime)}</span>
                    </div>
                  ) : (
                    <div className="content-review-dialog__nonvideo-preview">
                      <PlayIcon size={18} />
                      <span>{t('contentReview.youtubePreview')}</span>
                    </div>
                  )}
                </div>
                <h3>{t('contentReview.context')}</h3>
                <div className={`content-review-dialog__context content-review-dialog__context--${selectedFinding.category}`}>
                  {getDisplayedContentReviewContext(selectedFinding).map((cue, index) => (
                    <div key={`${cue.start}-${cue.end}-${index}`} className={`content-review-dialog__context-cue${cue.current ? ' content-review-dialog__context-cue--current' : ''}`}>
                      <span className="content-review-dialog__range ltr-digits" dir="ltr">
                        {formatSecondsToHMS(cue.start)} – {formatSecondsToHMS(cue.end)}
                      </span>
                      <span dir="auto">{cue.text}</span>
                    </div>
                  ))}
                </div>
                <fieldset className="content-review-dialog__decision-control">
                  <legend>{t('contentReview.chooseAction')}</legend>
                  <div className="content-review-dialog__action-grid">
                    {VISIBLE_DECISIONS.map((decision) => {
                      const selected = decisions[selectedFinding.id] === decision
                      const ActionIcon = decision === 'ignore' ? PowerIcon : decision === 'mute' ? MuteIcon : SkipIcon
                      return (
                        <button
                          key={decision}
                          type="button"
                          className={`content-review-dialog__action-card content-review-dialog__action-card--${decision}${selected ? ' content-review-dialog__action-card--active' : ''}`}
                          aria-pressed={selected}
                          onClick={() => setFindingDecision(selectedFinding.id, decision)}
                        >
                          <span className="content-review-dialog__action-icon"><ActionIcon size={20} /></span>
                          <span className="content-review-dialog__action-copy">
                            <strong>{t(DECISION_LABEL_KEYS[decision])}</strong>
                            <small>{t(DECISION_DESCRIPTION_KEYS[decision])}</small>
                          </span>
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className="content-review-dialog__action-card content-review-dialog__action-card--mask"
                      disabled
                      title={t('contentReview.action.maskUnavailable')}
                    >
                      <span className="content-review-dialog__action-icon"><MaskIcon size={20} /></span>
                      <span className="content-review-dialog__action-copy">
                        <strong>{t('contentReview.action.mask')}</strong>
                        <small>{t('contentReview.action.maskDescription')}</small>
                      </span>
                    </button>
                  </div>
                </fieldset>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </Modal>
  )
}
