import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { readMotionPreferences } from '../lib/motionPreferences'

export interface CollapsiblePanelHandle {
  expand: () => void
  collapse: () => void
}

interface CollapsiblePanelProps {
  title: string
  panelId: string
  defaultExpanded?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  className?: string
  nested?: boolean
  children: ReactNode
}

const CollapsiblePanel = forwardRef<CollapsiblePanelHandle, CollapsiblePanelProps>(
  function CollapsiblePanel(
    {
      title,
      panelId,
      defaultExpanded = true,
      expanded: expandedProp,
      onExpandedChange,
      className = '',
      nested = false,
      children
    },
    ref
  ): ReactElement {
    useLanguage()
    const sectionRef = useRef<HTMLElement>(null)
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
    const bodyId = useId()
    const isControlled = expandedProp !== undefined
    const expanded = isControlled ? expandedProp : internalExpanded

    const setExpanded = (value: boolean): void => {
      if (!isControlled) {
        setInternalExpanded(value)
      }
      onExpandedChange?.(value)
    }

    useImperativeHandle(ref, () => ({
      expand: (): void => {
        setExpanded(true)
        const reduceMotion = readMotionPreferences().reduceMotion
        sectionRef.current?.scrollIntoView({
          block: 'nearest',
          behavior: reduceMotion ? 'auto' : 'smooth'
        })
      },
      collapse: (): void => {
        setExpanded(false)
      }
    }))

    return (
      <section
        ref={sectionRef}
        className={[
          'collapsible-panel',
          expanded ? '' : 'collapsible-panel--collapsed',
          nested ? 'collapsible-panel--nested' : '',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-panel-id={panelId}
      >
        <header className="collapsible-panel__header">
          <h2 className="collapsible-panel__title track-sidebar__title">{title}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-compact collapsible-panel__toggle"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? t('common.hide') : t('common.show')}
          </button>
        </header>
        {expanded ? (
          <div id={bodyId} className="collapsible-panel__body">
            {children}
          </div>
        ) : null}
      </section>
    )
  }
)

export default CollapsiblePanel

CollapsiblePanel.displayName = 'CollapsiblePanel'
