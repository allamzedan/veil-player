import { getTotalTrackItemCount } from '../lib/trackItems'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'

export default function StatusBar() {
  useLanguage()
  const videoFileName = useVeilStore((state) => state.videoFileName)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)

  const trackCount = getTotalTrackItemCount({ masks, mutes, skips })
  const fileLabel = videoFileName ?? t('statusBar.noVideo')

  return (
    <footer className="status-bar" aria-label={t('statusBar.ariaLabel')}>
      <span className="status-bar__file" title={fileLabel}>
        {fileLabel}
      </span>
      {trackCount > 0 ? (
        <span className="status-bar__track">
          {trackCount === 1
            ? t('statusBar.layers', { count: trackCount })
            : t('statusBar.layersPlural', { count: trackCount })}
        </span>
      ) : null}
    </footer>
  )
}
