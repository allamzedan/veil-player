import { inferMediaKindFromFileName, type MediaKind } from './mediaKind'

export const DISPLAY_RECENT_COUNT = 4

export interface FilenameParts { stem: string; extension: string }

export function splitFilename(filename: string): FilenameParts {
  const dot = filename.lastIndexOf('.')
  if (dot <= 0 || dot === filename.length - 1) return { stem: filename, extension: '' }
  return { stem: filename.slice(0, dot), extension: filename.slice(dot) }
}

export function recentLocalMediaKind(filename: string): MediaKind | null {
  return inferMediaKindFromFileName(filename)
}

export function shouldRevealFilename(overflows: boolean, reduceMotion: boolean): boolean {
  return overflows && !reduceMotion
}