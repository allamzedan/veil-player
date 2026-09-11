const SIDEBAR_COLLAPSED_KEY = 'veil:sidebarCollapsed:v2'
const TIMELINE_VISIBLE_KEY = 'veil:timelineVisible:v2'

/** Sidebar expanded by default; v2 key ignores legacy hidden-first preferences. */
export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // ignore
  }
}

/** Timeline visible by default. */
export function readTimelineVisible(): boolean {
  try {
    const raw = localStorage.getItem(TIMELINE_VISIBLE_KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}

export function writeTimelineVisible(visible: boolean): void {
  try {
    localStorage.setItem(TIMELINE_VISIBLE_KEY, visible ? '1' : '0')
  } catch {
    // ignore
  }
}
