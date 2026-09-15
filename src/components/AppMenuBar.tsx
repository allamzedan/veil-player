import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../hooks/useLanguage'
import { t } from '../i18n'
import { runAppMenuAction, runOpenRecentTarget, type AppMenuActions } from '../lib/appMenuBridge'
import { YOUTUBE_PROVIDER_ENABLED } from '../lib/providerFeatures'
import { openSidebarPanel } from '../lib/sidebarPanelBridge'
import {
  requestOpenSubtitleSheet,
  requestSubtitleImport
} from '../lib/subtitleSheetBridge'
import {
  hasPlayableMediaLoaded,
  resolvePlaybackCapabilities
} from '../lib/playbackCapabilities'
import { canCreateRangeActions, canEditItemType } from '../lib/authoringCapabilities'
import { shouldShowAudioCompact } from '../lib/audioWorkspace'
import { hasVeilMenuSession } from '../lib/trackSession'
import { recentTargetLabel, recentTargetTitle, useRecentHistory } from '../lib/recentHistory'
import {
  resolveMenuViewportLayout,
  resolveSubmenuViewportLayout,
  submenuKeyAction,
  submenuTriggerKeyAction,
  wrappedMenuIndex,
  type MenuViewportLayout,
  type SubmenuViewportLayout
} from '../lib/menuGeometry'
import { readUiRefreshV1 } from '../lib/uiRefreshV1'
import { useVeilStore } from '../state/useVeilStore'
import { usePlayerModeStore } from '../state/usePlayerModeStore'

interface MenuItem {
  id: string
  label: string
  shortcut?: string
  action: () => void
  disabled?: boolean
  title?: string
  labelDirection?: 'auto'
}

interface MenuSeparator {
  type: 'separator'
}

interface MenuSubmenu {
  type: 'submenu'
  id: string
  label: string
  items: MenuEntry[]
  disabled?: boolean
}

type MenuEntry = MenuItem | MenuSeparator | MenuSubmenu

interface MenuSection {
  id: string
  label: string
  items: MenuEntry[]
}

function isSeparator(entry: MenuEntry): entry is MenuSeparator {
  return 'type' in entry && entry.type === 'separator'
}

function isSubmenu(entry: MenuEntry): entry is MenuSubmenu {
  return 'type' in entry && entry.type === 'submenu'
}

function menuSeparator(): MenuSeparator {
  return { type: 'separator' }
}

interface MenuSubmenuRowProps {
  submenu: MenuSubmenu
  onClose: () => void
}

function MenuSubmenuRow({ submenu, onClose }: MenuSubmenuRowProps) {
  const [open, setOpen] = useState(false)
  const [layout, setLayout] = useState<SubmenuViewportLayout | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const submenuRef = useRef<HTMLUListElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const focusFirstRef = useRef(false)

  const cancelClose = (): void => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const openSubmenu = (focusFirst = false): void => {
    cancelClose()
    focusFirstRef.current = focusFirst
    setOpen(true)
    if (focusFirst && open) {
      submenuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus()
    }
  }

  const closeSubmenu = (returnFocus = false): void => {
    cancelClose()
    setOpen(false)
    setLayout(null)
    if (returnFocus) {
      triggerRef.current?.focus()
    }
  }

  const scheduleClose = (): void => {
    cancelClose()
    closeTimerRef.current = window.setTimeout(() => closeSubmenu(), 140)
  }

  useEffect(() => () => cancelClose(), [])

  useLayoutEffect(() => {
    if (!open) return

    const updatePosition = (): void => {
      const trigger = triggerRef.current
      const list = submenuRef.current
      if (!trigger || !list) return

      const rect = trigger.getBoundingClientRect()
      setLayout(resolveSubmenuViewportLayout(
        rect,
        list.offsetWidth,
        Math.max(list.scrollHeight, list.getBoundingClientRect().height),
        window.innerWidth,
        window.innerHeight
      ))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, submenu.items.length])

  useLayoutEffect(() => {
    if (!open || !layout || !focusFirstRef.current) return
    focusFirstRef.current = false
    submenuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus()
  }, [open, layout])

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      closeSubmenu(true)
      return
    }

    const action = submenuTriggerKeyAction(event.key)
    if (!action || submenu.disabled) return
    event.preventDefault()
    event.stopPropagation()
    openSubmenu(action === 'open-first')
  }

  const handleSubmenuKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>): void => {
    const action = submenuKeyAction(event.key)
    if (!action) return
    event.preventDefault()
    event.stopPropagation()

    if (action === 'return' || action === 'close') {
      closeSubmenu(true)
      return
    }

    const buttons = Array.from(
      submenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []
    )
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
    buttons[wrappedMenuIndex(currentIndex, buttons.length, action === 'next' ? 1 : -1)]?.focus()
  }

  const submenuList = open && !submenu.disabled ? (
    <ul
      ref={submenuRef}
      className="app-menu__sublist"
      role="menu"
      data-app-menu-overlay="true"
      data-side={layout?.side}
      style={{
        top: layout?.top ?? 0,
        left: layout?.left ?? 0,
        maxHeight: layout?.maxHeight,
        overflowY: layout?.scroll ? 'auto' : 'visible',
        visibility: layout ? 'visible' : 'hidden'
      }}
      onPointerEnter={cancelClose}
      onPointerLeave={scheduleClose}
      onKeyDown={handleSubmenuKeyDown}
    >
      {submenu.items.map((item, index) => {
        if (isSeparator(item)) {
          return <li key={`submenu-sep-${index}`} role="separator" className="app-menu__separator" />
        }
        if (isSubmenu(item)) return null
        return (
          <li key={item.id} role="none">
            <button
              type="button"
              className="app-menu__item"
              role="menuitem"
              disabled={item.disabled}
              title={item.title}
              onClick={() => {
                if (!item.disabled) item.action()
                onClose()
              }}
            >
              <span className="app-menu__item-label" dir={item.labelDirection}>{item.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  ) : null

  return (
    <li
      role="none"
      className={`app-menu__submenu${open ? ' app-menu__submenu--open' : ''}`}
      onPointerEnter={() => openSubmenu()}
      onPointerLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        type="button"
        className="app-menu__item app-menu__item--submenu"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={submenu.disabled}
        onClick={() => openSubmenu()}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="app-menu__item-label">{submenu.label}</span>
        <span className="app-menu__submenu-chevron" aria-hidden="true">
          ›
        </span>
      </button>
      {submenuList ? createPortal(submenuList, document.body) : null}
    </li>
  )
}
interface MenuDropdownProps {
  section: MenuSection
  isOpen: boolean
  onToggle: () => void
  onHover: () => void
  onClose: () => void
}

function MenuDropdown({ section, isOpen, onToggle, onHover, onClose }: MenuDropdownProps) {
  const listRef = useRef<HTMLUListElement | null>(null)
  const [layout, setLayout] = useState<MenuViewportLayout | null>(null)

  useLayoutEffect(() => {
    if (!isOpen) {
      setLayout(null)
      return
    }

    const updateSize = (): void => {
      const list = listRef.current
      if (!list) return
      setLayout(resolveMenuViewportLayout(
        list.getBoundingClientRect().top,
        list.scrollHeight,
        window.innerHeight
      ))
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [isOpen, section.items.length])
  return (
    <div className={`app-menu__section${isOpen ? ' app-menu__section--open' : ''}`}>
      <button
        type="button"
        className="app-menu__trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={onToggle}
        onMouseEnter={onHover}
      >
        {section.label}
      </button>
      {isOpen ? (
        <ul
          ref={listRef}
          className="app-menu__list"
          role="menu"
          style={{
            maxHeight: layout?.maxHeight,
            overflowY: layout?.scroll ? 'auto' : 'visible'
          }}
        >
          {section.items.map((entry, index) => {
            if (isSeparator(entry)) {
              return (
                <li key={`sep-${section.id}-${index}`} role="separator" className="app-menu__separator" />
              )
            }
            if (isSubmenu(entry)) {
              return <MenuSubmenuRow key={entry.id} submenu={entry} onClose={onClose} />
            }
            return (
              <li key={entry.id} role="none">
                <button
                  type="button"
                  className="app-menu__item"
                  role="menuitem"
                  disabled={entry.disabled}
                  title={entry.title}
                  onClick={() => {
                    if (!entry.disabled) {
                      entry.action()
                    }
                    onClose()
                  }}
                >
                  <span className="app-menu__item-label" dir={entry.labelDirection}>{entry.label}</span>
                  {entry.shortcut ? (
                    <span className="app-menu__item-shortcut">{entry.shortcut}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

interface AppMenuBarProps {
  showStatusBar: boolean
  sidebarCollapsed: boolean
  timelineVisible: boolean
  embedded?: boolean
}

export default function AppMenuBar({
  showStatusBar,
  sidebarCollapsed,
  timelineVisible,
  embedded = false
}: AppMenuBarProps) {
  const videoSrc = useVeilStore((state) => state.videoSrc)
  const videoMetadata = useVeilStore((state) => state.videoMetadata)
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const trackFilePath = useVeilStore((state) => state.trackFilePath)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const playerMode = usePlayerModeStore((state) => state.playerMode)
  const uiRefreshV1 = readUiRefreshV1()
  const refreshEditBlocked = uiRefreshV1 && playerMode === 'watch'

  const language = useLanguage()
  const menuBarRef = useRef<HTMLDivElement | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const { targets: allRecentTargets, clearRecent } = useRecentHistory(window.veil)
  const recentTargets = allRecentTargets.filter(
    (target) => YOUTUBE_PROVIDER_ENABLED || target.kind !== 'youtube'
  )

  const hasVideo = hasPlayableMediaLoaded(videoSrc, mediaKind, mediaSource)
  const isAudioMode = mediaKind === 'audio'
  const audioWatchMode = shouldShowAudioCompact(mediaKind, playerMode) && hasVideo
  const playbackCapabilities = useMemo(
    () => resolvePlaybackCapabilities(mediaSource, mediaKind),
    [mediaKind, mediaSource]
  )
  const selectedItemEditable = canEditItemType(playbackCapabilities, selectedItemType)
  const hasRangeAuthoring = canCreateRangeActions(playbackCapabilities)
  const hasVeil = hasVeilMenuSession({ trackFilePath, masks, mutes, skips, bookmarks })
  const canSave =
    playbackCapabilities.canSaveVeil &&
    (videoMetadata !== null ||
      (playbackCapabilities.sourceDisclosure === 'youtube' && hasVideo))

  const run = (key: keyof AppMenuActions): void => {
    runAppMenuAction(key)
  }

  const closeMenu = (): void => {
    setOpenMenuId(null)
  }

  const toggleMenu = (menuId: string): void => {
    setOpenMenuId((current) => (current === menuId ? null : menuId))
  }

  useEffect(() => {
    if (openMenuId === null) {
      return
    }

    const onPointerDown = (event: PointerEvent): void => {
      const menuBar = menuBarRef.current
      if (!menuBar) {
        return
      }

      const target = event.target
      const inPortalOverlay = event.composedPath().some(
        (pathTarget) => pathTarget instanceof Element && pathTarget.hasAttribute('data-app-menu-overlay')
      )
      if (target instanceof Node && !menuBar.contains(target) && !inPortalOverlay) {
        setOpenMenuId(null)
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (document.querySelector('[data-app-menu-overlay]')) return
        setOpenMenuId(null)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openMenuId])

  const sections: MenuSection[] = useMemo(() => {
    const recentItems: MenuEntry[] = recentTargets.length > 0
      ? recentTargets.map((target, index) => ({
          id: `recent-${target.kind}-${index}-${recentTargetTitle(target)}`,
          label: recentTargetLabel(target, recentTargets),
          title: recentTargetTitle(target),
          labelDirection: 'auto',
          action: () => runOpenRecentTarget(target)
        }))
      : [{
          id: 'noRecent',
          label: t('menu.noRecentMedia'),
          action: () => {},
          disabled: true
        }]

    const openRecentSubmenu: MenuSubmenu = {
      type: 'submenu',
      id: 'openRecent',
      label: t('menu.openRecent'),
      items: [
        ...recentItems,
        menuSeparator(),
        {
          id: 'clearRecent',
          label: t('menu.clearRecent'),
          action: () => { void clearRecent() },
          disabled: recentTargets.length === 0
        }
      ]
    }

    if (audioWatchMode) {
      return [
        {
          id: 'file',
          label: t('menu.file'),
          items: [
            { id: 'openVideo', label: t('menu.openVideo'), action: () => run('openVideo') },
            ...(YOUTUBE_PROVIDER_ENABLED ? [{
              id: 'openYouTube',
              label: t('menu.openYouTube'),
              action: () => run('openYouTube')
            }] : []),
            openRecentSubmenu,
            menuSeparator(),
            {
              id: 'closeVideo',
              label: t('menu.closeVideo'),
              action: () => run('closeVideo'),
              disabled: !hasVideo
            },
            menuSeparator(),
            { id: 'settings', label: t('menu.settings'), action: () => run('openSettings') },
            menuSeparator(),
            { id: 'exit', label: t('menu.exit'), action: () => run('exitApp') }
          ]
        },
        {
          id: 'playback',
          label: t('menu.playback'),
          items: [
            {
              id: 'playPause',
              label: t('menu.playPause'),
              shortcut: 'Space',
              action: () => run('togglePlayPause'),
              disabled: !hasVideo
            },
            {
              id: 'seekBack10',
              label: t('menu.back10Seconds'),
              action: () => run('seekBack10'),
              disabled: !hasVideo
            },
            {
              id: 'seekForward10',
              label: t('menu.forward10Seconds'),
              action: () => run('seekForward10'),
              disabled: !hasVideo
            },
            menuSeparator(),
            {
              id: 'speedDown',
              label: t('menu.speedDown'),
              shortcut: '[',
              action: () => run('speedDown'),
              disabled: !hasVideo
            },
            {
              id: 'speedUp',
              label: t('menu.speedUp'),
              shortcut: ']',
              action: () => run('speedUp'),
              disabled: !hasVideo
            },
            menuSeparator(),
            {
              id: 'prevSubtitleCue',
              label: t('menu.prevSubtitleCue'),
              shortcut: 'Alt+←',
              action: () => run('prevSubtitleCue'),
              disabled: !hasVideo
            },
            {
              id: 'nextSubtitleCue',
              label: t('menu.nextSubtitleCue'),
              shortcut: 'Alt+→',
              action: () => run('nextSubtitleCue'),
              disabled: !hasVideo
            },
            {
              id: 'repeatSubtitleCue',
              label: t('menu.repeatSubtitleCue'),
              shortcut: 'Alt+R',
              action: () => run('repeatSubtitleCue'),
              disabled: !hasVideo
            }
          ]
        },
        {
          id: 'track',
          label: t('menu.track'),
          items: [
            { id: 'loadTrack', label: t('menu.loadTrack'), action: () => run('loadTrack') },
            { id: 'compareImportSidecar', label: `${t('sidecar.title')}…`, action: () => run('compareImportSidecar') },
            menuSeparator(),
            {
              id: 'saveTrack',
              label: t('menu.saveTrack'),
              shortcut: 'Ctrl+S',
              action: () => run('saveTrack'),
              disabled: !canSave
            },
            {
              id: 'saveTrackAs',
              label: t('menu.saveTrackAs'),
              action: () => run('saveTrackAs'),
              disabled: !canSave
            },
            {
              id: 'closeTrack',
              label: t('menu.closeTrack'),
              action: () => run('closeTrack'),
              disabled: !hasVeil
            },
            menuSeparator(),
            {
              id: 'editVeil',
              label: t('menu.editVeil'),
              shortcut: 'E',
              action: () => run('setPlayerModeEdit'),
              disabled: !hasVideo || playerMode === 'edit'
            },
            {
              id: 'trackInfo',
              label: t('menu.trackInfo'),
              action: () => openSidebarPanel('track-info'),
              disabled: !hasVideo
            }
          ]
        },
        {
          id: 'view',
          label: t('menu.view'),
          items: [
            {
              id: 'subtitles',
              label: t('menu.subtitles'),
              action: () => requestOpenSubtitleSheet(),
              disabled: !hasVideo
            },
            menuSeparator(),
            {
              id: 'toggleStatusBar',
              label: showStatusBar ? t('menu.hideStatusBar') : t('menu.showStatusBar'),
              action: () => run('toggleStatusBar')
            }
          ]
        },
        {
          id: 'help',
          label: t('menu.help'),
          items: [
            {
              id: 'keyboardShortcuts',
              label: t('menu.keyboardShortcuts'),
              shortcut: '?',
              action: () => run('openShortcutHelp')
            },
            menuSeparator(),
            { id: 'about', label: t('menu.about'), action: () => run('openAbout') }
          ]
        }
      ]
    }

    return [
      {
        id: 'file',
        label: t('menu.file'),
        items: [
          { id: 'openVideo', label: t('menu.openVideo'), action: () => run('openVideo') },
          ...(YOUTUBE_PROVIDER_ENABLED ? [{
            id: 'openYouTube',
            label: t('menu.openYouTube'),
            action: () => run('openYouTube')
          }] : []),
          openRecentSubmenu,
          menuSeparator(),
          {
            id: 'closeVideo',
            label: t('menu.closeVideo'),
            action: () => run('closeVideo'),
            disabled: !hasVideo
          },
          menuSeparator(),
          { id: 'settings', label: t('menu.settings'), action: () => run('openSettings') },
          menuSeparator(),
          { id: 'exit', label: t('menu.exit'), action: () => run('exitApp') }
        ]
      },
      {
        id: 'edit',
        label: t('menu.edit'),
        items: [
          { id: 'undo', label: t('menu.undo'), shortcut: 'Ctrl+Z', action: () => run('undo') },
          { id: 'redo', label: t('menu.redo'), shortcut: 'Ctrl+Y', action: () => run('redo') },
          menuSeparator(),
          {
            id: 'deleteSelected',
            label: t('menu.deleteSelected'),
            shortcut: 'Del',
            action: () => run('deleteSelected'),
            disabled: !selectedItemId || !selectedItemEditable || refreshEditBlocked
          },
          ...(hasRangeAuthoring
            ? [
                menuSeparator(),
                { id: 'setStart', label: t('menu.setStart'), shortcut: 'I', action: () => run('setStart'), disabled: !selectedItemId || !selectedItemEditable || refreshEditBlocked },
                { id: 'setEnd', label: t('menu.setEnd'), shortcut: 'O', action: () => run('setEnd'), disabled: !selectedItemId || !selectedItemEditable || refreshEditBlocked },
                { id: 'lockUnlock', label: t('menu.lockUnlock'), shortcut: 'Ctrl+Shift+L', action: () => run('toggleItemLocked'), disabled: !selectedItemId || !selectedItemEditable || refreshEditBlocked }
              ]
            : [])
        ]
      },
      {
        id: 'playback',
        label: t('menu.playback'),
        items: [
          {
            id: 'playPause',
            label: t('menu.playPause'),
            shortcut: 'Space',
            action: () => run('togglePlayPause'),
            disabled: !hasVideo
          },
          menuSeparator(),
          {
            id: 'smartReplay',
            label: t('menu.smartReplay'),
            shortcut: 'R',
            action: () => run('smartReplay'),
            disabled: !hasVideo
          },
          {
            id: 'fixedReplay',
            label: t('menu.fixedReplay'),
            shortcut: 'Shift+R',
            action: () => run('quickReplay'),
            disabled: !hasVideo
          },
          menuSeparator(),
          {
            id: 'prevSubtitleCue',
            label: t('menu.prevSubtitleCue'),
            shortcut: 'Alt+←',
            action: () => run('prevSubtitleCue'),
            disabled: !hasVideo
          },
          {
            id: 'nextSubtitleCue',
            label: t('menu.nextSubtitleCue'),
            shortcut: 'Alt+→',
            action: () => run('nextSubtitleCue'),
            disabled: !hasVideo
          },
          {
            id: 'repeatSubtitleCue',
            label: t('menu.repeatSubtitleCue'),
            shortcut: 'Alt+R',
            action: () => run('repeatSubtitleCue'),
            disabled: !hasVideo
          },
          menuSeparator(),
          {
            id: 'speedDown',
            label: t('menu.speedDown'),
            shortcut: '[',
            action: () => run('speedDown'),
            disabled: !hasVideo || !playbackCapabilities.canChangePlaybackRate
          },
          {
            id: 'speedUp',
            label: t('menu.speedUp'),
            shortcut: ']',
            action: () => run('speedUp'),
            disabled: !hasVideo || !playbackCapabilities.canChangePlaybackRate
          },
          menuSeparator(),
          {
            id: 'fullscreen',
            label: t('menu.fullscreen'),
            shortcut: 'F',
            action: () => run('toggleFullscreen'),
            disabled: !hasVideo || !playbackCapabilities.canFullscreen
          }
        ]
      },
      {
        id: 'track',
        label: t('menu.track'),
        items: [
          { id: 'loadTrack', label: t('menu.loadTrack'), action: () => run('loadTrack') },
          { id: 'compareImportSidecar', label: `${t('sidecar.title')}…`, action: () => run('compareImportSidecar') },
          menuSeparator(),
          {
            id: 'saveTrack',
            label: t('menu.saveTrack'),
            shortcut: 'Ctrl+S',
            action: () => run('saveTrack'),
            disabled: !canSave
          },
          {
            id: 'saveTrackAs',
            label: t('menu.saveTrackAs'),
            action: () => run('saveTrackAs'),
            disabled: !canSave
          },
          ...(playbackCapabilities.canShareVeil ? [{
            id: 'exportTrack',
            label: t('menu.exportShare'),
            action: () => run('openTrackExport'),
            disabled: !canSave
          }] : []),
          {
            id: 'closeTrack',
            label: t('menu.closeTrack'),
            action: () => run('closeTrack'),
            disabled: !hasVeil
          },
          menuSeparator(),
          {
            id: 'editVeil',
            label: t('menu.editVeil'),
            shortcut: 'E',
            action: () => run('setPlayerModeEdit'),
            disabled: !hasVideo || playerMode === 'edit'
          },
          ...(playbackCapabilities.canImportCustomSubtitles ? [{
            id: 'importSrt',
            label: t('menu.importSrt'),
            action: () => {
              requestOpenSubtitleSheet()
              window.requestAnimationFrame(() => {
                requestSubtitleImport()
              })
            },
            disabled: !hasVideo
          }] : []),
          ...(hasRangeAuthoring ? [{
            id: 'manualTrackBuilder',
            label: t('menu.manualTrackBuilder'),
            action: () => run('openManualTrackBuilder')
          }] : []),
          menuSeparator(),
          {
            id: 'trackInfo',
            label: t('menu.trackInfo'),
            action: () => openSidebarPanel('track-info'),
            disabled: !hasVideo
          },
          ...(hasRangeAuthoring ? [{
            id: 'offsetShift',
            label: t('menu.offsetShift'),
            action: () => openSidebarPanel('offset-shift'),
            disabled: !hasVideo
          }] : [])
        ]
      },
      {
        id: 'view',
        label: t('menu.view'),
        items: [
          ...(playbackCapabilities.canImportCustomSubtitles ? [{
            id: 'subtitles',
            label: t('menu.subtitles'),
            action: () => requestOpenSubtitleSheet(),
            disabled: !hasVideo
          }] : []),
          ...(playbackCapabilities.canUseVisualOverlays ? [{
            id: 'revealMasks',
            label: t('menu.revealMasksHold'),
            shortcut: 'Shift',
            action: () => {},
            disabled: true
          }] : []),
          ...(playbackCapabilities.canImportCustomSubtitles || playbackCapabilities.canUseVisualOverlays ? [menuSeparator()] : []),
          ...(uiRefreshV1
            ? [
                {
                  id: 'watchMode',
                  label: t('menu.watchMode'),
                  shortcut: 'E',
                  action: () => run('setPlayerModeWatch'),
                  disabled: !hasVideo || playerMode === 'watch'
                },
                {
                  id: 'editMode',
                  label: t('menu.editMode'),
                  shortcut: 'E',
                  action: () => run('setPlayerModeEdit'),
                  disabled: !hasVideo || playerMode === 'edit'
                }
              ]
            : [
                {
                  id: 'toggleSidebar',
                  label: sidebarCollapsed ? t('menu.showSidebar') : t('menu.hideSidebar'),
                  action: () => run('toggleSidebar'),
                  disabled: !hasVideo
                },
                {
                  id: 'toggleTimeline',
                  label: timelineVisible ? t('menu.hideTimeline') : t('menu.showTimeline'),
                  action: () => run('toggleTimeline'),
                  disabled: !hasVideo
                }
              ]),
          menuSeparator(),
          {
            id: 'toggleStatusBar',
            label: showStatusBar ? t('menu.hideStatusBar') : t('menu.showStatusBar'),
            action: () => run('toggleStatusBar')
          }
        ]
      },
      {
        id: 'help',
        label: t('menu.help'),
        items: [
          {
            id: 'keyboardShortcuts',
            label: t('menu.keyboardShortcuts'),
            shortcut: '?',
            action: () => run('openShortcutHelp')
          },
          menuSeparator(),
          {
            id: 'checkForUpdates',
            label: t('menu.checkForUpdates'),
            action: () => run('checkForUpdates')
          },
          { id: 'about', label: t('menu.about'), action: () => run('openAbout') }
        ]
      }
    ]
  }, [
    audioWatchMode,
    canSave,
    hasVeil,
    hasVideo,
    isAudioMode,
    language,
    hasRangeAuthoring,
    playbackCapabilities,
    playerMode,
    recentTargets,
    clearRecent,
    refreshEditBlocked,
    selectedItemId,
    selectedItemEditable,
    showStatusBar,
    sidebarCollapsed,
    timelineVisible,
    uiRefreshV1
  ])

  return (
    <nav
      ref={menuBarRef}
      className={`app-menu${embedded ? ' app-menu--embedded' : ''}${audioWatchMode ? ' app-menu--audio-watch' : ''}`}
      aria-label={t('menu.applicationMenu')}
    >
      {sections.map((section) => (
        <MenuDropdown
          key={section.id}
          section={section}
          isOpen={openMenuId === section.id}
          onToggle={() => toggleMenu(section.id)}
          onHover={() => {
            if (openMenuId !== null) {
              setOpenMenuId(section.id)
            }
          }}
          onClose={closeMenu}
        />
      ))}
    </nav>
  )
}
