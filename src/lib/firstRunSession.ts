const FIRST_RUN_KEY = 'veil:firstRunComplete'

export function readFirstRunComplete(): boolean {
  try {
    return localStorage.getItem(FIRST_RUN_KEY) === '1'
  } catch {
    return false
  }
}

export function writeFirstRunComplete(): void {
  try {
    localStorage.setItem(FIRST_RUN_KEY, '1')
  } catch {
    // ignore
  }
}
