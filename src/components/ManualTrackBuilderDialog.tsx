import { useCallback, useEffect, useState } from 'react'
import veilLogo from '../assets/veil-logo.png'
import Modal from './Modal'
import { useTrackFileActions } from '../hooks/useTrackFileActions'
import {
  createEmptyManualTrackBuilderRow,
  MANUAL_TRACK_BUILDER_TIME_PLACEHOLDER,
  MANUAL_TRACK_BUILDER_TIME_STEP_SECONDS,
  incrementManualTrackBuilderTimestamp,
  normalizeManualTrackBuilderTimestamp,
  normalizeManualTrackBuilderRows,
  parseManualTrackRows,
  type ManualTrackBuilderRow,
  type ManualTrackBuilderRowErrors,
  type ManualTrackItemType
} from '../lib/manualTrackBuilder'
import { useVeilStore } from '../state/useVeilStore'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { pushErrorToast, pushSuccessToast } from '../state/useToastStore'

interface ManualTrackBuilderDialogProps {
  open: boolean
  hasVideo: boolean
  videoDuration: number | null
  onClose: () => void
  onImported?: () => void
}

function typeOptions(): { value: ManualTrackItemType; label: string }[] {
  return [
    { value: 'mask', label: t('manualTrackBuilder.typeMask') },
    { value: 'mute', label: t('manualTrackBuilder.typeMute') },
    { value: 'skip', label: t('manualTrackBuilder.typeSkip') }
  ]
}

function hasRowErrors(errors: ManualTrackBuilderRowErrors | undefined): boolean {
  return errors !== undefined && Object.keys(errors).length > 0
}

interface TypeSegmentedControlProps {
  value: ManualTrackItemType
  rowIndex: number
  disabled?: boolean
  invalid?: boolean
  onChange: (type: ManualTrackItemType) => void
}

function TypeSegmentedControl({
  value,
  rowIndex,
  disabled = false,
  invalid = false,
  onChange
}: TypeSegmentedControlProps) {
  return (
    <div
      className={`manual-track-builder__type${invalid ? ' manual-track-builder__type--invalid' : ''}`}
      role="group"
      aria-label={t('manualTrackBuilder.rowTypeAria', { index: rowIndex + 1 })}
    >
      {typeOptions().map((option) => (
        <button
          key={option.value}
          type="button"
          className={`manual-track-builder__type-btn manual-track-builder__type-btn--${option.value}${value === option.value ? ' manual-track-builder__type-btn--active' : ''}`}
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function ManualTrackBuilderDialog({
  open,
  hasVideo,
  videoDuration,
  onClose,
  onImported
}: ManualTrackBuilderDialogProps) {
  useLanguage()
  const importManualBuilderBatch = useVeilStore((state) => state.importManualBuilderBatch)
  const { saveManualBuilderTrack } = useTrackFileActions()

  const [rows, setRows] = useState<ManualTrackBuilderRow[]>(() => [
    createEmptyManualTrackBuilderRow()
  ])
  const [rowErrors, setRowErrors] = useState<Record<string, ManualTrackBuilderRowErrors>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const parseOptions = {
    videoDuration,
    validateVideoDuration: hasVideo
  }

  const resetForm = useCallback((): void => {
    setRows([createEmptyManualTrackBuilderRow()])
    setRowErrors({})
    setFormError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    resetForm()
  }, [open, resetForm])

  const updateRow = (
    rowId: string,
    patch: Partial<Pick<ManualTrackBuilderRow, 'start' | 'end' | 'type' | 'label'>>
  ): void => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    )
    setRowErrors((current) => {
      if (!(rowId in current)) {
        return current
      }
      const next = { ...current }
      delete next[rowId]
      return next
    })
    setFormError(null)
  }

  const addRow = (): void => {
    setRows((current) => [...current, createEmptyManualTrackBuilderRow()])
    setFormError(null)
  }

  const removeRow = (rowId: string): void => {
    setRows((current) => {
      if (current.length <= 1) {
        return [createEmptyManualTrackBuilderRow()]
      }
      return current.filter((row) => row.id !== rowId)
    })
    setRowErrors((current) => {
      if (!(rowId in current)) {
        return current
      }
      const next = { ...current }
      delete next[rowId]
      return next
    })
    setFormError(null)
  }

  const normalizeRowTimeField = (
    rowId: string,
    field: 'start' | 'end',
    value: string
  ): void => {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }

    const normalized = normalizeManualTrackBuilderTimestamp(trimmed)
    if (normalized !== null) updateRow(rowId, { [field]: normalized })
  }

  const incrementRowTimeField = (
    rowId: string,
    field: 'start' | 'end',
    value: string,
    direction: -1 | 1
  ): void => {
    updateRow(rowId, {
      [field]: incrementManualTrackBuilderTimestamp(
        value,
        direction * MANUAL_TRACK_BUILDER_TIME_STEP_SECONDS
      )
    })
  }

  const runValidatedImport = (): ReturnType<typeof parseManualTrackRows> => {
    const normalizedRows = normalizeManualTrackBuilderRows(rows)
    setRows(normalizedRows)

    const result = parseManualTrackRows(normalizedRows, parseOptions)
    if (!result.ok) {
      setRowErrors(result.rowErrors)
      setFormError(t('manualTrackBuilder.formError'))
    }
    return result
  }

  const importIntoTrack = (): void => {
    const result = runValidatedImport()
    if (!result.ok) {
      return
    }

    const { batch } = result
    const totalCount = batch.masks.length + batch.mutes.length + batch.skips.length
    importManualBuilderBatch(batch, { replace: !hasVideo })
    onImported?.()

    if (!hasVideo) {
      pushSuccessToast(t('toast.importedDraft', { count: totalCount }))
    } else if (batch.masks.length > 0) {
      pushSuccessToast(t('toast.importedWithMasks', { count: totalCount }))
    } else {
      pushSuccessToast(t('toast.importedItems', { count: totalCount }))
    }

    onClose()
  }

  const saveTrackFile = (): void => {
    const result = runValidatedImport()
    if (!result.ok) {
      return
    }

    void saveManualBuilderTrack(result.batch).then((saveResult) => {
      if (saveResult === 'saved') {
        onClose()
      } else if (saveResult === 'failed') {
        pushErrorToast(t('toast.couldNotSaveTrack'))
      }
    })
  }

  const footer = (
    <div className="manual-track-builder__footer">
      <button type="button" className="btn btn-ghost btn-compact" onClick={resetForm}>
        {t('manualTrackBuilder.clearForm')}
      </button>
      <button type="button" className="btn btn-ghost btn-compact" onClick={onClose}>
        {t('common.cancel')}
      </button>
      <button type="button" className="btn btn-secondary btn-compact" onClick={importIntoTrack}>
        {t('manualTrackBuilder.importIntoTrack')}
      </button>
      <button type="button" className="btn btn-primary btn-compact" onClick={saveTrackFile}>
        {t('manualTrackBuilder.saveTrackFile')}
      </button>
    </div>
  )

  return (
    <Modal
      open={open}
      title={t('manualTrackBuilder.title')}
      titleIcon={<img src={veilLogo} alt="" className="manual-track-builder__title-icon" />}
      onClose={onClose}
      footer={footer}
      panelClassName="modal__panel--manual-track-builder"
    >
      <div className="manual-track-builder">
        <p className="manual-track-builder__intro">
          {t('manualTrackBuilder.intro')}
        </p>
        <hr className="manual-track-builder__divider" />
        {formError ? <p className="manual-track-builder__form-error">{formError}</p> : null}

        <div className="manual-track-builder__table-wrap">
          <table className="manual-track-builder__table">
            <colgroup>
              <col className="manual-track-builder__col-start" />
              <col className="manual-track-builder__col-end" />
              <col className="manual-track-builder__col-type" />
              <col className="manual-track-builder__col-label" />
              <col className="manual-track-builder__col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{t('manualTrackBuilder.start')}</th>
                <th scope="col">{t('manualTrackBuilder.end')}</th>
                <th scope="col">{t('manualTrackBuilder.type')}</th>
                <th scope="col">{t('manualTrackBuilder.label')}</th>
                <th scope="col">
                  <span className="sr-only">{t('manualTrackBuilder.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const errors = rowErrors[row.id]
                const rowInvalid = hasRowErrors(errors)

                return (
                  <tr
                    key={row.id}
                    className={rowInvalid ? 'manual-track-builder__row--invalid' : undefined}
                  >
                    <td>
                      <input
                        type="text"
                        className="manual-track-builder__input ltr-digits"
                        value={row.start}
                        placeholder={MANUAL_TRACK_BUILDER_TIME_PLACEHOLDER}
                        aria-label={`Row ${index + 1} start`}
                        aria-invalid={Boolean(errors?.start)}
                        onChange={(event) =>
                          updateRow(row.id, { start: event.target.value })
                        }
                        onBlur={(event) =>
                          normalizeRowTimeField(row.id, 'start', event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                          event.preventDefault()
                          incrementRowTimeField(row.id, 'start', event.currentTarget.value, event.key === 'ArrowUp' ? 1 : -1)
                        }}
                        onWheel={(event) => {
                          if (document.activeElement !== event.currentTarget) return
                          event.preventDefault()
                          incrementRowTimeField(row.id, 'start', event.currentTarget.value, event.deltaY < 0 ? 1 : -1)
                        }}
                      />
                      {errors?.start ? (
                        <span className="manual-track-builder__cell-error">{errors.start}</span>
                      ) : null}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="manual-track-builder__input ltr-digits"
                        value={row.end}
                        placeholder={MANUAL_TRACK_BUILDER_TIME_PLACEHOLDER}
                        aria-label={`Row ${index + 1} end`}
                        aria-invalid={Boolean(errors?.end)}
                        onChange={(event) => updateRow(row.id, { end: event.target.value })}
                        onBlur={(event) =>
                          normalizeRowTimeField(row.id, 'end', event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                          event.preventDefault()
                          incrementRowTimeField(row.id, 'end', event.currentTarget.value, event.key === 'ArrowUp' ? 1 : -1)
                        }}
                        onWheel={(event) => {
                          if (document.activeElement !== event.currentTarget) return
                          event.preventDefault()
                          incrementRowTimeField(row.id, 'end', event.currentTarget.value, event.deltaY < 0 ? 1 : -1)
                        }}
                      />
                      {errors?.end ? (
                        <span className="manual-track-builder__cell-error">{errors.end}</span>
                      ) : null}
                    </td>
                    <td>
                      <TypeSegmentedControl
                        value={row.type === '' ? 'mask' : row.type}
                        rowIndex={index}
                        invalid={Boolean(errors?.type)}
                        onChange={(type) => updateRow(row.id, { type })}
                      />
                      {errors?.type ? (
                        <span className="manual-track-builder__cell-error">{errors.type}</span>
                      ) : null}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="manual-track-builder__input"
                        value={row.label}
                        placeholder={t('common.optional')}
                        aria-label={`Row ${index + 1} label`}
                        onChange={(event) => updateRow(row.id, { label: event.target.value })}
                      />
                    </td>
                    <td className="manual-track-builder__actions">
                      <button
                        type="button"
                        className="manual-track-builder__icon-btn"
                        aria-label={`Remove row ${index + 1}`}
                        title={t('manualTrackBuilder.removeRow')}
                        onClick={() => removeRow(row.id)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="manual-track-builder__add-row">
                  <button
                    type="button"
                    className="manual-track-builder__icon-btn manual-track-builder__icon-btn--add"
                    aria-label="Add row"
                    title={t('manualTrackBuilder.addRow')}
                    onClick={addRow}
                  >
                    +
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {!hasVideo ? (
          <div className="manual-track-builder__notice" role="status">
            <span className="manual-track-builder__notice-icon" aria-hidden="true">
              !
            </span>
            <p className="manual-track-builder__notice-text">
              {t('manualTrackBuilder.noVideoNotice')}
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
