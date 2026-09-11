/** Inspector layout dock — only "right" is exposed this phase; prepared for future bottom dock. */
export type InspectorDock = 'right' | 'bottom'

/** Product default (Option A). Do not expose a user-facing dock switch yet. */
export const inspectorDock: InspectorDock = 'right'

export type InspectorLayoutState = 'expanded' | 'collapsed'

export function inspectorDockClassName(
  dock: InspectorDock = inspectorDock,
  state: InspectorLayoutState = 'expanded'
): string {
  return `inspector-dock inspector-dock--${dock} inspector-dock--${state}`
}
