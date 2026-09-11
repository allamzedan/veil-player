import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from 'react'
import AboutDialog from './components/AboutDialog'
import OpenYouTubeDialog from './components/OpenYouTubeDialog'
import MissingRecentFileDialog, { type MissingRecentTarget } from './components/MissingRecentFileDialog'
import AppErrorBoundary from './components/AppErrorBoundary'
import DesktopTitleBar from './components/DesktopTitleBar'
import FirstRunOverlay from './components/FirstRunOverlay'
import SettingsDialog from './components/SettingsDialog'
import EmptyState from './components/EmptyState'
import HomeLobby from './components/HomeLobby'
import MatchingVeilDialog from './components/MatchingVeilDialog'
import DebugOverlays from './components/DebugOverlays'
import ShortcutHelp from './components/ShortcutHelp'
import StatusBar from './components/StatusBar'
import ToastRegion from './components/ToastRegion'
import TrackSidebar from './components/TrackSidebar'
import VideoPlayer from './components/VideoPlayer'
import { useTrackGroupSession } from './hooks/useTrackGroupSession'
import { TrackFileActionsProvider, useTrackFileActionsContext } from './hooks/TrackFileActionsProvider'
import DirtySessionRecovery from './hooks/DirtySessionRecovery'
import { UnsavedChangesGuardProvider, useUnsavedChangesGuard } from './hooks/useUnsavedChangesGuard'
import { useVideoFileOpen } from './hooks/useVideoFileOpen'
import { isHomeWorkspaceInteractiveTarget } from './lib/homeWorkspace'
import { hasDesktopWindowControls } from './lib/veilEnv'
import { readShowStatusBar, writeShowStatusBar } from './lib/appChromePreferences'
import {
  readSidebarCollapsed,
  readTimelineVisible,
  writeSidebarCollapsed,
  writeTimelineVisible
} from './lib/playerChromePreferences'
import { recentVeilEntryFromTrack } from './lib/recentVeils'
import { recordRecentYouTube } from './lib/sessionRecovery'
import {
  readMotionPreferences,
  subscribeMotionPreferences
} from './lib/motionPreferences'
import { registerAppMenuActions } from './lib/appMenuBridge'
import type { RecentOpenTarget } from './lib/recentHistory'
import { runGuardedRecentOpen } from './lib/recentOpen'
import { runRecentRecovery } from './lib/recentRecovery'
import { parseAndDeserializeTrackJson, type VeilTrackStorePayload } from './lib/trackSerialization'
import SidecarCompareDialog from './components/SidecarCompareDialog'
import { sidecarMediaWarning } from './lib/sidecarCompare'
import { runClearTrackAction } from './lib/clearTrackAction'
import { isEditableTarget } from './lib/keyboard'
import { readUiRefreshV1, writeUiRefreshV1 } from './lib/uiRefreshV1'
import { hasVeilSession } from './lib/trackSession'
import { matchesBinding } from './lib/shortcutBindings'
import { KEY_HELP, matchesRedoShortcut, matchesUndoShortcut } from './lib/shortcuts'
import { redoTrack, undoTrack } from './lib/trackHistory'
import ManualTrackBuilderDialog from './components/ManualTrackBuilderDialog'
import TrackExportDialog from './components/TrackExportDialog'
import UpdateAvailableDialog from './components/UpdateAvailableDialog'
import {
  checkForUpdates,
  shouldRunAutomaticUpdateCheck,
  writeLastUpdateCheckAt,
  type UpdateInfo
} from './lib/updateChecker'
import { useLanguage } from './hooks/useLanguage'
import { t } from './i18n'
import type { YouTubeMediaSource } from './types/mediaSource'
import {
  clearDebugFlags,
  isMatchingDebugEnabled,
  updateMatchingDebug
} from './lib/debugState'
import { pushErrorToast, pushSuccessToast, pushWarningToast } from './state/useToastStore'
import { userMessages } from './lib/userMessages'
import { classifyWorkspaceDrop } from './lib/workspaceDrop'
import {
  setPlayerModeEditWithAudio,
  setPlayerModeWatchWithAudio,
  shouldShowMediaWorkspace,
  shouldShowAudioCompact,
  togglePlayerModeWithAudio
} from './lib/audioWorkspace'
import { useAudioWatchWindowLayout } from './hooks/useAudioWatchWindowLayout'
import { useVeilStore } from './state/useVeilStore'
import { usePlayerModeStore } from './state/usePlayerModeStore'
import { replaceWithCleanYouTubeSource } from './lib/youtubeSourceChange'
import { replaceWithCleanLocalSource } from './lib/videoOpenFlow'
import { inferMediaKindFromFileName } from './lib/mediaKind'
import { parseYouTubeUrl } from './lib/youtubeUrl'

const ENABLE_DEBUG_OVERLAYS = import.meta.env.DEV

function AppContent({
  trackMutatedRef
}: {
  trackMutatedRef: React.MutableRefObject<(() => void) | null>
}) {
  const language = useLanguage()
  const videoSrc = useVeilStore((state) => state.videoSrc)
  const mediaKind = useVeilStore((state) => state.mediaKind)
  const mediaSource = useVeilStore((state) => state.mediaSource)
  const videoFilePath = useVeilStore((state) => state.videoFilePath)
  const videoMetadata = useVeilStore((state) => state.videoMetadata)
  const trackFilePath = useVeilStore((state) => state.trackFilePath)
  const masks = useVeilStore((state) => state.masks)
  const mutes = useVeilStore((state) => state.mutes)
  const skips = useVeilStore((state) => state.skips)
  const bookmarks = useVeilStore((state) => state.bookmarks)
  const clearVideo = useVeilStore((state) => state.clearVideo)
  const closeTrack = useVeilStore((state) => state.closeTrack)
  const playerMode = usePlayerModeStore((state) => state.playerMode)

  const loadInputRef = useRef<HTMLInputElement>(null)
  const prevVideoSrcRef = useRef<string | null>(null)
  const promptedMatchingVideoOpenRef = useRef<string | null>(null)
  const enterEditAfterNextVeilLoadRef = useRef(false)
  const dragDepthRef = useRef(0)
  const { fileInputRef, onFileInputChange, openVideo, openVideoPath, loadVideoFile } = useVideoFileOpen()
  const groupSession = useTrackGroupSession()
  const { runIfAllowed } = useUnsavedChangesGuard()
  const handleOpenVideo = (): void => {
    void openVideo()
  }
  const handleOpenYouTube = (): void => {
    setOpenYouTubeOpen(true)
  }
  const handleLoadYouTube = useCallback(async (source: YouTubeMediaSource): Promise<void> => {
    setOpenYouTubeOpen(false)
    await runGuardedRecentOpen({
      runIfAllowed,
      open: () => {
        replaceWithCleanYouTubeSource(source, useVeilStore.getState())
        if (readUiRefreshV1()) {
          usePlayerModeStore.getState().resetPlayerMode()
        }
      },
      onOpened: () => recordRecentYouTube(source, source.title)
    })
  }, [runIfAllowed])
  const { pickAndLoadTrack, loadTrackFromJsonText, loadTrackFromPath, saveTrack, saveTrackAs, useNativeTrackDialogs } =
    useTrackFileActionsContext()

  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [openYouTubeOpen, setOpenYouTubeOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [firstRunOpen, setFirstRunOpen] = useState(false)
  const [sidecarCompareOpen, setSidecarCompareOpen] = useState(false)
  const [sidecarComparePayload, setSidecarComparePayload] = useState<VeilTrackStorePayload | null>(null)
  const [sidecarCompareWarning, setSidecarCompareWarning] = useState<string | null>(null)
  const [showStatusBar, setShowStatusBar] = useState(() => readShowStatusBar())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsed())
  const [timelineVisible, setTimelineVisible] = useState(() => readTimelineVisible())
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [manualTrackBuilderOpen, setManualTrackBuilderOpen] = useState(false)
  const [trackExportOpen, setTrackExportOpen] = useState(false)
  const [uiRefreshV1, setUiRefreshV1] = useState(() => readUiRefreshV1())
  const [matchingVeilCandidates, setMatchingVeilCandidates] = useState<string[]>([])
  const [matchingVeilOpen, setMatchingVeilOpen] = useState(false)
  const [workspaceDragActive, setWorkspaceDragActive] = useState(false)
  const [missingRecentTarget, setMissingRecentTarget] = useState<MissingRecentTarget | null>(null)
  const [recentRecoveryPending, setRecentRecoveryPending] = useState(false)
  const workspaceDropHandledRef = useRef(false)


  const showMissingRecent = useCallback((kind: 'video' | 'veil', filePath: string): void => {
    setMissingRecentTarget({ kind, filePath })
  }, [])

  const handleLocateMissingRecent = (): void => {
    const target = missingRecentTarget
    const api = window.veil
    if (!target || !api || recentRecoveryPending) return

    setRecentRecoveryPending(true)
    void (async (): Promise<void> => {
      if (target.kind === 'video') {
        const outcome = await runRecentRecovery({
          pick: async () => {
            const result = await api.openVideoDialog()
            return result.canceled ? null : result
          },
          validate: (candidate) => Boolean(
            candidate.mediaUrl &&
            candidate.name &&
            candidate.filePath &&
            inferMediaKindFromFileName(candidate.name)
          ),
          runIfAllowed,
          activate: (candidate) => {
            if (!candidate.mediaUrl || !candidate.name || !candidate.filePath) return false
            const mediaKind = inferMediaKindFromFileName(candidate.name)
            if (!mediaKind) return false
            replaceWithCleanLocalSource({
              src: candidate.mediaUrl,
              fileName: candidate.name,
              sourceKind: 'protocol',
              fileSizeBytes: candidate.size,
              filePath: candidate.filePath,
              mediaKind
            })
            return true
          },
          commit: async (candidate) => {
            await api.relocateRecentVideo(target.filePath, {
              kind: 'local',
              name: candidate.name!,
              mediaKey: candidate.mediaUrl!,
              filePath: candidate.filePath!,
              openedAt: Date.now()
            })
          }
        })
        if (outcome === 'opened') setMissingRecentTarget(null)
        return
      }

      const outcome = await runRecentRecovery({
        pick: async () => {
          const result = await api.loadTrackJson()
          return result.canceled ? null : result
        },
        validate: (candidate) => {
          if (!candidate.ok || !candidate.json || !candidate.filePath) return false
          const parsed = parseAndDeserializeTrackJson(candidate.json)
          if (!parsed.ok || !parsed.payload) {
            pushErrorToast(parsed.ok ? userMessages.invalidTrackPayload : parsed.message)
            return false
          }
          return true
        },
        runIfAllowed,
        activate: async (candidate) => {
          if (!candidate.json || !candidate.filePath) return false
          return (await loadTrackFromJsonText(candidate.json, {
            trackFilePath: candidate.filePath
          })) === 'loaded'
        },
        commit: async (candidate) => {
          if (!candidate.json || !candidate.filePath) return
          const parsed = parseAndDeserializeTrackJson(candidate.json)
          if (!parsed.ok) return
          await api.relocateRecentVeil(
            target.filePath,
            recentVeilEntryFromTrack(parsed.track, candidate.filePath)
          )
        }
      })
      if (outcome === 'opened') setMissingRecentTarget(null)
    })().catch((error: unknown) => {
      console.error('[VEIL] Recent recovery failed:', error)
      pushErrorToast(target.kind === 'video' ? userMessages.openVideoFailed : userMessages.loadFailed)
    }).finally(() => setRecentRecoveryPending(false))
  }

  const handleRemoveMissingRecent = (): void => {
    const target = missingRecentTarget
    const api = window.veil
    if (!target || !api || recentRecoveryPending) return
    setRecentRecoveryPending(true)
    const removal = target.kind === 'video'
      ? api.removeRecentVideo(target.filePath)
      : api.removeRecentVeil(target.filePath)
    void removal
      .then(() => setMissingRecentTarget(null))
      .catch(() => undefined)
      .finally(() => setRecentRecoveryPending(false))
  }
  const veilSessionActive = hasVeilSession({ trackFilePath, masks, mutes, skips, bookmarks })
  const showPlayerWorkspace = shouldShowMediaWorkspace(
    videoSrc,
    uiRefreshV1,
    veilSessionActive,
    playerMode,
    mediaSource
  )
  useAudioWatchWindowLayout(
    mediaKind,
    playerMode,
    Boolean(videoSrc) || mediaSource?.kind === 'youtube'
  )

  useEffect(() => {
    if (
      (videoSrc || mediaSource?.kind === 'youtube') &&
      videoSrc !== prevVideoSrcRef.current &&
      readUiRefreshV1()
    ) {
      usePlayerModeStore.getState().resetPlayerMode()
    }
    prevVideoSrcRef.current = videoSrc
  }, [videoSrc, mediaSource])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        clearDebugFlags()
        window.location.reload()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const applyMotionClass = (): void => {
      const prefs = readMotionPreferences()
      document.documentElement.classList.toggle(
        'motion-reduced',
        prefs.reduceMotion || prefs.disableTransitions
      )
    }
    applyMotionClass()
    return subscribeMotionPreferences(applyMotionClass)
  }, [])

  const onLoadTrack = useCallback((): void => {
    enterEditAfterNextVeilLoadRef.current = false
    void runIfAllowed(async () => {
      if (useNativeTrackDialogs) {
        await pickAndLoadTrack()
        return
      }
      loadInputRef.current?.click()
    })
  }, [pickAndLoadTrack, runIfAllowed, useNativeTrackDialogs])

  const enterEditModeAfterVeilLoad = useCallback((): void => {
    writeUiRefreshV1(true)
    setUiRefreshV1(true)
    usePlayerModeStore.getState().setPlayerMode('edit')
    setTimelineVisible(true)
    writeTimelineVisible(true)
    setSidebarCollapsed(false)
    writeSidebarCollapsed(false)
  }, [])

  const loadTrackFromPathForEdit = useCallback(
    async (filePath: string): Promise<void> => {
      const result = await loadTrackFromPath(filePath)
      if (result === 'loaded') {
        enterEditModeAfterVeilLoad()
      }
    },
    [enterEditModeAfterVeilLoad, loadTrackFromPath]
  )

  const loadTrackFromJsonTextForEdit = useCallback(
    async (jsonText: string): Promise<void> => {
      const result = await loadTrackFromJsonText(jsonText)
      if (result === 'loaded') {
        enterEditModeAfterVeilLoad()
      }
    },
    [enterEditModeAfterVeilLoad, loadTrackFromJsonText]
  )

  const onHomeLoadTrack = useCallback((): void => {
    enterEditAfterNextVeilLoadRef.current = true
    void runIfAllowed(async () => {
      if (useNativeTrackDialogs) {
        const result = await pickAndLoadTrack()
        if (result === 'loaded') {
          enterEditModeAfterVeilLoad()
        } else {
          enterEditAfterNextVeilLoadRef.current = false
        }
        return
      }
      loadInputRef.current?.click()
    })
  }, [enterEditModeAfterVeilLoad, pickAndLoadTrack, runIfAllowed, useNativeTrackDialogs])

  const promptMatchingVeils = useCallback(async (
    videoPath: string | null | undefined,
    reason = 'videoMetadataLoaded'
  ): Promise<void> => {
    updateMatchingDebug({
      videoFilePath: videoPath ?? null,
      videoMetadataLoaded: Boolean(useVeilStore.getState().videoMetadata),
      matchingCheckTriggeredAt: new Date().toISOString(),
      matchingCheckReason: reason,
      matchingError: null
    })

    if (!videoPath || !window.veil?.findMatchingVeils) {
      updateMatchingDebug({ matchingError: !videoPath ? 'missing_video_path' : 'missing_findMatchingVeils_api' })
      return
    }

    try {
      if (isMatchingDebugEnabled() && window.veil?.debugMatchingVeil) {
        const debugResult = await window.veil.debugMatchingVeil(videoPath)
        updateMatchingDebug({
          candidatePaths: debugResult.candidates,
          candidateExists: debugResult.exists,
          matchingError: debugResult.error
        })
      }

      const candidates = await window.veil.findMatchingVeils(videoPath)
      if (candidates.length === 0) {
        updateMatchingDebug({ matchingDialogOpen: false })
        return
      }

      setMatchingVeilCandidates(candidates)
      setMatchingVeilOpen(true)
      updateMatchingDebug({ matchingDialogOpen: true })
    } catch (error) {
      updateMatchingDebug({
        matchingError: error instanceof Error ? error.message : String(error)
      })
    }
  }, [])

  useEffect(() => {
    if (!videoSrc || !videoMetadata || !videoFilePath) {
      return
    }
    const promptKey = `${videoSrc}\0${videoFilePath}`
    if (promptedMatchingVideoOpenRef.current === promptKey) {
      return
    }
    promptedMatchingVideoOpenRef.current = promptKey
    void promptMatchingVeils(videoFilePath)
  }, [promptMatchingVeils, videoFilePath, videoMetadata, videoSrc])

  const handleLoadMatchingVeil = useCallback(
    (filePath: string): void => {
      setMatchingVeilOpen(false)
      setMatchingVeilCandidates([])
      void runIfAllowed(async () => {
        await loadTrackFromPath(filePath)
      })
    },
    [loadTrackFromPath, runIfAllowed]
  )

  const handleIgnoreMatchingVeil = useCallback((): void => {
    setMatchingVeilOpen(false)
    setMatchingVeilCandidates([])
    updateMatchingDebug({ matchingDialogOpen: false })
  }, [])

  useEffect(() => {
    updateMatchingDebug({
      videoFilePath,
      videoMetadataLoaded: Boolean(videoMetadata),
      matchingDialogOpen: matchingVeilOpen
    })
  }, [matchingVeilOpen, videoFilePath, videoMetadata])

  useEffect(() => {
    const debugWindow = window as typeof window & {
      veilDebug?: {
        seekTo?: (time: number) => void
        checkMatchingVeil?: () => Promise<void>
      }
    }
    debugWindow.veilDebug = {
      ...(debugWindow.veilDebug ?? {}),
      checkMatchingVeil: () => promptMatchingVeils(videoFilePath, 'debugFunction')
    }
    return () => {
      if (debugWindow.veilDebug?.checkMatchingVeil) {
        delete debugWindow.veilDebug.checkMatchingVeil
      }
    }
  }, [promptMatchingVeils, videoFilePath])

  useEffect(() => {
    const unsubscribe = window.veil?.onStartupAction?.((action) => {
      if (action === 'settings') {
        setSettingsOpen(true)
        return
      }
      if (action === 'openYouTube') {
        setOpenYouTubeOpen(true)
        return
      }
      if (typeof action === 'object' && action.type === 'openYouTubeUrl') {
        const parsed = parseYouTubeUrl(action.url)
        if (!parsed.ok) {
          pushErrorToast(parsed.message)
          return
        }
        void handleLoadYouTube(parsed.source)
        return
      }
      if (typeof action === 'object' && action.type === 'openVideoPath') {
        void openVideoPath(action.filePath)
        return
      }
      if (typeof action === 'object' && action.type === 'loadVeilPath') {
        void runIfAllowed(async () => {
          const result = await loadTrackFromPath(action.filePath)
          if (result === 'loaded' && action.openEditModeAfterLoad !== false) {
            enterEditModeAfterVeilLoad()
          }
        })
        return
      }
      if (typeof action === 'object' && action.type === 'recentFileMissing') {
        showMissingRecent(action.kind, action.filePath)
      }
    })
    return () => {
      unsubscribe?.()
    }
  }, [enterEditModeAfterVeilLoad, loadTrackFromPath, openVideoPath, runIfAllowed, handleLoadYouTube, showMissingRecent])

  const runUpdateCheck = useCallback(async (mode: 'auto' | 'manual'): Promise<void> => {
    if (mode === 'auto' && !shouldRunAutomaticUpdateCheck()) {
      return
    }

    const result = await checkForUpdates()
    writeLastUpdateCheckAt(Date.now())

    if (!result.ok) {
      return
    }

    if (result.updateAvailable) {
      setUpdateInfo(result.info)
      setUpdateDialogOpen(true)
      return
    }

    if (mode === 'manual') {
      pushSuccessToast(t('toast.upToDate'))
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void runUpdateCheck('auto')
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [runUpdateCheck])

  const toggleStatusBar = useCallback((): void => {
    setShowStatusBar((current) => {
      const next = !current
      writeShowStatusBar(next)
      return next
    })
  }, [])

    const openSidecarCompare = useCallback(async (): Promise<void> => {
      if (!useNativeTrackDialogs) return
      const result = await window.veil!.loadTrackJson()
      if (result.canceled || !result.ok || !result.json) return
      const parsed = parseAndDeserializeTrackJson(result.json)
      if (!parsed.ok || !parsed.payload) {
        pushErrorToast(parsed.ok ? 'Invalid VEIL payload' : parsed.message)
        return
      }
      const current = useVeilStore.getState()
      const warning = sidecarMediaWarning(parsed.track.video, current.videoFileName, current.videoMetadata) ?? 'The imported sidecar will be compared only; it will not replace the current session.'
      setSidecarComparePayload(parsed.payload)
      setSidecarCompareWarning(warning)
      setSidecarCompareOpen(true)
    }, [useNativeTrackDialogs])

    const currentSidecarPayload: VeilTrackStorePayload = {
      masks,
      mutes,
      skips,
      bookmarks,
      globalOffsetSeconds: 0,
      trackMetadata: {},
      groups: [],
      anchors: [],
      subtitleCoverMode: 'show',
      regionCoverRect: { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 }
    }

  useEffect(() => {
    const closeTrackAfterSave = (): void => {
      closeTrack()
      trackMutatedRef.current?.()
      if (useVeilStore.getState().videoSrc) {
        usePlayerModeStore.getState().setPlayerMode('watch')
      }
    }

    registerAppMenuActions({
      openVideo: handleOpenVideo,
      openYouTube: handleOpenYouTube,
      openRecentTarget: (target: RecentOpenTarget) => {
        if (target.kind === 'local') {
          void (async (): Promise<void> => {
            if (!await window.veil?.recentPathExists(target.filePath)) {
              showMissingRecent('video', target.filePath)
              return
            }
            await openVideoPath(target.filePath)
          })()
          return
        }
        if (target.kind === 'youtube') {
          const parsed = parseYouTubeUrl(target.url)
          if (!parsed.ok) {
            pushErrorToast(parsed.message)
            return
          }
          void handleLoadYouTube(parsed.source)
          return
        }
        void runGuardedRecentOpen({
          validate: async () => Boolean(await window.veil?.recentPathExists(target.filePath)),
          runIfAllowed,
          open: async () => { await loadTrackFromPath(target.filePath) },
          onMissing: () => {
            showMissingRecent('veil', target.filePath)
          }
        })
      },
      loadTrack: onLoadTrack,
      compareImportSidecar: () => { void openSidecarCompare() },
      saveTrack: () => {
        void saveTrack()
      },
      saveAndCloseTrack: () => {
        void (async (): Promise<void> => {
          const result = await saveTrack({ saveAs: !useVeilStore.getState().trackFilePath })
          if (result === 'saved') {
            closeTrackAfterSave()
          }
        })()
      },
      saveTrackAs: () => {
        void saveTrackAs()
      },
      closeVideo: () => {
        void runIfAllowed(() => {
          clearVideo()
        })
      },
      closeTrack: () => {
        void runIfAllowed(() => {
          closeTrackAfterSave()
        })
      },
      exitApp: () => {
        window.close()
      },
      undo: () => {
        if (!undoTrack()) {
          pushWarningToast(t('toast.nothingUndo'))
        }
      },
      redo: () => {
        if (!redoTrack()) {
          pushWarningToast(t('toast.nothingRedo'))
        }
      },
      openShortcutHelp: () => setShortcutHelpOpen(true),
      openAbout: () => setAboutOpen(true),
      openSettings: () => setSettingsOpen(true),
      toggleStatusBar,
      checkForUpdates: () => {
        void runUpdateCheck('manual')
      },
      openManualTrackBuilder: () => {
        setManualTrackBuilderOpen(true)
      },
      openTrackExport: () => {
        setTrackExportOpen(true)
      },
      clearTrack: () => {
        runClearTrackAction({
          runIfAllowed,
          onAfter: () => trackMutatedRef.current?.()
        })
      },
      setPlayerModeWatch: () => {
        if (readUiRefreshV1()) {
          setPlayerModeWatchWithAudio()
        }
      },
      setPlayerModeEdit: () => {
        if (readUiRefreshV1()) {
          setPlayerModeEditWithAudio()
        }
      },
      togglePlayerMode: () => {
        if (readUiRefreshV1()) {
          togglePlayerModeWithAudio()
        }
      }
    })
  }, [
    clearVideo,
    closeTrack,
    handleOpenVideo,
    handleOpenYouTube,
    handleLoadYouTube,
    loadTrackFromPath,
    onLoadTrack,
    openSidecarCompare,
    openVideoPath,
    runIfAllowed,
    runUpdateCheck,
    saveTrack,
    saveTrackAs,
    toggleStatusBar
  ])

  useEffect(() => {
    return window.veil?.onCloseRequested?.(() => {
      void runIfAllowed(async () => {
        await window.veil?.confirmClose()
      })
    })
  }, [runIfAllowed])

  useEffect(() => {
    if (hasDesktopWindowControls()) {
      return
    }

    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (useVeilStore.getState().isTrackDirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveTrack()
        return
      }

      if (matchesUndoShortcut(event) || matchesBinding(event, 'undo')) {
        event.preventDefault()
        if (!undoTrack()) {
          pushWarningToast(t('toast.nothingUndo'))
        }
        return
      }

      if (matchesRedoShortcut(event) || matchesBinding(event, 'redo')) {
        event.preventDefault()
        if (!redoTrack()) {
          pushWarningToast(t('toast.nothingRedo'))
        }
        return
      }

      if (event.key === KEY_HELP || matchesBinding(event, 'openHelp')) {
        event.preventDefault()
        setShortcutHelpOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveTrack])

  const onEmptyLoadFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    void runIfAllowed(async () => {
      const text = await file.text().catch(() => null)
      if (text === null) {
        enterEditAfterNextVeilLoadRef.current = false
        return
      }
      const shouldEnterEdit = enterEditAfterNextVeilLoadRef.current
      enterEditAfterNextVeilLoadRef.current = false
      const result = await loadTrackFromJsonText(text)
      if (result === 'loaded' && shouldEnterEdit) {
        enterEditModeAfterVeilLoad()
      }
    })
  }

  const handleWorkspaceDroppedFiles = useCallback(
    (files: FileList | File[]): void => {
      const file = [...files][0]
      if (!file) {
        return
      }

      const filePath = (file as File & { path?: string }).path
      const hasOpenMedia = Boolean(useVeilStore.getState().videoSrc)
      const dropAction = classifyWorkspaceDrop(file.name, file.type, hasOpenMedia)

      if (dropAction.kind === 'veil') {
        void runIfAllowed(async () => {
          if (filePath) {
            if (dropAction.enterEditMode) {
              await loadTrackFromPathForEdit(filePath)
            } else {
              await loadTrackFromPath(filePath)
            }
            return
          }

          const text = await file.text().catch(() => null)
          if (text === null) {
            pushErrorToast(userMessages.readTrackFailed)
            return
          }
          if (dropAction.enterEditMode) {
            await loadTrackFromJsonTextForEdit(text)
          } else {
            await loadTrackFromJsonText(text)
          }
        })
        return
      }

      if (dropAction.kind === 'media') {
        loadVideoFile(file)
        return
      }

      pushErrorToast(userMessages.invalidMedia)
    },
    [
      loadTrackFromJsonText,
      loadTrackFromJsonTextForEdit,
      loadTrackFromPath,
      loadTrackFromPathForEdit,
      loadVideoFile,
      runIfAllowed
    ]
  )

  const isFileDrag = (event: DragEvent<HTMLElement>): boolean =>
    event.dataTransfer.types.includes('Files')

  const isLeavingWorkspace = (event: DragEvent<HTMLElement>): boolean => {
    const related = event.relatedTarget
    const current = event.currentTarget
    return !(related instanceof Node && current instanceof Node && current.contains(related))
  }

  const onWorkspaceDragEnter = (event: DragEvent<HTMLElement>): void => {
    if (!isFileDrag(event)) {
      return
    }
    event.preventDefault()
    if (!isLeavingWorkspace(event)) {
      return
    }
    dragDepthRef.current += 1
    setWorkspaceDragActive(true)
  }

  const onWorkspaceDragOver = (event: DragEvent<HTMLElement>): void => {
    if (!isFileDrag(event)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setWorkspaceDragActive(true)
  }

  const onWorkspaceDragLeave = (event: DragEvent<HTMLElement>): void => {
    if (!isFileDrag(event)) {
      return
    }
    event.preventDefault()
    if (!isLeavingWorkspace(event)) {
      return
    }
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setWorkspaceDragActive(false)
    }
  }

  const onWorkspaceDrop = (event: DragEvent<HTMLElement>): void => {
    if (!isFileDrag(event)) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (workspaceDropHandledRef.current) {
      return
    }
    workspaceDropHandledRef.current = true
    window.requestAnimationFrame(() => {
      workspaceDropHandledRef.current = false
    })
    dragDepthRef.current = 0
    setWorkspaceDragActive(false)
    if (event.dataTransfer.files.length > 0) {
      handleWorkspaceDroppedFiles(event.dataTransfer.files)
    }
  }

  useEffect(() => {
    const resetWorkspaceDrag = (): void => {
      dragDepthRef.current = 0
      setWorkspaceDragActive(false)
    }
    window.addEventListener('dragend', resetWorkspaceDrag)
    return () => window.removeEventListener('dragend', resetWorkspaceDrag)
  }, [])

  const onWorkspaceHomeClick = (event: MouseEvent<HTMLElement>): void => {
    if (!homeWorkspaceActive || isHomeWorkspaceInteractiveTarget(event.target)) {
      return
    }
    handleOpenVideo()
  }

  const homeWorkspaceActive = uiRefreshV1 && !showPlayerWorkspace
  const workspaceDragOverlayActive = workspaceDragActive
  const desktopShell = hasDesktopWindowControls()
  const audioWatchMode =
    Boolean(videoSrc) && shouldShowAudioCompact(mediaKind, playerMode)

  return (
    <>
      <div
        className={`app${showStatusBar ? '' : ' app--no-status-bar'}${language === 'ar' ? ' app--rtl' : ''}${uiRefreshV1 ? ' app--ui-refresh-v1' : ''}${desktopShell ? ' app--desktop-shell' : ''}${workspaceDragOverlayActive ? ' app--workspace-drag-active' : ''}${audioWatchMode ? ' app--audio-watch' : ''}`}
        dir={language === 'ar' ? 'rtl' : undefined}
      >
      <DesktopTitleBar
        onOpenVideo={handleOpenVideo}
        showStatusBar={showStatusBar}
        sidebarCollapsed={sidebarCollapsed}
        timelineVisible={timelineVisible}
      />

      <main
        className={`app-main${showPlayerWorkspace ? ' app-main--player-workspace' : ''}${audioWatchMode ? ' app-main--audio-watch' : ''}${workspaceDragOverlayActive ? ' app-main--drag-active' : ''}`}
        onDragEnter={onWorkspaceDragEnter}
        onDragLeave={onWorkspaceDragLeave}
        onDragOverCapture={onWorkspaceDragOver}
        onDropCapture={onWorkspaceDrop}
        onClick={homeWorkspaceActive ? onWorkspaceHomeClick : undefined}
      >
        {showPlayerWorkspace ? (
          <VideoPlayer
            trackMutatedRef={trackMutatedRef}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarCollapsedChange={(collapsed) => {
              setSidebarCollapsed(collapsed)
              writeSidebarCollapsed(collapsed)
            }}
            timelineVisible={timelineVisible}
            onTimelineVisibleChange={(visible) => {
              setTimelineVisible(visible)
              writeTimelineVisible(visible)
            }}
            onOpenVideo={handleOpenVideo}
          />
        ) : uiRefreshV1 ? (
          <div className={`workspace-home${workspaceDragOverlayActive ? ' workspace-home--drag-active' : ''}`}>
            <HomeLobby
              compact
              onOpenVideo={handleOpenVideo}
              onOpenYouTube={handleOpenYouTube}
              onLoadTrack={onHomeLoadTrack}
              onLearnMore={() => setFirstRunOpen(true)}
            />
          </div>
        ) : (
          <div className="workspace-no-video">
            <div className="workspace-no-video__main">
              <EmptyState onOpenVideo={handleOpenVideo} onLoadTrack={onLoadTrack} />
            </div>
            <TrackSidebar
              videoRef={{ current: null }}
              activeMaskIds={new Set()}
              activeMuteIds={new Set()}
              activeSkipIds={new Set()}
              getCurrentTime={() => 0}
              hasVideo={false}
              groupSession={groupSession}
              onAfterTimingMutation={() => trackMutatedRef.current?.()}
            />
          </div>
        )}
      </main>

      {showStatusBar ? <StatusBar /> : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
        hidden
        onChange={onFileInputChange}
      />
      <input
        ref={loadInputRef}
        type="file"
        accept=".veil,.veil.json,.json,application/json"
        hidden
        onChange={onEmptyLoadFileChange}
      />
      <ToastRegion />
      <div
        className={`workspace-drop-overlay${workspaceDragOverlayActive ? ' workspace-drop-overlay--active' : ''}`}
        aria-hidden={!workspaceDragOverlayActive}
      >
        <p className="workspace-drop-overlay__title">{t('dropOverlay.title')}</p>
      </div>
      <ShortcutHelp open={shortcutHelpOpen} onClose={() => setShortcutHelpOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <OpenYouTubeDialog
        open={openYouTubeOpen}
        onClose={() => setOpenYouTubeOpen(false)}
        onLoad={handleLoadYouTube}
      />
      <MissingRecentFileDialog
        target={missingRecentTarget}
        pending={recentRecoveryPending}
        onLocate={handleLocateMissingRecent}
        onRemove={handleRemoveMissingRecent}
        onCancel={() => setMissingRecentTarget(null)}
      />      <UpdateAvailableDialog
        open={updateDialogOpen}
        info={updateInfo}
        onClose={() => setUpdateDialogOpen(false)}
      />
      <SettingsDialog
        open={settingsOpen}
        showStatusBar={showStatusBar}
        onShowStatusBarChange={setShowStatusBar}
        onClose={() => setSettingsOpen(false)}
      />
      {firstRunOpen ? (
        <FirstRunOverlay open onDismiss={() => setFirstRunOpen(false)} />
      ) : null}
      <ManualTrackBuilderDialog
        open={manualTrackBuilderOpen}
        hasVideo={Boolean(videoSrc)}
        videoDuration={videoMetadata?.duration ?? null}
        onClose={() => setManualTrackBuilderOpen(false)}
        onImported={() => trackMutatedRef.current?.()}
      />
      <TrackExportDialog open={trackExportOpen} onClose={() => setTrackExportOpen(false)} />
      <SidecarCompareDialog
        open={sidecarCompareOpen}
        current={currentSidecarPayload}
        imported={sidecarComparePayload}
        mediaWarning={sidecarCompareWarning}
        onCancel={() => setSidecarCompareOpen(false)}
        onApply={(payload) => {
          useVeilStore.getState().addTrackItemsBatch(payload)
          setSidecarCompareOpen(false)
          setSidecarComparePayload(null)
          trackMutatedRef.current?.()
        }}
      />
      <MatchingVeilDialog
        open={matchingVeilOpen}
        candidates={matchingVeilCandidates}
        onLoad={handleLoadMatchingVeil}
        onIgnore={handleIgnoreMatchingVeil}
      />
      {ENABLE_DEBUG_OVERLAYS ? <DebugOverlays /> : null}
      </div>
    </>
  )
}

export default function App() {
  const trackMutatedRef = useRef<(() => void) | null>(null)

  return (
    <AppErrorBoundary>
      <TrackFileActionsProvider onAfterTrackMutation={() => trackMutatedRef.current?.()}>
        <DirtySessionRecovery />
        <UnsavedChangesGuardProvider>
          <AppContent trackMutatedRef={trackMutatedRef} />
        </UnsavedChangesGuardProvider>
      </TrackFileActionsProvider>
    </AppErrorBoundary>
  )
}
