import { app, BrowserWindow, ipcMain, Menu, protocol, shell } from 'electron'
import { appendFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  getApprovedAbsolutePath,
  PRIVILEGED_VEIL_MEDIA_HOSTNAME,
  registerApprovedMediaHandlers
} from './ipc/approvedMedia'
import { buildMediaRangeResponse } from './lib/mediaRangeResponse'
import { registerDialogHandlers } from './ipc/dialogs'
import {
  registerLauncherHandlers,
  sendStartupActionToMain,
  type LauncherAction,
  type StartupAction
} from './ipc/launcher'
import { registerTrackFileHandlers } from './ipc/trackFiles'
import { registerExternalHandlers } from './ipc/external'
import { registerYouTubeMetadataHandlers } from './ipc/youtubeMetadata'
import { registerMatchingVeilHandlers } from './ipc/matchingVeil'
import { attachWindowStateEvents, registerWindowControlHandlers } from './ipc/windowControls'
import { parseLaunchPath } from './lib/launchFile'
import { listPreloadCandidates, resolvePreloadScript } from './lib/preloadPath'
import {
  resolvePackagedRendererRoot,
  startRendererServer,
  type RendererServer
} from './lib/rendererServer'
import { evaluateTopLevelNavigation } from './lib/navigationPolicy'
import { RecentHistoryStore } from './lib/recentHistoryStore'
import { registerRecentHistoryHandlers } from './ipc/recentHistory'
import { buildTextEditContextMenuTemplate } from './lib/textEditContextMenu'
import { SessionRecoveryStore } from './lib/sessionRecoveryStore'
import { registerSessionRecoveryHandlers } from './ipc/sessionRecovery'
import { ContentReviewPreferencesStore } from './lib/contentReviewPreferencesStore'
import { registerContentReviewPreferencesHandlers } from './ipc/contentReviewPreferences'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let launcherWindow: BrowserWindow | null = null
let pendingLaunchFilePath: { kind: 'veil' | 'media'; filePath: string } | null = parseLaunchPath(process.argv)
let rendererCloseConfirmed = false
let rendererServer: RendererServer | null = null
let rendererServerStarting: Promise<RendererServer> | null = null
let rendererServerClosing: Promise<void> | null = null

function installLocalCrashLog(): void {
  const logPath = join(app.getPath('userData'), 'veil-crash.log')

  const append = (label: string, detail: unknown): void => {
    try {
      const body =
        detail instanceof Error
          ? (detail.stack ?? detail.message)
          : typeof detail === 'string'
            ? detail
            : JSON.stringify(detail)
      appendFileSync(logPath, `[${new Date().toISOString()}] ${label}\n${body}\n\n`, 'utf8')
    } catch {
      // ignore write failures
    }
  }

  process.on('uncaughtException', (error) => {
    append('uncaughtException', error)
  })

  process.on('unhandledRejection', (reason) => {
    append('unhandledRejection', reason)
  })
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'veil-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: false
    }
  },
  {
    scheme: 'veil',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: false,
      corsEnabled: false
    }
  }
])

function registerMediaProtocol(): void {
  protocol.handle('veil-media', async (request) => {
    const url = new URL(request.url)

    if (url.hostname !== PRIVILEGED_VEIL_MEDIA_HOSTNAME) {
      return new Response('Not found', { status: 404 })
    }

    if (url.search.length > 0) {
      return new Response('query string is not allowed', { status: 400 })
    }

    const pathOnly = url.pathname.replace(/^\/+/, '')
    const segments = pathOnly.split('/').filter((s) => s.length > 0)
    if (segments.length !== 1) {
      return new Response('Expected a single media id in the path', { status: 400 })
    }

    const mediaId = decodeURIComponent(segments[0])
    if (!mediaId) {
      return new Response('Missing media id', { status: 400 })
    }

    const absolutePath = getApprovedAbsolutePath(mediaId)
    if (!absolutePath) {
      return new Response('Unknown or revoked media id', { status: 403 })
    }

    return buildMediaRangeResponse(absolutePath, request.headers.get('range'))
  })
}

function resolveWindowIcon(): string | undefined {
  const candidates = [
    join(app.getAppPath(), 'build', 'icon.ico'),
    join(app.getAppPath(), 'build', 'icon.png'),
    join(process.resourcesPath, 'build', 'icon.ico'),
    join(process.resourcesPath, 'build', 'icon.png'),
    join(process.cwd(), 'build', 'icon.ico'),
    join(process.cwd(), 'build', 'icon.png'),
    join(__dirname, '../../build/icon.ico'),
    join(__dirname, '../../build/icon.png')
  ]
  return candidates.find((path) => existsSync(path))
}

function resolvePreloadScriptForWindow(): string {
  try {
    const resolved = resolvePreloadScript(__dirname)
    return resolved
  } catch (error) {
    const tried = listPreloadCandidates(__dirname)
    console.error('[VEIL] Preload script not found; tried:', tried)
    throw error
  }
}

function buildWebPreferences(): Electron.WebPreferences {
  return {
    preload: resolvePreloadScriptForWindow(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true
  }
}

async function ensureRendererServer(): Promise<RendererServer> {
  if (rendererServer) {
    return rendererServer
  }
  if (rendererServerStarting) {
    return rendererServerStarting
  }

  rendererServerStarting = (async () => {
    const root = resolvePackagedRendererRoot(__dirname)
    const server = await startRendererServer(root)
    rendererServer = server
    console.info(`[VEIL] Packaged renderer loopback origin: ${server.origin}`)
    return server
  })()

  try {
    return await rendererServerStarting
  } catch (error) {
    rendererServer = null
    throw error
  } finally {
    rendererServerStarting = null
  }
}

async function closeRendererServer(): Promise<void> {
  if (rendererServerClosing) {
    return rendererServerClosing
  }

  rendererServerClosing = (async () => {
    let server = rendererServer
    const pending = rendererServerStarting
    rendererServer = null
    rendererServerStarting = null

    if (!server && pending) {
      try {
        server = await pending
      } catch {
        server = null
      }
    }

    // The start IIFE may assign rendererServer while we awaited the pending promise.
    rendererServer = null
    rendererServerStarting = null

    if (!server) {
      return
    }
    try {
      await server.close()
    } catch (error) {
      console.error('[VEIL] Failed to close renderer loopback server:', error)
    }
  })()

  try {
    await rendererServerClosing
  } finally {
    rendererServerClosing = null
  }
}

async function loadRenderer(window: BrowserWindow, page: 'main' | 'launcher'): Promise<void> {
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    const suffix = page === 'launcher' ? '/launcher.html' : ''
    await window.loadURL(`${process.env.ELECTRON_RENDERER_URL}${suffix}`)
    if (page === 'main') {
      window.webContents.openDevTools({ mode: 'detach' })
    }
    return
  }

  // Packaged / preview: serve renderer from 127.0.0.1 so YouTube postMessage has an http origin.
  let server: RendererServer
  try {
    server = await ensureRendererServer()
  } catch (error) {
    await closeRendererServer()
    throw error
  }

  const rendererPath = page === 'launcher' ? '/launcher.html' : '/'
  try {
    await window.loadURL(`${server.origin}${rendererPath}`)
  } catch (error) {
    console.error(`[VEIL] loadURL failed for ${page} renderer:`, error)
    await closeRendererServer()
    throw error
  }
}

function attachPreloadDiagnostics(window: BrowserWindow, label: string): void {
  window.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[VEIL] Preload failed (${label}):`, preloadPath, error)
  })
}

function getNavigationPolicyContext() {
  return {
    packagedLoopbackOrigin: rendererServer?.origin ?? null,
    viteDevOrigin:
      isDev && process.env.ELECTRON_RENDERER_URL ? process.env.ELECTRON_RENDERER_URL : null,
    isDev
  }
}

/** Deny unrestricted top-level navigation; route trusted YouTube opens via the OS browser. */
function hardenWebContentsNavigation(contents: Electron.WebContents): void {
  const applyDecision = (url: string): 'allow' | 'deny' => {
    const decision = evaluateTopLevelNavigation(url, getNavigationPolicyContext())
    if (decision.action === 'allow') {
      return 'allow'
    }
    if (decision.action === 'open-external') {
      void shell.openExternal(decision.url)
    }
    return 'deny'
  }

  contents.setWindowOpenHandler(({ url }) => {
    applyDecision(url)
    return { action: 'deny' }
  })

  contents.on('will-navigate', (event, url) => {
    if (applyDecision(url) === 'deny') {
      event.preventDefault()
    }
  })

  contents.on('will-redirect', (event, url) => {
    if (applyDecision(url) === 'deny') {
      event.preventDefault()
    }
  })

  contents.on('did-fail-load', (_event, errorCode, _errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === 0 || errorCode === -3) {
      return
    }
    const origin = rendererServer?.origin
    if (origin && validatedURL.startsWith(origin)) {
      console.error(`[VEIL] Renderer main-frame load failed (${errorCode}): ${validatedURL}`)
      void closeRendererServer()
    }
  })
}

function attachTextEditContextMenu(window: BrowserWindow): void {
  window.webContents.on('context-menu', (event, params) => {
    const template = buildTextEditContextMenuTemplate(params)
    if (!template) return
    event.preventDefault()
    Menu.buildFromTemplate(template).popup({ window })
  })
}

function createMainWindow(): BrowserWindow {
  const iconPath = resolveWindowIcon()
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: false,
    title: 'VEIL Player',
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: buildWebPreferences()
  })

  attachWindowStateEvents(window)
  hardenWebContentsNavigation(window.webContents)
  attachTextEditContextMenu(window)

  window.setMenuBarVisibility(false)
  attachPreloadDiagnostics(window, 'main')
  window.on('close', (event) => {
    if (rendererCloseConfirmed || window.webContents.isDestroyed()) {
      return
    }
    event.preventDefault()
    window.webContents.send('app:close-requested')
  })
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null
    }
    rendererCloseConfirmed = false
  })
  window.on('ready-to-show', () => {
    if (!launcherWindow) {
      window.show()
    }
  })

  void loadRenderer(window, 'main').catch((error) => {
    console.error('[VEIL] Failed to load main renderer:', error)
    void closeRendererServer()
  })
  maybeOpenDevToolsForDebugFlags(window)
  mainWindow = window
  return window
}

function maybeOpenDevToolsForDebugFlags(window: BrowserWindow): void {
  if (!isDev) {
    return
  }

  window.webContents.once('did-finish-load', () => {
    void window.webContents
      .executeJavaScript(
        `localStorage.getItem('veil:debugSeek') === '1' || localStorage.getItem('veil:debugMatching') === '1'`
      )
      .then((enabled: boolean) => {
        if (enabled) {
          window.webContents.openDevTools({ mode: 'detach' })
        }
      })
      .catch(() => undefined)
  })
}

function createLauncherWindow(): BrowserWindow {
  const iconPath = resolveWindowIcon()
  const window = new BrowserWindow({
    width: 720,
    height: 560,
    resizable: false,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    show: false,
    center: true,
    title: 'VEIL Player',
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: buildWebPreferences()
  })

  window.setMenuBarVisibility(false)
  attachPreloadDiagnostics(window, 'launcher')
  hardenWebContentsNavigation(window.webContents)
  attachTextEditContextMenu(window)

  window.on('ready-to-show', () => {
    window.show()
  })

  window.on('closed', () => {
    launcherWindow = null
    if (mainWindow && !mainWindow.isVisible()) {
      showMainWindow('home')
    }
  })

  void loadRenderer(window, 'launcher').catch((error) => {
    console.error('[VEIL] Failed to load launcher renderer:', error)
    void closeRendererServer()
  })
  launcherWindow = window
  return window
}

function showMainWindow(action: LauncherAction, startup?: StartupAction): void {
  if (!mainWindow) {
    createMainWindow()
  }

  const window = mainWindow
  if (!window) {
    return
  }

  launcherWindow?.close()
  launcherWindow = null

  const reveal = (): void => {
    if (!window.isVisible()) {
      window.show()
    }
    window.focus()
  }

  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', reveal)
  } else {
    reveal()
  }

  if (action === 'home') {
    return
  }

  const payload = startup ?? action
  if (payload === 'openVideo' || payload === 'loadVeil' || payload === 'openYouTube' || payload === 'settings') {
    sendStartupActionToMain(window, payload)
    return
  }

  if (typeof payload === 'object') {
    sendStartupActionToMain(window, payload)
  }
}

function installDebugMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Debug Tools',
          click: () => {
            mainWindow?.webContents.openDevTools()
          }
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function openLaunchFile(filePath: string, kind: 'veil' | 'media'): void {
  pendingLaunchFilePath = null
  if (kind === 'media') {
    showMainWindow('openVideo', { type: 'openVideoPath', filePath })
    return
  }
  showMainWindow('loadVeil', { type: 'loadVeilPath', filePath, openEditModeAfterLoad: true })
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.veil.player')
  }

  app.on('second-instance', (_event, argv) => {
    const launchPath = parseLaunchPath(argv)
    if (launchPath) openLaunchFile(launchPath.filePath, launchPath.kind)
  })
}

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  const launchPath = parseLaunchPath([process.execPath, filePath])
  if (!launchPath) return
  pendingLaunchFilePath = launchPath
  if (app.isReady()) openLaunchFile(launchPath.filePath, launchPath.kind)
})

app.whenReady().then(() => {
  installLocalCrashLog()
  if (isDev) {
    installDebugMenu()
  }

  ipcMain.handle('app:openDevTools', () => {
    if (!isDev) {
      return { ok: false }
    }

    mainWindow?.webContents.openDevTools({ mode: 'detach' })
    return { ok: true }
  })

  ipcMain.handle('app:confirm-close', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return
    }
    rendererCloseConfirmed = true
    mainWindow.close()
  })

  protocol.handle('veil', (request) => {
    if (request.url === 'veil://open-main' || request.url.startsWith('veil://open-main')) {
      showMainWindow('home')
    }
    return new Response('')
  })

  registerApprovedMediaHandlers()
  registerMediaProtocol()
  registerDialogHandlers()
  registerTrackFileHandlers()
  registerExternalHandlers()
  registerYouTubeMetadataHandlers()
  registerMatchingVeilHandlers()
  registerRecentHistoryHandlers(
    new RecentHistoryStore(join(app.getPath('userData'), 'recent-history.json'))
  )
  registerSessionRecoveryHandlers(
    new SessionRecoveryStore(join(app.getPath('userData'), 'session-recovery.json'))
  )
  registerContentReviewPreferencesHandlers(
    new ContentReviewPreferencesStore(join(app.getPath('userData'), 'content-review-preferences.json'))
  )

  registerLauncherHandlers({
    showMain: showMainWindow,
    getLauncherWindow: () => launcherWindow
  })

  registerWindowControlHandlers(() => mainWindow)

  createMainWindow()

  if (pendingLaunchFilePath) {
    openLaunchFile(pendingLaunchFilePath.filePath, pendingLaunchFilePath.kind)
  } else {
    createLauncherWindow()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      if (!pendingLaunchFilePath) {
        createLauncherWindow()
      }
    }
  })
})

app.on('before-quit', (event) => {
  if (!rendererServer && !rendererServerStarting && !rendererServerClosing) {
    return
  }
  event.preventDefault()
  void closeRendererServer().finally(() => {
    app.quit()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
