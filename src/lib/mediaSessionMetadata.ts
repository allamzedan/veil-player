export function localMediaSessionTitle(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).at(-1) ?? fileName
  const extensionIndex = baseName.lastIndexOf('.')
  return extensionIndex > 0 ? baseName.slice(0, extensionIndex) : baseName
}

export function shouldPublishLocalMediaSession(videoSrc: string | null, fileName: string | null, isYouTube: boolean): boolean {
  return Boolean(videoSrc && fileName && !isYouTube)
}
