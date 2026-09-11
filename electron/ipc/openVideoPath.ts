import { stat } from 'node:fs/promises'
import {
  buildPrivilegedVeilMediaUrl,
  getApprovedAbsolutePath,
  registerApprovedMediaPath,
  releaseApprovedMedia
} from './approvedMedia'

export interface OpenVideoPathResult {
  ok: boolean
  canceled?: boolean
  mediaUrl?: string
  name?: string
  size?: number | null
  filePath?: string
  error?: string
}

export async function openVideoFromPath(filePath: string): Promise<OpenVideoPathResult> {
  const name = filePath.split(/[/\\]/).pop() ?? filePath

  let mediaId: string
  try {
    mediaId = registerApprovedMediaPath(filePath)
  } catch (err) {
    console.error('[VEIL] registerApprovedMediaPath rejected path:', err)
    return { ok: false, canceled: true, error: 'invalid_path' }
  }

  const normalizedPath = getApprovedAbsolutePath(mediaId)
  if (!normalizedPath) {
    console.error('[VEIL] media id missing from registry after register:', mediaId)
    return { ok: false, canceled: true, error: 'registry_missing' }
  }

  let size: number | null = null
  try {
    const stats = await stat(normalizedPath)
    size = stats.size
  } catch {
    releaseApprovedMedia(mediaId)
    return { ok: false, canceled: true, error: 'stat_failed' }
  }

  return {
    ok: true,
    mediaUrl: buildPrivilegedVeilMediaUrl(mediaId),
    name,
    size,
    filePath: normalizedPath
  }
}
