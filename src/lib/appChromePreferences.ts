const SHOW_STATUS_BAR_KEY = 'veil:showStatusBar'

export function readShowStatusBar(): boolean {
  try {
    return localStorage.getItem(SHOW_STATUS_BAR_KEY) === '1'
  } catch {
    return false
  }
}

export function writeShowStatusBar(value: boolean): void {
  try {
    localStorage.setItem(SHOW_STATUS_BAR_KEY, value ? '1' : '0')
  } catch {
    // ignore
  }
}
