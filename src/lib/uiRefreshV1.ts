/** UI refresh phase I1+ — single source of truth for Watch/Edit mode chrome. */
export const UI_REFRESH_V1_KEY = 'veil:uiRefreshV1'

export function readUiRefreshV1(): boolean {
  try {
    const stored = localStorage.getItem(UI_REFRESH_V1_KEY)
    if (stored === '1') {
      return true
    }
    // Missing or unrecognized value: refreshed interface is the product default.
    return true
  } catch {
    return true
  }
}

export function writeUiRefreshV1(enabled: boolean): void {
  try {
    localStorage.setItem(UI_REFRESH_V1_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}
