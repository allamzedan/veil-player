export function hasVeilTrackIpc(): boolean {
  return (
    typeof window.veil?.saveTrackJson === 'function' &&
    typeof window.veil?.loadTrackJson === 'function'
  )
}

export function hasVeilOpenVideoIpc(): boolean {
  return typeof window.veil?.openVideoDialog === 'function'
}

export function hasDesktopWindowControls(): boolean {
  return (
    typeof window.veil?.minimize === 'function' &&
    typeof window.veil?.toggleMaximize === 'function' &&
    typeof window.veil?.requestClose === 'function'
  )
}

export function downloadTextFile(contents: string, fileName: string): void {
  const blob = new Blob([contents], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
