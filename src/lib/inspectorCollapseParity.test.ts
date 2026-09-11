import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { playerWorkspaceClassName, type PlayerWorkspaceLayoutOptions } from './playerWorkspaceLayout'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const base: PlayerWorkspaceLayoutOptions = {
  sidebarCollapsed: false,
  hideEditorChrome: false,
  showInspectorChrome: true,
  uiRefreshV1: true,
  timelineVisible: true,
  inspectorModeActive: true,
  inspectorCollapsed: false
}

describe('Inspector collapse parity', () => {
  it('derives local expanded and collapsed layouts from the same Inspector state', () => {
    expect(playerWorkspaceClassName(base)).toContain('player-workspace--mode-edit')
    const collapsed = playerWorkspaceClassName({
      ...base,
      showInspectorChrome: false,
      inspectorCollapsed: true
    })
    expect(collapsed).toContain('player-workspace--inspector-collapsed')
    expect(collapsed).not.toContain('player-workspace--mode-edit')
  })

  it('retains the narrow Inspector column when YouTube watch mode is collapsed', () => {
    const expanded = playerWorkspaceClassName({ ...base, hideEditorChrome: true })
    expect(expanded).toContain('player-workspace--mode-watch')
    expect(expanded).toContain('player-workspace--mode-edit')

    const collapsed = playerWorkspaceClassName({
      ...base,
      hideEditorChrome: true,
      showInspectorChrome: false,
      inspectorCollapsed: true
    })
    expect(collapsed).toContain('player-workspace--mode-watch')
    expect(collapsed).toContain('player-workspace--inspector-collapsed')
    expect(collapsed).not.toContain('player-workspace--mode-edit')
  })

  it('preserves the collapsed layout outcome across a local to YouTube source switch', () => {
    const localCollapsed = playerWorkspaceClassName({
      ...base,
      showInspectorChrome: false,
      inspectorCollapsed: true
    })
    const youtubeCollapsed = playerWorkspaceClassName({
      ...base,
      hideEditorChrome: true,
      showInspectorChrome: false,
      inspectorCollapsed: true
    })

    expect(localCollapsed).toContain('player-workspace--inspector-collapsed')
    expect(youtubeCollapsed).toContain('player-workspace--inspector-collapsed')
    expect(localCollapsed).not.toContain('player-workspace--mode-edit')
    expect(youtubeCollapsed).not.toContain('player-workspace--mode-edit')
  })

  it('drops Inspector layout participation when a source switch deactivates Inspector mode', () => {
    const switched = playerWorkspaceClassName({
      ...base,
      hideEditorChrome: true,
      showInspectorChrome: false,
      inspectorModeActive: false,
      inspectorCollapsed: true
    })
    expect(switched).not.toContain('player-workspace--inspector-collapsed')
    expect(switched).toContain('player-workspace--mode-watch')
  })

  it('keeps the collapsed affordance in the intended column instead of an implicit row', () => {
    const styles = read('../styles.css')
    expect(styles).toContain('.player-workspace--mode-watch.player-workspace--inspector-collapsed')
    expect(styles).toContain('grid-template-columns: minmax(0, 1fr) 2.5rem;')
    expect(styles).toContain('.player-workspace__sidebar-chrome--mode-hidden,')
    expect(styles).toContain('display: none;')

    const player = read('../components/VideoPlayer.tsx')
    expect(player.match(/inspectorModeActive && inspectorCollapsed \? \(/g)).toHaveLength(1)
    expect(player).toContain('onClick={() => setInspectorCollapsed(false)}')
  })
})
