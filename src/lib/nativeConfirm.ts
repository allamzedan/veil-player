import type { NativeConfirmOptions } from '../types/nativeDialog'

/** Uses Electron's owner-bound native prompt, with a browser fallback for web/test runs. */
export function confirmNative(title: string, message: string): boolean {
  const options: NativeConfirmOptions = { title, message }
  return window.veil?.confirmDialog?.(options) ?? window.confirm(message)
}

export function runConfirmedAction(
  title: string,
  message: string,
  action: () => void
): boolean {
  if (!confirmNative(title, message)) return false
  action()
  return true
}
