import { inferMediaKindFromFileName, inferMediaKindFromMime } from './mediaKind'
import { isVeilTrackFilePath } from './matchingVeilFile'

export type WorkspaceDropAction =
  | { kind: 'veil'; enterEditMode: boolean }
  | { kind: 'media' }
  | { kind: 'unsupported' }

export function classifyWorkspaceDrop(
  fileName: string,
  mimeType: string,
  hasOpenMedia: boolean
): WorkspaceDropAction {
  const lowerName = fileName.toLowerCase()
  if (isVeilTrackFilePath(fileName) || lowerName.endsWith('.json')) {
    return { kind: 'veil', enterEditMode: !hasOpenMedia }
  }

  const kindFromName = inferMediaKindFromFileName(fileName)
  const kindFromMime = mimeType ? inferMediaKindFromMime(mimeType) : null
  if (kindFromMime ?? kindFromName) {
    return { kind: 'media' }
  }

  return { kind: 'unsupported' }
}
