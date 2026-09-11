export function hasTrackFileExtension(filePath: string): boolean {
  return /\.(veil|veil\.json|json)$/i.test(filePath)
}

export function normalizeTrackSavePath(filePath: string): string {
  const trimmed = filePath.trim()
  const withoutDialogAppendedVeil = trimmed.replace(
    /((?:\.veil(?:\.json)?|\.json))\.veil$/i,
    '$1'
  )
  if (hasTrackFileExtension(withoutDialogAppendedVeil)) {
    return withoutDialogAppendedVeil
  }
  return `${withoutDialogAppendedVeil}.veil`
}

export function suggestTrackFilename(
  videoFileName: string | null,
  trackFilePath: string | null
): string {
  if (trackFilePath) {
    return normalizeTrackSavePath(trackFilePath)
  }
  if (videoFileName) {
    const base = videoFileName.replace(/\.[^.\\/]+$/, '')
    return normalizeTrackSavePath(base)
  }
  return 'track.veil'
}
