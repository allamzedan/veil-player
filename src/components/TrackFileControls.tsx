import { useRef, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { runClearTrackAction } from '../lib/clearTrackAction'
import { useTrackFileActionsContext } from '../hooks/TrackFileActionsProvider'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'
import { userMessages } from '../lib/userMessages'
import { getTotalTrackItemCount } from '../lib/trackItems'
import { t } from '../i18n'
import { pushErrorToast, pushSuccessToast } from '../state/useToastStore'
import { useVeilStore } from '../state/useVeilStore'

interface TrackFileControlsProps {
  onAfterTrackMutation?: () => void
  showClearTrack?: boolean
  showDirtyStatus?: boolean
}

export default function TrackFileControls({
  onAfterTrackMutation,
  showClearTrack = false,
  showDirtyStatus = false
}: TrackFileControlsProps) {
  useLanguage()
  const videoMetadata = useVeilStore((state) => state.videoMetadata)
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const isTrackDirty = useVeilStore((state) => state.isTrackDirty)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)

  const loadInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const { runIfAllowed } = useUnsavedChangesGuard()

  const { saveTrack, loadTrackFromJsonText, pickAndLoadTrack, useNativeTrackDialogs } =
    useTrackFileActionsContext()

  const canSave =
    videoMetadata !== null || (mediaSource?.kind === 'youtube' && Boolean(mediaSource.videoId))

  const onSaveTrack = (): void => {
    void saveTrack()
  }

  const onLoadTrack = (): void => {
    void runIfAllowed(async () => {
      if (useNativeTrackDialogs) {
        await pickAndLoadTrack()
        return
      }
      loadInputRef.current?.click()
    })
  }

  const onLoadFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    void runIfAllowed(async () => {
      const reader = new FileReader()
      const text = await new Promise<string | null>((resolve) => {
        reader.onload = (): void => {
          resolve(typeof reader.result === 'string' ? reader.result : null)
        }
        reader.onerror = (): void => resolve(null)
        reader.readAsText(file)
      })

      if (text === null) {
        setStatus(userMessages.readTrackFailed)
        pushErrorToast(userMessages.readTrackFailed)
        return
      }

      await loadTrackFromJsonText(text)
    })
  }

  const onClearTrack = (): void => {
    runClearTrackAction({
      runIfAllowed,
      onAfter: () => {
        onAfterTrackMutation?.()
        setStatus(t('track.cleared'))
        pushSuccessToast(t('toast.trackCleared'))
      }
    })
  }

  return (
    <div className="track-file-controls sidebar-button-row" role="group" aria-label={t('trackFile.ariaLabel')}>
      <input
        ref={loadInputRef}
        type="file"
        accept=".veil,.veil.json,.json,application/json"
        hidden
        onChange={onLoadFileInputChange}
      />
      <button
        type="button"
        className="btn btn-secondary sidebar-button"
        disabled={!canSave}
        onClick={onSaveTrack}
      >
        {t('track.saveTrack')}
      </button>
      <button type="button" className="btn btn-secondary sidebar-button" onClick={onLoadTrack}>
        {t('track.loadTrack')}
      </button>
      {showClearTrack ? (
        <button
          type="button"
          className="btn btn-ghost sidebar-button sidebar-button--subtle"
          disabled={getTotalTrackItemCount({ masks, mutes, skips }) === 0}
          onClick={onClearTrack}
        >
          {t('track.clearTrack')}
        </button>
      ) : null}
      {showDirtyStatus && isTrackDirty ? (
        <p className="track-file-controls__dirty">{t('track.unsavedChanges')}</p>
      ) : null}
      {status ? <p className="track-file-controls__status">{status}</p> : null}
    </div>
  )
}
