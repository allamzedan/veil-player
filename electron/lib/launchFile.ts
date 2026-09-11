import { existsSync } from 'node:fs'

const VEIL_LAUNCH_SUFFIXES = ['.veil', '.veil.json'] as const

export function isVeilLaunchFilePath(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return VEIL_LAUNCH_SUFFIXES.some((suffix) => lower.endsWith(suffix))
}

export function parseLaunchVeilPath(argv: readonly string[]): string | null {
  for (let index = argv.length - 1; index >= 1; index -= 1) {
    const arg = argv[index]
    if (!arg || arg.startsWith('-')) {
      continue
    }
    if (existsSync(arg) && isVeilLaunchFilePath(arg)) {
      return arg
    }
  }
  return null
}

export function isMediaLaunchFilePath(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.m4v', '.ogv', '.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'].some((suffix) => lower.endsWith(suffix))
}

export function parseLaunchMediaPath(argv: readonly string[]): string | null {
  for (let index = argv.length - 1; index >= 1; index -= 1) {
    const arg = argv[index]
    if (!arg || arg.startsWith('-')) {
      continue
    }
    if (existsSync(arg) && isMediaLaunchFilePath(arg)) {
      return arg
    }
  }
  return null
}

export function parseLaunchPath(argv: readonly string[]): { kind: 'veil' | 'media'; filePath: string } | null {
  const veilPath = parseLaunchVeilPath(argv)
  if (veilPath) return { kind: 'veil', filePath: veilPath }
  const mediaPath = parseLaunchMediaPath(argv)
  return mediaPath ? { kind: 'media', filePath: mediaPath } : null
}
