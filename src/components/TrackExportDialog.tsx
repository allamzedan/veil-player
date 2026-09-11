import { useMemo } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { runAppMenuAction } from '../lib/appMenuBridge'
import { openSidebarPanel } from '../lib/sidebarPanelBridge'
import {
  buildTrackExportSnapshot,
  copyTextToClipboard,
  formatEstimatedFileSize,
  formatTrackExportSummary
} from '../lib/trackExport'
import { formatTagsForInput } from '../lib/trackMetadataValidation'
import { t } from '../i18n'
import { pushErrorToast, pushSuccessToast } from '../state/useToastStore'
import Modal from './Modal'

interface TrackExportDialogProps {
  open: boolean
  onClose: () => void
}

export default function TrackExportDialog({ open, onClose }: TrackExportDialogProps) {
  useLanguage()

  const snapshot = useMemo(() => (open ? buildTrackExportSnapshot() : null), [open])

  const canExport = Boolean(snapshot?.track && snapshot.json)

  const onSaveAs = (): void => {
    onClose()
    runAppMenuAction('saveTrackAs')
  }

  const onEditTrackInfo = (): void => {
    onClose()
    openSidebarPanel('track-info')
  }

  const onCopyJson = (): void => {
    if (!snapshot?.json) {
      return
    }
    void copyTextToClipboard(snapshot.json).then((ok) => {
      if (ok) {
        pushSuccessToast(t('export.jsonCopied'))
      } else {
        pushErrorToast(t('toast.couldNotSaveTrack'))
      }
    })
  }

  const onCopySummary = (): void => {
    if (!snapshot?.track) {
      return
    }
    const text = formatTrackExportSummary(snapshot.track, snapshot.title)
    void copyTextToClipboard(text).then((ok) => {
      if (ok) {
        pushSuccessToast(t('export.summaryCopied'))
      } else {
        pushErrorToast(t('toast.couldNotSaveTrack'))
      }
    })
  }

  return (
    <Modal
      open={open}
      title={t('export.title')}
      onClose={onClose}
      panelClassName="modal__panel modal__panel--track-export"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onEditTrackInfo}>
            {t('export.editTrackInfo')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCopySummary} disabled={!canExport}>
            {t('export.copySummary')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCopyJson} disabled={!canExport}>
            {t('export.copyJson')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onSaveAs} disabled={!canExport}>
            {t('export.saveAs')}
          </button>
        </>
      }
    >
      {snapshot ? (
        <div className="track-export-dialog">
          <section className="track-export-dialog__section">
            <h3 className="track-export-dialog__heading">{t('export.trackSummary')}</h3>
            <dl className="track-export-dialog__meta">
              <div className="track-export-dialog__row">
                <dt>{t('trackInfo.titleField')}</dt>
                <dd>{snapshot.title}</dd>
              </div>
              {snapshot.description ? (
                <div className="track-export-dialog__row">
                  <dt>{t('trackInfo.description')}</dt>
                  <dd>{snapshot.description}</dd>
                </div>
              ) : null}
              {snapshot.author ? (
                <div className="track-export-dialog__row">
                  <dt>{t('trackInfo.author')}</dt>
                  <dd>{snapshot.author}</dd>
                </div>
              ) : null}
              {snapshot.tags.length > 0 ? (
                <div className="track-export-dialog__row">
                  <dt>{t('trackInfo.tags')}</dt>
                  <dd>{formatTagsForInput(snapshot.tags)}</dd>
                </div>
              ) : null}
              <div className="track-export-dialog__row">
                <dt>{t('export.actionsSummaryLabel')}</dt>
                <dd className="ltr-digits">
                  {t('export.actionsSummary', {
                    masks: snapshot.maskCount,
                    mutes: snapshot.muteCount,
                    skips: snapshot.skipCount
                  })}
                </dd>
              </div>
              {snapshot.estimatedBytes !== null ? (
                <div className="track-export-dialog__row">
                  <dt>{t('export.estimatedSize')}</dt>
                  <dd className="ltr-digits">{formatEstimatedFileSize(snapshot.estimatedBytes)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="track-export-dialog__section">
            <h3 className="track-export-dialog__heading">{t('export.compatibility')}</h3>
            <ul className="track-export-dialog__compat-list">
              <li>
                <span className="track-export-dialog__compat-ok" aria-hidden>
                  ✓
                </span>
                {t('export.desktopCompatible')}
              </li>
              <li>
                <span
                  className={
                    snapshot.mobileCompatible
                      ? 'track-export-dialog__compat-ok'
                      : 'track-export-dialog__compat-muted'
                  }
                  aria-hidden
                >
                  {snapshot.mobileCompatible ? '✓' : '–'}
                </span>
                {t('export.mobileCompatible')}
              </li>
              <li>
                <span className="track-export-dialog__compat-muted" aria-hidden>
                  •
                </span>
                {snapshot.isUnbound ? t('export.unboundTrack') : t('export.videoBinding')}
                {!snapshot.isUnbound && snapshot.hasFingerprint
                  ? ` · ${t('export.fingerprintPresent')}`
                  : null}
              </li>
            </ul>
            <p className="track-export-dialog__note">{t('export.mismatchNote')}</p>
          </section>

          {!canExport ? <p className="track-export-dialog__warning">{t('export.noVideo')}</p> : null}
        </div>
      ) : null}
    </Modal>
  )
}
