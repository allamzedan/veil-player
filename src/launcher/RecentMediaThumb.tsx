import { useEffect, useState } from 'react'
import type { RecentVideoEntry } from '../lib/sessionRecovery'
import { recentLocalMediaKind } from '../lib/launcherRecentPresentation'

const thumbnailCache = new Map<string, string>()
const MAX_THUMBNAILS = 24

function toFileUrl(filePath: string): string {
  if (filePath.startsWith('file:')) return filePath
  const normalized = filePath.replace(/\\/g, '/')
  return `file:///${encodeURI(normalized.replace(/^\/+/, ''))}`
}

function rememberThumbnail(filePath: string, dataUrl: string): void {
  thumbnailCache.delete(filePath)
  thumbnailCache.set(filePath, dataUrl)
  while (thumbnailCache.size > MAX_THUMBNAILS) thumbnailCache.delete(thumbnailCache.keys().next().value as string)
}

export default function RecentMediaThumb({ entry }: { entry: RecentVideoEntry }) {
  const isLocal = entry.kind === 'local' && Boolean(entry.filePath)
  const kind = isLocal ? recentLocalMediaKind(entry.name) : null
  const [thumbnail, setThumbnail] = useState(() => entry.filePath ? thumbnailCache.get(entry.filePath) ?? null : null)

  useEffect(() => {
    if (!isLocal || kind !== 'video' || !entry.filePath || thumbnail) return
    let disposed = false
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    video.muted = true
    video.preload = 'metadata'
    video.playsInline = true
    const capture = (): void => {
      if (disposed || video.videoWidth <= 0 || video.videoHeight <= 0) return
      const width = 88
      const height = 56
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) return
      const scale = Math.max(width / video.videoWidth, height / video.videoHeight)
      const drawWidth = video.videoWidth * scale
      const drawHeight = video.videoHeight * scale
      context.drawImage(video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
      rememberThumbnail(entry.filePath!, dataUrl)
      if (!disposed) setThumbnail(dataUrl)
    }
    const onLoaded = (): void => { video.currentTime = Math.min(0.2, Math.max(0, video.duration || 0)) }
    video.addEventListener('loadeddata', onLoaded)
    video.addEventListener('seeked', capture, { once: true })
    video.src = toFileUrl(entry.filePath)
    video.load()
    return () => {
      disposed = true
      video.removeAttribute('src')
      video.load()
    }
  }, [entry.filePath, isLocal, kind, thumbnail])

  if (thumbnail) return <img className="launcher-row__thumb-image" src={thumbnail} alt="" aria-hidden="true" />
  return <span className={`launcher-row__thumb-icon${kind === 'audio' ? ' launcher-row__thumb-icon--audio' : ''}`} aria-hidden="true" />
}