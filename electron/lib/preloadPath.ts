import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

// Prefer CommonJS — sandboxed preload cannot run ESM (index.mjs).
const PRELOAD_FILE_NAMES = ['index.js', 'index.mjs'] as const

function preloadCandidates(mainDirname: string): string[] {
  const candidates: string[] = []

  if (app.isPackaged) {
    const unpackedDir = join(process.resourcesPath, 'app.asar.unpacked', 'out', 'preload')
    for (const fileName of PRELOAD_FILE_NAMES) {
      candidates.push(join(unpackedDir, fileName))
    }
  }

  for (const fileName of PRELOAD_FILE_NAMES) {
    candidates.push(join(mainDirname, '../preload', fileName))
  }

  if (!app.isPackaged) {
    const devDir = join(process.cwd(), 'out', 'preload')
    for (const fileName of PRELOAD_FILE_NAMES) {
      candidates.push(join(devDir, fileName))
    }
  }

  return candidates
}

/**
 * Resolves the preload script path for BrowserWindow webPreferences.
 * Packaged builds must unpack preload out of app.asar — sandboxed preload cannot run from inside the archive.
 */
export function resolvePreloadScript(mainDirname: string): string {
  const candidates = preloadCandidates(mainDirname)
  const resolved = candidates.find((path) => existsSync(path))

  if (!resolved) {
    throw new Error(
      `[VEIL] Preload script not found (packaged=${String(app.isPackaged)}). Tried:\n${candidates.join('\n')}`
    )
  }

  return resolved
}

export function listPreloadCandidates(mainDirname: string): string[] {
  return preloadCandidates(mainDirname)
}
