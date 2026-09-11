import {
  SHORTCUT_CATEGORY_LABELS,
  SHORTCUT_ENTRIES,
  type ShortcutCategory
} from '../lib/shortcuts'
import { t } from '../i18n'
import Modal from './Modal'

interface ShortcutHelpProps {
  open: boolean
  onClose: () => void
}

const CATEGORY_ORDER: ShortcutCategory[] = ['playback', 'track', 'timeline', 'ui']

export function ShortcutHelpContent() {
  return (
    <div className="shortcut-help">
      {CATEGORY_ORDER.map((category) => {
        const entries = SHORTCUT_ENTRIES.filter((entry) => entry.category === category)
        if (entries.length === 0) return null
        return (
          <section key={category} className="shortcut-help__section">
            <h3 className="shortcut-help__category">{SHORTCUT_CATEGORY_LABELS[category]}</h3>
            <dl className="shortcut-help__list">
              {entries.map((entry) => (
                <div key={`${entry.keys}-${entry.description}`} className="shortcut-help__row">
                  <dt>{entry.keys}</dt>
                  <dd>{entry.description}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
    </div>
  )
}

export default function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  return (
    <Modal open={open} title={t('shortcutHelp.title')} onClose={onClose}>
      <ShortcutHelpContent />
    </Modal>
  )
}
