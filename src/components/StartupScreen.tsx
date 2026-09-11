import veilLogo from '../assets/veil-logo.png'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'

interface StartupScreenProps {
  visible: boolean
}

export default function StartupScreen({ visible }: StartupScreenProps) {
  useLanguage()

  if (!visible) {
    return null
  }

  return (
    <div className="startup-screen startup-screen--visible" aria-live="polite" aria-busy="true">
      <div className="startup-screen__panel">
        <img src={veilLogo} alt="" className="startup-screen__logo" />
        <h1 className="startup-screen__title">VEIL Player</h1>
        <p className="startup-screen__tagline">{t('startup.tagline')}</p>
        <p className="startup-screen__status">{t('startup.status')}</p>
      </div>
    </div>
  )
}
