import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../hooks/useLanguage'
import { INSPECTOR_ACTION_COLORS, type InspectorActionKind } from '../lib/inspectorActionColors'
import { t } from '../i18n'

interface AddActionOption {
  kind: InspectorActionKind
  onSelect: () => void
}

interface InspectorAddActionMenuProps {
  onAddMask: () => void
  onAddMute: () => void
  onAddSkip: () => void
  emphasize?: boolean
}

const MENU_GAP_PX = 4
const VIEWPORT_PADDING_PX = 8

export default function InspectorAddActionMenu({
  onAddMask,
  onAddMute,
  onAddSkip,
  emphasize = false
}: InspectorAddActionMenuProps) {
  useLanguage()

  const menuId = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  const close = useCallback(() => setOpen(false), [])

  const updateMenuPosition = useCallback((): void => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) {
      return
    }

    const triggerRect = trigger.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const menuWidth = menuRect.width || 232
    const menuHeight = menuRect.height || 180

    const spaceBelow = window.innerHeight - triggerRect.bottom - MENU_GAP_PX
    const openUpward = spaceBelow < menuHeight && triggerRect.top > menuHeight + MENU_GAP_PX

    let top = openUpward
      ? triggerRect.top - menuHeight - MENU_GAP_PX
      : triggerRect.bottom + MENU_GAP_PX

    let left = triggerRect.right - menuWidth
    if (left < VIEWPORT_PADDING_PX) {
      left = VIEWPORT_PADDING_PX
    }
    if (left + menuWidth > window.innerWidth - VIEWPORT_PADDING_PX) {
      left = window.innerWidth - menuWidth - VIEWPORT_PADDING_PX
    }

    top = Math.max(
      VIEWPORT_PADDING_PX,
      Math.min(top, window.innerHeight - menuHeight - VIEWPORT_PADDING_PX)
    )

    setMenuStyle({
      position: 'fixed',
      top,
      left,
      zIndex: 10000
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    updateMenuPosition()
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) {
      return
    }

    const onReposition = (): void => {
      updateMenuPosition()
    }

    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: PointerEvent): void => {
      const root = rootRef.current
      const menu = menuRef.current
      if (!root) {
        return
      }
      const target = event.target
      if (target instanceof Node && !root.contains(target) && !(menu && menu.contains(target))) {
        close()
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, open])

  const options: AddActionOption[] = [
    { kind: 'mask', onSelect: onAddMask },
    { kind: 'mute', onSelect: onAddMute },
    { kind: 'skip', onSelect: onAddSkip }
  ]

  const descriptionFor = (kind: InspectorActionKind): string => {
    if (kind === 'mask') {
      return t('inspector.addMaskDescription')
    }
    if (kind === 'mute') {
      return t('inspector.addMuteDescription')
    }
    return t('inspector.addSkipDescription')
  }

  const labelFor = (kind: InspectorActionKind): string => {
    if (kind === 'mask') {
      return t('timeline.mask')
    }
    if (kind === 'mute') {
      return t('timeline.mute')
    }
    return t('timeline.skip')
  }

  const shortcutFor = (kind: InspectorActionKind): string => {
    if (kind === 'mask') {
      return 'M'
    }
    if (kind === 'mute') {
      return 'U'
    }
    return 'K'
  }

  const menu = open ? (
    <ul
      ref={menuRef}
      className="inspector-panel__menu inspector-panel__action-menu inspector-panel__action-menu--portal"
      id={menuId}
      role="menu"
      style={menuStyle}
    >
      {options.map((option) => (
        <li key={option.kind} role="none">
          <button
            type="button"
            role="menuitem"
            className={`inspector-panel__action-menu-item inspector-panel__action-menu-item--${option.kind}`}
            title={`Add ${labelFor(option.kind)} (${shortcutFor(option.kind)})`}
            onClick={() => {
              option.onSelect()
              close()
            }}
          >
            <span
              className="inspector-panel__action-menu-dot"
              style={{ backgroundColor: INSPECTOR_ACTION_COLORS[option.kind] }}
              aria-hidden
            />
            <span className="inspector-panel__action-menu-text">
              <span className="inspector-panel__action-menu-label">{labelFor(option.kind)}</span>
              <span className="inspector-panel__action-menu-description">
                {descriptionFor(option.kind)}
              </span>
            </span>
            <span className="inspector-panel__create-btn-shortcut" aria-hidden="true">
              {shortcutFor(option.kind)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  ) : null

  return (
    <div className="inspector-panel__menu-wrap inspector-panel__add-action-wrap" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`btn btn-compact inspector-panel__add-action-trigger${emphasize ? ' inspector-panel__add-action-trigger--emphasize' : ' btn-secondary'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {t('inspector.addAction')}
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
