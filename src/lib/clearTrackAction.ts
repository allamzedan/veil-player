import { t } from '../i18n'
import { confirmNative } from './nativeConfirm'
import { getTotalTrackItemCount } from './trackItems'
import { useVeilStore } from '../state/useVeilStore'

interface ClearTrackOptions {
  runIfAllowed: (action: () => void) => void | Promise<unknown>
  onAfter?: () => void
  confirmMessage?: string
}

/** Shared clear-track flow for menu, chip, and sidebar actions. */
export function runClearTrackAction({
  runIfAllowed,
  onAfter,
  confirmMessage = t('track.clearConfirm')
}: ClearTrackOptions): void {
  const state = useVeilStore.getState()
  const total = getTotalTrackItemCount({
    masks: state.masks,
    mutes: state.mutes,
    skips: state.skips
  })

  if (total === 0) {
    return
  }

  void runIfAllowed(() => {
    if (!confirmNative(t('dialog.clearVeil'), confirmMessage)) {
      return
    }
    state.clearTrackItems()
    onAfter?.()
  })
}
