import { showSidebarIfHidden } from './playerLayoutBridge'
import { requestUiRefreshPanelNavigation } from './uiRefreshPanelBridge'

export type SidebarPanelId =
  | 'track'
  | 'create'
  | 'selected'
  | 'subtitles'
  | 'layers'
  | 'organization'
  | 'track-info'
  | 'track-groups'
  | 'track-anchors'
  | 'offset-shift'

type PanelOpener = () => void

const panelOpeners: Partial<Record<SidebarPanelId, PanelOpener>> = {}
let pendingPanel: SidebarPanelId | null = null

export function registerSidebarPanel(
  panelId: SidebarPanelId,
  open: PanelOpener
): () => void {
  panelOpeners[panelId] = open
  return () => {
    if (panelOpeners[panelId] === open) {
      delete panelOpeners[panelId]
    }
  }
}

function openPanelNow(panelId: SidebarPanelId): void {
  panelOpeners[panelId]?.()
}

export function requestOpenSidebarPanel(panelId: SidebarPanelId): void {
  if (requestUiRefreshPanelNavigation(panelId)) {
    return
  }

  showSidebarIfHidden()
  if (panelOpeners[panelId]) {
    openPanelNow(panelId)
    pendingPanel = null
    return
  }
  pendingPanel = panelId
}

export function flushPendingSidebarPanel(): void {
  if (pendingPanel === null) {
    return
  }
  const panelId = pendingPanel
  if (panelOpeners[panelId]) {
    openPanelNow(panelId)
    pendingPanel = null
  }
}

export function openSidebarPanel(panelId: SidebarPanelId): void {
  requestOpenSidebarPanel(panelId)
}
