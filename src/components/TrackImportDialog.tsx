import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import Modal from './Modal'
import { type TrackManifest } from '../lib/trackManifest'
import { formatMismatchLine, type ClassifiedMismatches } from '../lib/trackMatching'

export interface TrackImportDialogProps {
  open: boolean
  manifest: TrackManifest | null
  classified: ClassifiedMismatches | null
  suggestedOffset: number | null
  onCancel: () => void
  onConfirm: (options: { applyOffset: boolean; importMeta: boolean }) => void
}

function formatLocalizedManifestSummary(manifest: TrackManifest): string[] {
  const lines: string[] = []

  if (manifest.trackTitle) {
    lines.push(manifest.trackTitle)
  }

  const itemParts: string[] = []
  if (manifest.manualMaskCount > 0) {
    itemParts.push(t('trackImport.manualMasks', { count: manifest.manualMaskCount }))
  }
  if (manifest.subtitleMaskCount > 0) {
    itemParts.push(t('trackImport.subtitleMasks', { count: manifest.subtitleMaskCount }))
  }
  if (manifest.muteCount > 0) {
    itemParts.push(t('trackImport.muteIntervals', { count: manifest.muteCount }))
  }
  if (manifest.skipCount > 0) {
    itemParts.push(t('trackImport.skipIntervals', { count: manifest.skipCount }))
  }

  if (itemParts.length > 0) {
    lines.push(itemParts.join(', '))
  } else {
    lines.push(t('trackImport.noTrackItems'))
  }

  if (manifest.groupCount > 0) {
    lines.push(t('trackImport.groups', { count: manifest.groupCount }))
  }
  if (manifest.anchorCount > 0) {
    lines.push(t('trackImport.timingAnchors', { count: manifest.anchorCount }))
  }

  return lines
}

function formatLocalizedOffsetSuggestion(offsetSeconds: number): string {
  const sign = offsetSeconds >= 0 ? '+' : ''
  return t('trackImport.suggestedOffset', { offset: `${sign}${offsetSeconds.toFixed(3)}` })
}

export default function TrackImportDialog({
  open,
  manifest,
  classified,
  suggestedOffset,
  onCancel,
  onConfirm
}: TrackImportDialogProps) {
  useLanguage()
  const [applyOffset, setApplyOffset] = useState(true)
  const [importMeta, setImportMeta] = useState(true)

  if (!manifest || !classified) {
    return null
  }

  const summaryLines = formatLocalizedManifestSummary(manifest)
  const hasSuggestedOffset = suggestedOffset !== null && suggestedOffset !== 0

  const footer = (
    <div className="track-import-dialog__footer">
      <button
        type="button"
        className="btn btn-primary btn-compact"
        onClick={() =>
          onConfirm({
            applyOffset: hasSuggestedOffset && applyOffset,
            importMeta
          })
        }
      >
        {hasSuggestedOffset && applyOffset
          ? t('trackImport.loadWithOffset')
          : t('track.loadTrack')}
      </button>
      <button type="button" className="btn btn-ghost btn-compact" onClick={onCancel}>
        {t('common.cancel')}
      </button>
    </div>
  )

  return (
    <Modal open={open} title={t('track.loadTrack')} onClose={onCancel} footer={footer}>
      <div className="track-import-dialog">
        <section className="track-import-dialog__section">
          <h3 className="track-import-dialog__heading">{t('trackImport.contents')}</h3>
          <ul className="track-import-dialog__list">
            {summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {manifest.appVersion ? (
            <p className="track-import-dialog__meta">
              {manifest.schemaVersion
                ? t('trackImport.savedWithSchema', {
                    version: manifest.appVersion,
                    schema: manifest.schemaVersion
                  })
                : t('trackImport.savedWith', { version: manifest.appVersion })}
            </p>
          ) : null}
        </section>

        {classified.hard.length + classified.soft.length + classified.info.length > 0 ? (
          <section className="track-import-dialog__section">
            <h3 className="track-import-dialog__heading">{t('trackImport.mediaComparison')}</h3>
            {classified.hard.length > 0 ? (
              <div className="track-import-dialog__tier track-import-dialog__tier--hard">
                <strong>{t('trackImport.critical')}</strong>
                <ul className="track-import-dialog__list">
                  {classified.hard.map((m) => (
                    <li key={m.field}>{formatMismatchLine(m)}</li>
                  ))}
                </ul>
                <p className="track-import-dialog__warn">{t('trackImport.criticalWarning')}</p>
              </div>
            ) : null}
            {classified.soft.length > 0 ? (
              <div className="track-import-dialog__tier track-import-dialog__tier--soft">
                <strong>{t('trackImport.minorDifferences')}</strong>
                <ul className="track-import-dialog__list">
                  {classified.soft.map((m) => (
                    <li key={m.field}>{formatMismatchLine(m)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {classified.info.length > 0 ? (
              <div className="track-import-dialog__tier track-import-dialog__tier--info">
                <strong>{t('trackImport.info')}</strong>
                <ul className="track-import-dialog__list">
                  {classified.info.map((m) => (
                    <li key={m.field}>{formatMismatchLine(m)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="track-import-dialog__ok">{t('trackImport.metadataMatches')}</p>
        )}

        {hasSuggestedOffset ? (
          <section className="track-import-dialog__section">
            <p>{formatLocalizedOffsetSuggestion(suggestedOffset)}</p>
            <label className="track-import-dialog__check">
              <input
                type="checkbox"
                checked={applyOffset}
                onChange={(event) => setApplyOffset(event.target.checked)}
              />
              <span>{t('trackImport.applySuggestedOffset')}</span>
            </label>
          </section>
        ) : null}

        <section className="track-import-dialog__section">
          <label className="track-import-dialog__check">
            <input
              type="checkbox"
              checked={importMeta}
              onChange={(event) => setImportMeta(event.target.checked)}
            />
            <span>{t('trackImport.importGroupsMeta')}</span>
          </label>
        </section>
      </div>
    </Modal>
  )
}
