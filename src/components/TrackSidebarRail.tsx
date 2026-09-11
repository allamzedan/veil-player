import { useMemo } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { getLanguage, t, type TranslationKey } from '../i18n'
import type { SidebarPanelId } from '../lib/sidebarPanelBridge'

interface RailSection {
  id: SidebarPanelId
  labelKey: TranslationKey
  ariaKey: TranslationKey
}

interface TrackSidebarRailProps {
  activeSection?: SidebarPanelId | null
  onExpand: () => void
  onOpenPanel: (panelId: SidebarPanelId) => void
}

export default function TrackSidebarRail({
  activeSection = null,
  onExpand,
  onOpenPanel
}: TrackSidebarRailProps) {
  const language = useLanguage()
  const isRtl = getLanguage() === 'ar'

  const sections: RailSection[] = useMemo(
    () => [
      { id: 'track', labelKey: 'sidebar.rail.track', ariaKey: 'sidebar.rail.openTrack' },
      { id: 'create', labelKey: 'sidebar.rail.create', ariaKey: 'sidebar.rail.openCreate' },
      { id: 'selected', labelKey: 'sidebar.rail.item', ariaKey: 'sidebar.rail.openItem' },
      { id: 'subtitles', labelKey: 'sidebar.rail.subs', ariaKey: 'sidebar.rail.openSubtitles' },
      { id: 'layers', labelKey: 'sidebar.rail.layers', ariaKey: 'sidebar.rail.openLayers' }
    ],
    [language]
  )

  const onSectionClick = (panelId: SidebarPanelId): void => {
    onExpand()
    onOpenPanel(panelId)
  }

  return (
    <aside
      className={`track-sidebar-rail${isRtl ? ' track-sidebar-rail--rtl' : ''}`}
      aria-label={t('sidebar.rail.sectionsAria')}
    >
      <button
        type="button"
        className="track-sidebar-rail__button track-sidebar-rail__button--expand"
        title={t('sidebar.rail.expand')}
        aria-label={t('sidebar.rail.expand')}
        onClick={onExpand}
      >
        <span className="track-sidebar-rail__expand-icon" aria-hidden>
          ◀
        </span>
      </button>

      <nav className="track-sidebar-rail__nav" aria-label={t('sidebar.rail.sectionsAria')}>
        {sections.map((section) => {
          const label = t(section.labelKey)
          const ariaLabel = t(section.ariaKey)
          const isActive = activeSection === section.id

          return (
            <button
              key={section.id}
              type="button"
              className={`track-sidebar-rail__button${isActive ? ' track-sidebar-rail__button--active' : ''}`}
              title={label}
              aria-label={ariaLabel}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => onSectionClick(section.id)}
            >
              <span className="track-sidebar-rail__button-label">{label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
