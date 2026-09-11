import veilLogo from '../assets/veil-logo.png'
import { APP_VERSION } from '../lib/appVersion'
import { SUPPORTED_TRACK_VERSION } from '../types/track'
import {
  formatWorkflowMetricsForCopy,
  isDevMetricsEnabled,
  readWorkflowMetrics
} from '../lib/workflowMetrics'
import { pushSuccessToast } from '../state/useToastStore'
import { t } from '../i18n'
import Modal from './Modal'

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

export default function AboutDialog({ open, onClose }: AboutDialogProps) {
  const copyDebugStats = async (): Promise<void> => {
    const payload = formatWorkflowMetricsForCopy()
    try {
      await navigator.clipboard.writeText(payload)
      pushSuccessToast(t('about.debugCopied'))
    } catch {
      pushSuccessToast(JSON.stringify(readWorkflowMetrics()))
    }
  }

  return (
    <Modal
      open={open}
      title={t('about.title')}
      onClose={onClose}
      panelClassName="modal__panel--about"
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      <div className="about-dialog">
        <div className="about-dialog__identity">
          <img src={veilLogo} alt="" className="about-dialog__logo" />
          <h2 className="about-dialog__product-title">VEIL Player</h2>
        </div>
        <div className="about-dialog__copy">
          <p className="about-dialog__lead">{t('about.lead')}</p>
          <p className="about-dialog__privacy">{t('about.privacy')}</p>
        </div>
        <p className="about-dialog__meta">
          {t('about.metaVersion', { version: APP_VERSION, schema: SUPPORTED_TRACK_VERSION })}
          <br />
          {t('about.developer')}
        </p>
        {isDevMetricsEnabled() ? (
          <button
            type="button"
            className="btn btn-ghost btn-compact about-dialog__dev"
            onClick={() => void copyDebugStats()}
          >
            {t('about.copyDebugStats')}
          </button>
        ) : null}
      </div>
    </Modal>
  )
}
