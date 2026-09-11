import { useRef } from 'react'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'
import { recordRecentVideo } from '../lib/sessionRecovery'
import { userMessages } from '../lib/userMessages'
import { replaceWithCleanLocalSource } from '../lib/videoOpenFlow'
import { runOpenVideoDialog } from '../lib/nativeOpenDialogGuard'
import { acceptsBrowserMediaMime, inferMediaKindFromFileName, inferMediaKindFromMime, type MediaKind } from '../lib/mediaKind'
import { pushErrorToast } from '../state/useToastStore'

export function useVideoFileOpen() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { runIfAllowed } = useUnsavedChangesGuard()
  const openVideoFile = (
    src: string,
    fileName: string,
    sourceKind: 'blob' | 'protocol',
    fileSizeBytes?: number | null,
    filePath?: string | null,
    mediaKind?: MediaKind | null
  ) => {
    return runIfAllowed(() => {
      replaceWithCleanLocalSource({
        src,
        fileName,
        sourceKind,
        fileSizeBytes,
        filePath,
        mediaKind
      })
      recordRecentVideo(fileName, sourceKind === 'protocol' ? src : fileName, {
        filePath: filePath ?? undefined
      })
    })
  }

  const loadVideoFile = async (file: File): Promise<void> => {
    const kindFromName = inferMediaKindFromFileName(file.name)
    const kindFromMime = file.type ? inferMediaKindFromMime(file.type) : null
    if (file.type && !acceptsBrowserMediaMime(file.type) && !kindFromName) {
      pushErrorToast(userMessages.invalidMedia)
      return
    }
    const mediaKind = kindFromMime ?? kindFromName
    if (!mediaKind) {
      pushErrorToast(userMessages.invalidMedia)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const electronPath = (file as File & { path?: string }).path ?? null
    const outcome = await openVideoFile(objectUrl, file.name, 'blob', file.size, electronPath, mediaKind)
    if (outcome === 'cancelled') URL.revokeObjectURL(objectUrl)
  }

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (file) {
      void loadVideoFile(file)
    }
    event.target.value = ''
  }

  const openVideo = async (): Promise<void> => {
    await runOpenVideoDialog(async () => {
      if (window.veil?.openVideoDialog) {
        try {
          const result = await window.veil.openVideoDialog()
          if (result.canceled || !result.mediaUrl || !result.name) {
            return
          }
          await openVideoFile(
            result.mediaUrl,
            result.name,
            'protocol',
            result.size,
            result.filePath,
            inferMediaKindFromFileName(result.name)
          )
        } catch (err) {
          console.error('[VEIL] openVideoDialog failed:', err)
          pushErrorToast(userMessages.openVideoFailed)
        }
        return
      }

      fileInputRef.current?.click()
    })
  }

  const openVideoPath = async (filePath: string): Promise<void> => {
    if (!window.veil?.openVideoPath) {
      return
    }

    try {
      const result = await window.veil.openVideoPath(filePath)
      if (result.canceled || !result.mediaUrl || !result.name) {
        pushErrorToast(userMessages.openVideoFailed)
        return
      }
      await openVideoFile(
        result.mediaUrl,
        result.name,
        'protocol',
        result.size,
        result.filePath ?? filePath,
        inferMediaKindFromFileName(result.name)
      )
    } catch (err) {
      console.error('[VEIL] openVideoPath failed:', err)
      pushErrorToast(userMessages.openVideoFailed)
    }
  }

  return {
    fileInputRef,
    onFileInputChange,
    openVideo,
    openVideoPath,
    loadVideoFile
  }
}
