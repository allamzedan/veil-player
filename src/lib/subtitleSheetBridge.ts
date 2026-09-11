type SubtitleSheetOpener = () => void
type SubtitleSheetCloser = () => void
type SubtitleSheetOpenProbe = () => boolean
type SubtitleImportTrigger = () => void

let openSubtitleSheet: SubtitleSheetOpener | null = null
let closeSubtitleSheet: SubtitleSheetCloser | null = null
let isSubtitleSheetOpen: SubtitleSheetOpenProbe = () => false
let triggerSubtitleImport: SubtitleImportTrigger | null = null

export function registerSubtitleSheetBridge(options: {
  open: SubtitleSheetOpener
  close: SubtitleSheetCloser
  isOpen: SubtitleSheetOpenProbe
  triggerImport?: SubtitleImportTrigger
}): () => void {
  openSubtitleSheet = options.open
  closeSubtitleSheet = options.close
  isSubtitleSheetOpen = options.isOpen
  triggerSubtitleImport = options.triggerImport ?? null

  return () => {
    if (openSubtitleSheet === options.open) {
      openSubtitleSheet = null
    }
    if (closeSubtitleSheet === options.close) {
      closeSubtitleSheet = null
    }
    if (isSubtitleSheetOpen === options.isOpen) {
      isSubtitleSheetOpen = () => false
    }
    if (triggerSubtitleImport === options.triggerImport) {
      triggerSubtitleImport = null
    }
  }
}

export function requestOpenSubtitleSheet(): boolean {
  if (!openSubtitleSheet) {
    return false
  }
  openSubtitleSheet()
  return true
}

export function requestCloseSubtitleSheet(): void {
  closeSubtitleSheet?.()
}

export function readSubtitleSheetOpen(): boolean {
  return isSubtitleSheetOpen()
}

export function requestSubtitleImport(): boolean {
  if (!triggerSubtitleImport) {
    return false
  }
  triggerSubtitleImport()
  return true
}
