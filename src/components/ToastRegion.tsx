import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { useToastStore } from '../state/useToastStore'

export default function ToastRegion() {
  useLanguage()
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-region" role="region" aria-label={t('toast.regionAria')} aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.kind}`} role="status">
          <span className={`toast__icon toast__icon--${toast.kind}`} aria-hidden="true" />
          <p className="toast__message">{toast.message}</p>
          <button
            type="button"
            className="toast__dismiss"
            aria-label={t('toast.dismissAria')}
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
