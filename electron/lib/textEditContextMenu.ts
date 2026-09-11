export interface TextEditContextMenuParams {
  isEditable: boolean
  editFlags: {
    canUndo: boolean
    canRedo: boolean
    canCut: boolean
    canCopy: boolean
    canPaste: boolean
    canDelete: boolean
    canSelectAll: boolean
  }
}

export function buildTextEditContextMenuTemplate(
  params: TextEditContextMenuParams
): Electron.MenuItemConstructorOptions[] | null {
  if (!params.isEditable) return null

  const { editFlags } = params
  return [
    { role: 'undo', enabled: editFlags.canUndo },
    { role: 'redo', enabled: editFlags.canRedo },
    { type: 'separator' },
    { role: 'cut', enabled: editFlags.canCut },
    { role: 'copy', enabled: editFlags.canCopy },
    { role: 'paste', enabled: editFlags.canPaste },
    { role: 'delete', enabled: editFlags.canDelete },
    { type: 'separator' },
    { role: 'selectAll', enabled: editFlags.canSelectAll }
  ]
}
