export function isVeilTrackFilePath(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return lower.endsWith('.veil') || lower.endsWith('.veil.json')
}

export function isLegacyJsonTrackPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json') && !filePath.toLowerCase().endsWith('.veil.json')
}
