export interface NativeDialogParent {
  isDestroyed(): boolean
  focus(): void
}

let nativeFileDialogInFlight = false

export function isNativeFileDialogInFlight(): boolean {
  return nativeFileDialogInFlight
}

export function isOpenVideoDialogInFlight(): boolean {
  return nativeFileDialogInFlight
}

export function isOpenTrackDialogInFlight(): boolean {
  return nativeFileDialogInFlight
}

async function withNativeFileDialogGuard<T>(
  parent: NativeDialogParent | null,
  operation: () => Promise<T>
): Promise<T | null> {
  if (nativeFileDialogInFlight) {
    return null
  }

  nativeFileDialogInFlight = true
  try {
    return await operation()
  } finally {
    nativeFileDialogInFlight = false
    if (parent && !parent.isDestroyed()) {
      try {
        parent.focus()
      } catch {
        // The parent may close between the lifecycle check and focus.
      }
    }
  }
}

export function withOpenVideoDialogGuard<T>(
  parent: NativeDialogParent | null,
  operation: () => Promise<T>
): Promise<T | null> {
  return withNativeFileDialogGuard(parent, operation)
}

export function withOpenTrackDialogGuard<T>(
  parent: NativeDialogParent | null,
  operation: () => Promise<T>
): Promise<T | null> {
  return withNativeFileDialogGuard(parent, operation)
}

export function withSaveTrackDialogGuard<T>(
  parent: NativeDialogParent | null,
  operation: () => Promise<T>
): Promise<T | null> {
  return withNativeFileDialogGuard(parent, operation)
}
