import { readUiRefreshV1 } from './uiRefreshV1'
import { requestOpenSubtitleSheet } from './subtitleSheetBridge'
import type { ActiveTrackTool } from './trackTools'
import type { SidebarPanelId } from './sidebarPanelBridge'

type TrackToolOpener = (tool: ActiveTrackTool) => void
type EditModeActivator = () => void

let openTrackTool: TrackToolOpener | null = null
let enterEditMode: EditModeActivator | null = null
let isAdvancedSidebarActive: () => boolean = () => false

const PANEL_TO_TRACK_TOOL: Partial<Record<SidebarPanelId, ActiveTrackTool>> = {
  'track-info': 'track-info',
  'track-groups': 'groups',
  'track-anchors': 'anchors',
  'offset-shift': 'offset',
  layers: 'layers'
}

const EDIT_ONLY_PANELS: ReadonlySet<SidebarPanelId> = new Set([
  'track',
  'create',
  'selected',
  'organization'
])

export function registerUiRefreshPanelRouting(options: {
  openTrackTool: TrackToolOpener
  enterEditMode: EditModeActivator
  isAdvancedSidebarActive: () => boolean
}): () => void {
  openTrackTool = options.openTrackTool
  enterEditMode = options.enterEditMode
  isAdvancedSidebarActive = options.isAdvancedSidebarActive

  return () => {
    if (openTrackTool === options.openTrackTool) {
      openTrackTool = null
    }
    if (enterEditMode === options.enterEditMode) {
      enterEditMode = null
    }
    if (isAdvancedSidebarActive === options.isAdvancedSidebarActive) {
      isAdvancedSidebarActive = () => false
    }
  }
}

export function requestUiRefreshPanelNavigation(panelId: SidebarPanelId): boolean {
  if (!readUiRefreshV1() || isAdvancedSidebarActive()) {
    return false
  }

  if (EDIT_ONLY_PANELS.has(panelId)) {
    enterEditMode?.()
    return true
  }

  if (panelId === 'subtitles') {
    return requestOpenSubtitleSheet()
  }

  const tool = PANEL_TO_TRACK_TOOL[panelId]
  if (tool) {
    enterEditMode?.()
    openTrackTool?.(tool)
    return true
  }

  return false
}

export function requestUiRefreshEditMode(): boolean {
  if (!readUiRefreshV1() || isAdvancedSidebarActive()) {
    return false
  }

  enterEditMode?.()
  return true
}
