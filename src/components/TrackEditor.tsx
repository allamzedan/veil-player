import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import type { TranslationKey } from '../i18n'
import { t } from '../i18n'
import { confirmNative } from '../lib/nativeConfirm'
import {
  formatSeconds,
  isValidMaskTiming,
  parseSecondsInput
} from '../lib/time'
import type { MaskTrackItem } from '../types/track'
import MaskStyleControls from './MaskStyleControls'
import { canCreateMasks } from '../lib/audioMode'
import { useVeilStore } from '../state/useVeilStore'
import { TrashIcon } from './icons'
import CompactRangeTiming from './CompactRangeTiming'

interface TrackEditorProps {
  onAfterTimingMutation?: () => void
  onApplyComplete?: () => void
  onCancelComplete?: () => void
  readOnly?: boolean
  labelMode?: 'sidebar' | 'inspector'
  fullscreen?: boolean
  onDirtyChange?: (dirty: boolean) => void
}

function sectionKey(
  labelMode: 'sidebar' | 'inspector',
  section: 'timing' | 'style' | 'advanced' | 'apply' | 'applyFade' | 'invalidTime' | 'invalidDuration' | 'invalidFade' | 'fadeIn' | 'fadeOut'
): TranslationKey {
  if (labelMode === 'inspector') {
    const inspectorKeys: Record<typeof section, TranslationKey> = {
      timing: 'inspector.timing',
      style: 'inspector.style',
      advanced: 'inspector.advanced',
      apply: 'inspector.apply',
      applyFade: 'selectedItem.applyFade',
      invalidTime: 'inspector.invalidTiming',
      invalidDuration: 'inspector.invalidTiming',
      invalidFade: 'selectedItem.invalidFade',
      fadeIn: 'inspector.fadeIn',
      fadeOut: 'inspector.fadeOut'
    }
    return inspectorKeys[section]
  }

  const sidebarKeys: Record<typeof section, TranslationKey> = {
    timing: 'selectedItem.timing',
    style: 'selectedItem.style',
    advanced: 'selectedItem.advanced',
    apply: 'selectedItem.apply',
    applyFade: 'selectedItem.applyFade',
    invalidTime: 'selectedItem.invalidTime',
    invalidDuration: 'selectedItem.invalidDuration',
    invalidFade: 'selectedItem.invalidFade',
    fadeIn: 'selectedItem.fadeIn',
    fadeOut: 'selectedItem.fadeOut'
  }
  return sidebarKeys[section]
}

export default function TrackEditor({
  onAfterTimingMutation,
  onApplyComplete,
  onCancelComplete,
  readOnly = false,
  labelMode = 'sidebar',
  fullscreen = false,
  onDirtyChange
}: TrackEditorProps) {
  useLanguage()
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const patchMaskTiming = useVeilStore((state) => state.patchMaskTiming)
  const patchMaskFade = useVeilStore((state) => state.patchMaskFade)
  const patchMuteTiming = useVeilStore((state) => state.patchMuteTiming)
  const patchSkipTiming = useVeilStore((state) => state.patchSkipTiming)
  const patchItemNotes = useVeilStore((state) => state.patchItemNotes)
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const maskVisualBlocked = selectedItemType === 'mask' && !canCreateMasks(mediaKind)
  const effectiveReadOnly = readOnly || maskVisualBlocked

  const selectedItem = useMemo(() => {
    if (selectedItemId === null || selectedItemType === null) {
      return null
    }

    if (selectedItemType === 'mask') {
      return masks.find((item) => item.id === selectedItemId) ?? null
    }

    if (selectedItemType === 'mute') {
      return mutes.find((item) => item.id === selectedItemId) ?? null
    }

    return skips.find((item) => item.id === selectedItemId) ?? null
  }, [masks, mutes, skips, selectedItemId, selectedItemType])

  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [fadeInInput, setFadeInInput] = useState('0')
  const [fadeOutInput, setFadeOutInput] = useState('0')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    if (!selectedItem) {
      setStartInput('')
      setEndInput('')
      setError(null)
      setNotesInput('')
      setFadeInInput('0')
      setFadeOutInput('0')
      setAdvancedOpen(false)
      return
    }

    setStartInput(formatSeconds(selectedItem.start))
    setEndInput(formatSeconds(selectedItem.end))
    setError(null)
    setNotesInput(selectedItem.notes ?? '')
    setAdvancedOpen(false)
    if (selectedItemType === 'mask') {
      const mask = selectedItem as MaskTrackItem
      setFadeInInput(String(mask.fadeInMs ?? 0))
      setFadeOutInput(String(mask.fadeOutMs ?? 0))
    }
  }, [
    selectedItem?.id,
    selectedItem?.start,
    selectedItem?.end,
    selectedItem?.notes,
    selectedItemType
  ])

  useEffect(() => {
    if (!selectedItem) {
      onDirtyChange?.(false)
      return
    }
    const mask = selectedItemType === 'mask' ? selectedItem as MaskTrackItem : null
    onDirtyChange?.(
      startInput !== formatSeconds(selectedItem.start) ||
      endInput !== formatSeconds(selectedItem.end) ||
      notesInput !== (selectedItem.notes ?? '') ||
      (mask !== null && (
        fadeInInput !== String(mask.fadeInMs ?? 0) ||
        fadeOutInput !== String(mask.fadeOutMs ?? 0)
      ))
    )
  }, [endInput, fadeInInput, fadeOutInput, notesInput, onDirtyChange, selectedItem, selectedItemType, startInput])

  const applyTiming = (): void => {
    if (!selectedItem || selectedItemType === null) {
      return
    }

    const start = parseSecondsInput(startInput)
    const end = parseSecondsInput(endInput)

    if (start === null || end === null) {
      setError(t(sectionKey(labelMode, 'invalidTime')))
      return
    }

    if (!isValidMaskTiming(start, end)) {
      setError(t(sectionKey(labelMode, 'invalidDuration')))
      return
    }

    if (selectedItemType === 'mask') {
      patchMaskTiming(selectedItem.id, start, end)
    } else if (selectedItemType === 'mute') {
      patchMuteTiming(selectedItem.id, start, end)
    } else {
      patchSkipTiming(selectedItem.id, start, end)
    }

    setError(null)
    onAfterTimingMutation?.()
    onApplyComplete?.()
  }

  const applyMaskFade = (): void => {
    if (!selectedItem || selectedItemType !== 'mask') {
      return
    }

    const fadeInMs = Number.parseInt(fadeInInput, 10)
    const fadeOutMs = Number.parseInt(fadeOutInput, 10)
    if (!Number.isFinite(fadeInMs) || !Number.isFinite(fadeOutMs)) {
      setError(t(sectionKey(labelMode, 'invalidFade')))
      return
    }

    patchMaskFade(selectedItem.id, fadeInMs, fadeOutMs)
    setError(null)
    onAfterTimingMutation?.()
    onApplyComplete?.()
  }

  const resetInputs = (): void => {
    if (!selectedItem) {
      return
    }
    setStartInput(formatSeconds(selectedItem.start))
    setEndInput(formatSeconds(selectedItem.end))
    setError(null)
    setNotesInput(selectedItem.notes ?? '')
    if (selectedItemType === 'mask') {
      const mask = selectedItem as MaskTrackItem
      setFadeInInput(String(mask.fadeInMs ?? 0))
      setFadeOutInput(String(mask.fadeOutMs ?? 0))
    }
  }

  const cancelEditing = (): void => {
    resetInputs()
    onCancelComplete?.()
  }

  const patchTimingValues = (start: number, end: number): void => {
    if (!selectedItem || selectedItemType === null) {
      return
    }

    if (selectedItemType === 'mask') {
      patchMaskTiming(selectedItem.id, start, end)
    } else if (selectedItemType === 'mute') {
      patchMuteTiming(selectedItem.id, start, end)
    } else {
      patchSkipTiming(selectedItem.id, start, end)
    }

    setError(null)
    onAfterTimingMutation?.()
  }

  const nudgeTiming = (field: 'start' | 'end', deltaSeconds: number): void => {
    if (!selectedItem || selectedItemType === null || effectiveReadOnly || selectedItem.locked === true) {
      return
    }

    const parsedStart = parseSecondsInput(startInput) ?? selectedItem.start
    const parsedEnd = parseSecondsInput(endInput) ?? selectedItem.end
    const nextStart = field === 'start' ? Math.max(0, parsedStart + deltaSeconds) : parsedStart
    const nextEnd = field === 'end' ? Math.max(0, parsedEnd + deltaSeconds) : parsedEnd

    if (!isValidMaskTiming(nextStart, nextEnd)) {
      setError(t(sectionKey(labelMode, 'invalidDuration')))
      return
    }

    setStartInput(formatSeconds(nextStart))
    setEndInput(formatSeconds(nextEnd))
    patchTimingValues(nextStart, nextEnd)
  }

  const removeSelected = (): void => {
    if (!selectedItem || selectedItemType === null) {
      return
    }
    const label =
      selectedItemType === 'mask'
        ? t('timeline.mask')
        : selectedItemType === 'mute'
          ? t('timeline.mute')
          : t('timeline.skip')
    if (!confirmNative(t('dialog.deleteTitle', { type: label }), t('inspector.deleteConfirm', { type: label }))) {
      return
    }
    useVeilStore.getState().removeSelectedItem()
    onAfterTimingMutation?.()
    onApplyComplete?.()
  }

  if (!selectedItem || selectedItemType === null) {
    return (
      <section
        className="selected-item-editor selected-item-editor--empty"
        aria-label={t('sidebar.selected')}
      >
        <p className="selected-item-editor__hint">{t('selectedItem.empty')}</p>
      </section>
    )
  }

  const isMaskItem = selectedItemType === 'mask'
  const isLocked =
    (isMaskItem ? effectiveReadOnly : readOnly) || selectedItem.locked === true
  const parsedStart = parseSecondsInput(startInput)
  const parsedEnd = parseSecondsInput(endInput)
  const durationReadout =
    parsedStart !== null && parsedEnd !== null && parsedEnd > parsedStart
      ? formatSeconds(parsedEnd - parsedStart)
      : formatSeconds(Math.max(0, selectedItem.end - selectedItem.start))
  const durationSeconds =
    parsedStart !== null && parsedEnd !== null && parsedEnd > parsedStart
      ? parsedEnd - parsedStart
      : Math.max(0, selectedItem.end - selectedItem.start)

  return (
    <section
      className={`selected-item-editor selected-item-editor--compact${labelMode === 'inspector' ? ' selected-item-editor--inspector' : ''}${fullscreen ? ' selected-item-editor--fullscreen' : ''}`}
      aria-label={t('sidebar.selected')}
    >
      <header className="selected-item-editor__metadata-header">
        <h3>
          {selectedItemType === 'mask'
            ? t('timeline.mask')
            : selectedItemType === 'mute'
              ? t('timeline.mute')
              : t('timeline.skip')}
        </h3>
      </header>
      <div className="selected-item-editor__scroll selected-item-editor__body">
      {maskVisualBlocked ? (
        <p className="selected-item-editor__hint">{t('media.masksUnavailable')}</p>
      ) : null}
      <div className="selected-item-editor__block">
        <CompactRangeTiming
          startInput={startInput}
          endInput={endInput}
          durationReadout={durationReadout}
          durationSeconds={durationSeconds}
          disabled={isLocked}
          onStartChange={(value) => { setStartInput(value); setError(null) }}
          onEndChange={(value) => { setEndInput(value); setError(null) }}
          onNudge={nudgeTiming}
          onCommit={applyTiming}
        />
        {error ? <p className="track-editor__error">{error}</p> : null}
      </div>

      {selectedItemType === 'mask' ? (
        <MaskStyleControls
          mask={selectedItem as MaskTrackItem}
          disabled={isLocked}
          compact
          inspectorCompact={labelMode === 'inspector'}
          styleHeading={t(sectionKey(labelMode, 'style'))}
        />
      ) : null}

      <details
        className="selected-item-editor__advanced layer-editor-disclosure"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary className="selected-item-editor__advanced-summary" aria-expanded={advancedOpen}>
          {t(sectionKey(labelMode, 'advanced'))}
        </summary>
        <div className="selected-item-editor__advanced-body">
          {selectedItemType === 'mask' ? (
            <div className="track-editor__row track-editor__row--fade">
              <label className="track-editor__field track-editor__field--compact">
                <span>{t(sectionKey(labelMode, 'fadeIn'))}</span>
                <input
                  type="number"
                  className="track-editor__input track-editor__input--numeric ltr-digits"
                  min={0}
                  max={5000}
                  step={50}
                  value={fadeInInput}
                  disabled={isLocked}
                  onChange={(event) => {
                    setFadeInInput(event.target.value)
                    setError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      applyMaskFade()
                    }
                  }}
                />
              </label>
              <label className="track-editor__field track-editor__field--compact">
                <span>{t(sectionKey(labelMode, 'fadeOut'))}</span>
                <input
                  type="number"
                  className="track-editor__input track-editor__input--numeric ltr-digits"
                  min={0}
                  max={5000}
                  step={50}
                  value={fadeOutInput}
                  disabled={isLocked}
                  onChange={(event) => {
                    setFadeOutInput(event.target.value)
                    setError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      applyMaskFade()
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-compact track-editor__apply"
                disabled={isLocked}
                onClick={applyMaskFade}
              >
                {t(sectionKey(labelMode, 'applyFade'))}
              </button>
            </div>
          ) : null}
          <label className="track-editor__field track-editor__field--notes">
            <span>{t('common.notes')}</span>
            <textarea
              className="mask-style-controls__notes-input"
              rows={2}
              value={notesInput}
              disabled={isLocked}
              onChange={(event) => setNotesInput(event.target.value)}
              onBlur={() => patchItemNotes(selectedItem.id, selectedItemType, notesInput)}
              placeholder={t('selectedItem.notesPlaceholder')}
            />
          </label>
        </div>
      </details>
      </div>
      {labelMode === 'inspector' ? (
        <footer className="selected-item-editor__actions selected-item-editor__actions--inspector selected-item-editor__actions--footer">
          <button
            type="button"
            className="btn btn-compact selected-item-editor__action-apply"
            disabled={isLocked}
            onClick={applyTiming}
          >
            {t(sectionKey(labelMode, 'apply'))}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-compact selected-item-editor__action-cancel"
            onClick={cancelEditing}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-ghost selected-item-editor__action-delete"
            aria-label={t('layers.delete')}
            title={selectedItemType === 'mask' ? 'Delete mask' : selectedItemType === 'mute' ? 'Delete mute range' : 'Delete skip range'}
            disabled={readOnly}
            onClick={removeSelected}
          >
            <TrashIcon />
          </button>
        </footer>
      ) : null}
    </section>
  )
}
