import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { runAppMenuAction } from '../lib/appMenuBridge'
import { openSidebarPanel } from '../lib/sidebarPanelBridge'
import {
  hasTrackChipContent,
  resolveTrackDisplayName
} from '../lib/trackChipLabel'
import { readUiRefreshV1 } from '../lib/uiRefreshV1'
import { t } from '../i18n'
import { usePlayerModeStore } from '../state/usePlayerModeStore'
import { useVeilStore } from '../state/useVeilStore'
import { resolvePlaybackCapabilities } from '../lib/playbackCapabilities'
import { canCreateRangeActions } from '../lib/authoringCapabilities'

// TODO(I3+): Wire Track Disabled state when store supports track-level enable/disable.

function TrackChipVeilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 4.5 8 2l6 2.5v7L8 14 2 11.5v-7z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M8 7.5V14M2 4.5l6 2.5 6-2.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrackChipCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6.25 4.75 9 10 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface TrackChipMenuItem {
  id: string
  label: string
  action: () => void
  emphasize?: boolean
  danger?: boolean
}

export default function TrackChip() {
  useLanguage()

  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const isTrackDirty = useVeilStore((state) => state.isTrackDirty)
  const trackFilePath = useVeilStore((state) => state.trackFilePath)
  const trackMetadata = useVeilStore((state) => state.trackMetadata)
  const videoFileName = useVeilStore((state) => state.videoFileName)
  const playerMode = usePlayerModeStore((state) => state.playerMode)
  const useWatchLabels = readUiRefreshV1() && playerMode === 'watch'
  const capabilities = useMemo(
    () => resolvePlaybackCapabilities(mediaSource, mediaKind),
    [mediaKind, mediaSource]
  )
  const hasRangeAuthoring = canCreateRangeActions(capabilities)

  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const hasTrack = hasTrackChipContent({
    maskCount: masks.length,
    muteCount: mutes.length,
    skipCount: skips.length,
    bookmarkCount: bookmarks.length,
    isTrackDirty,
    trackFilePath,
    trackMetadataTitle: trackMetadata.title
  })

  const displayName = useMemo(
    () =>
      resolveTrackDisplayName({
        trackMetadataTitle: trackMetadata.title,
        videoFileName,
        loadedTrackFileName: trackFilePath?.split(/[\\/]/).pop(),
        untitledLabel: t('trackChip.untitledTrack')
      }),
    [trackFilePath, trackMetadata.title, videoFileName]
  )

  const ariaLabel = useMemo(() => {
    if (!hasTrack) {
      return useWatchLabels ? t('watch.noTrack') : t('trackChip.ariaNoTrack')
    }
    if (isTrackDirty) {
      return useWatchLabels
        ? t('watch.trackLoaded', { name: displayName })
        : t('trackChip.ariaDirty', { name: displayName })
    }
    return useWatchLabels
      ? t('watch.trackLoaded', { name: displayName })
      : t('trackChip.ariaLoaded', { name: displayName })
  }, [displayName, hasTrack, isTrackDirty, useWatchLabels])

  const closeMenu = useCallback((): void => {
    setMenuOpen(false)
  }, [])

  const openCreateTrack = useCallback((): void => {
    openSidebarPanel('create')
  }, [])

  const openTrackInfo = useCallback((): void => {
    openSidebarPanel('track-info')
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const onPointerDown = (event: PointerEvent): void => {
      const root = rootRef.current
      if (!root) {
        return
      }
      const target = event.target
      if (target instanceof Node && !root.contains(target)) {
        closeMenu()
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [closeMenu, menuOpen])

  const menuItems: TrackChipMenuItem[] = (hasTrack
    ? [
        {
          id: 'save',
          label: t('trackChip.saveTrack'),
          action: () => runAppMenuAction('saveTrack'),
          emphasize: isTrackDirty
        },
        {
          id: 'saveAs',
          label: t('trackChip.saveTrackAs'),
          action: () => runAppMenuAction('saveTrackAs')
        },
        {
          id: 'export',
          label: t('trackChip.exportShare'),
          action: () => runAppMenuAction('openTrackExport')
        },
        {
          id: 'replace',
          label: t('trackChip.replaceTrack'),
          action: () => runAppMenuAction('loadTrack')
        },
        {
          id: 'compareImport',
          label: 'Compare / Import VEIL…',
          action: () => runAppMenuAction('compareImportSidecar')
        },
        {
          id: 'remove',
          label: t('trackChip.closeTrack'),
          action: () => runAppMenuAction('closeTrack'),
          danger: true
        },
        {
          id: 'info',
          label: t('trackChip.trackInfo'),
          action: openTrackInfo
        },
        {
          id: 'manual',
          label: t('trackChip.manualBuilder'),
          action: () => runAppMenuAction('openManualTrackBuilder')
        }
      ]
    : [
        {
          id: 'load',
          label: t('trackChip.loadTrack'),
          action: () => runAppMenuAction('loadTrack')
        },
        {
          id: 'create',
          label: t('trackChip.createTrack'),
          action: openCreateTrack
        },
        {
          id: 'manual',
          label: t('trackChip.manualBuilder'),
          action: () => runAppMenuAction('openManualTrackBuilder')
        }
      ]).filter((item) => {
        if (item.id === 'manual' || item.id === 'create') {
          return hasRangeAuthoring
        }
        if (item.id === 'export') {
          return capabilities.canShareVeil
        }
        if (item.id === 'save' || item.id === 'saveAs') {
          return capabilities.canSaveVeil
        }
        return true
      })

  const onToggleMenu = (): void => {
    setMenuOpen((open) => !open)
  }

  const onMenuItemClick = (item: TrackChipMenuItem): void => {
    item.action()
    closeMenu()
  }

  const chipStateClass = !hasTrack
    ? 'track-chip--empty'
    : isTrackDirty
      ? 'track-chip--loaded track-chip--dirty'
      : 'track-chip--loaded track-chip--saved'

  return (
    <div className="track-chip-wrap" ref={rootRef}>
      <button
        type="button"
        className={['track-chip', chipStateClass].join(' ')}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        onClick={onToggleMenu}
      >
        {!hasTrack ? (
          <>
            <TrackChipVeilIcon className="track-chip__icon" />
            <span className="track-chip__name">
              {useWatchLabels ? t('watch.noTrack') : t('trackChip.noTrack')}
            </span>
          </>
        ) : (
          <>
            {isTrackDirty ? (
              <span
                className="track-chip__status-dot"
                aria-hidden
                title={t('trackChip.dirtyLabel')}
              />
            ) : (
              <TrackChipCheckIcon className="track-chip__status-check" />
            )}
            <span className="track-chip__name">{displayName}</span>
          </>
        )}
      </button>
      {menuOpen ? (
        <ul className="track-chip-menu" id={menuId} role="menu" aria-label={t('trackChip.menuAria')}>
          {menuItems.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={[
                  'track-chip-menu__item',
                  item.emphasize ? 'track-chip-menu__item--emphasize' : '',
                  item.danger ? 'track-chip-menu__item--danger' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onMenuItemClick(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
