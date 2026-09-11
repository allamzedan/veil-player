let nativeOpenDialogInFlight = false

export function isOpenVideoDialogInFlight(): boolean {
  return nativeOpenDialogInFlight
}

export function isOpenTrackDialogInFlight(): boolean {
  return nativeOpenDialogInFlight
}

async function runNativeOpenDialog<T>(operation: () => Promise<T>): Promise<T | null> {
  if (nativeOpenDialogInFlight) {
    return null
  }

  nativeOpenDialogInFlight = true
  try {
    return await operation()
  } finally {
    nativeOpenDialogInFlight = false
  }
}

export function runOpenVideoDialog<T>(operation: () => Promise<T>): Promise<T | null> {
  return runNativeOpenDialog(operation)
}

export function runOpenTrackDialog<T>(operation: () => Promise<T>): Promise<T | null> {
  return runNativeOpenDialog(operation)
}
