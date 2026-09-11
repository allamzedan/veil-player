import { existsSync } from 'node:fs'
import { ipcMain } from 'electron'
import { buildMatchingVeilCandidates, findExistingMatchingVeils } from '../../src/lib/matchingVeilPaths'

export function registerMatchingVeilHandlers(): void {
  ipcMain.handle('veil:findMatchingVeils', (_event, videoPath: unknown): string[] => {
    if (typeof videoPath !== 'string' || videoPath.length === 0) {
      return []
    }

    return findExistingMatchingVeils(videoPath, existsSync)
  })

  ipcMain.handle('veil:debugMatchingVeil', (_event, videoPath: unknown) => {
    if (typeof videoPath !== 'string' || videoPath.length === 0) {
      return { candidates: [], exists: [], error: 'missing_video_path' }
    }

    const candidates = buildMatchingVeilCandidates(videoPath)
    const exists = candidates.map((candidate) => {
      try {
        return existsSync(candidate)
      } catch {
        return false
      }
    })

    return { candidates, exists, error: null }
  })
}
