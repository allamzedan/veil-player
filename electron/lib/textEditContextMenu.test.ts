import { describe, expect, it } from 'vitest'
import { buildTextEditContextMenuTemplate, type TextEditContextMenuParams } from './textEditContextMenu'

const editable = (overrides: Partial<TextEditContextMenuParams['editFlags']> = {}): TextEditContextMenuParams => ({
  isEditable: true,
  editFlags: {
    canUndo: false,
    canRedo: false,
    canCut: true,
    canCopy: true,
    canPaste: true,
    canDelete: true,
    canSelectAll: true,
    ...overrides
  }
})

describe('native text-edit context menu', () => {
  it('provides Paste, Cut, Copy, and Select All for editable input fields', () => {
    const template = buildTextEditContextMenuTemplate(editable()) ?? []
    const roles = template.flatMap((item) => item.role ? [item.role] : [])
    expect(roles).toEqual(expect.arrayContaining(['cut', 'copy', 'paste', 'selectAll']))
    expect(template.find((item) => item.role === 'paste')?.enabled).toBe(true)
  })

  it('uses Electron edit flags for normal enabled states', () => {
    const template = buildTextEditContextMenuTemplate(editable({ canCut: false, canCopy: false, canPaste: false })) ?? []
    expect(template.find((item) => item.role === 'cut')?.enabled).toBe(false)
    expect(template.find((item) => item.role === 'copy')?.enabled).toBe(false)
    expect(template.find((item) => item.role === 'paste')?.enabled).toBe(false)
    expect(template.find((item) => item.role === 'selectAll')?.enabled).toBe(true)
  })

  it('does not create a menu for non-editable app surfaces', () => {
    expect(buildTextEditContextMenuTemplate({ ...editable(), isEditable: false })).toBeNull()
  })
})
