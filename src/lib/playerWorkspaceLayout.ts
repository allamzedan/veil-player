export interface PlayerWorkspaceLayoutOptions {
  sidebarCollapsed: boolean
  hideEditorChrome: boolean
  showInspectorChrome: boolean
  uiRefreshV1: boolean
  timelineVisible: boolean
  inspectorModeActive: boolean
  inspectorCollapsed: boolean
}

export function playerWorkspaceClassName({
  sidebarCollapsed,
  hideEditorChrome,
  showInspectorChrome,
  uiRefreshV1,
  timelineVisible,
  inspectorModeActive,
  inspectorCollapsed
}: PlayerWorkspaceLayoutOptions): string {
  return [
    'player-workspace',
    sidebarCollapsed && !hideEditorChrome && !showInspectorChrome
      ? 'player-workspace--sidebar-collapsed'
      : '',
    !uiRefreshV1 && !timelineVisible ? 'player-workspace--timeline-hidden' : '',
    hideEditorChrome ? 'player-workspace--mode-watch' : '',
    showInspectorChrome ? 'player-workspace--mode-edit' : '',
    inspectorModeActive && inspectorCollapsed ? 'player-workspace--inspector-collapsed' : ''
  ]
    .filter(Boolean)
    .join(' ')
}
