import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => ({
  on: vi.fn(),
  handle: vi.fn(),
  showMessageBoxSync: vi.fn(() => 0),
  exposeInMainWorld: vi.fn(),
  replyAssignments: 0
}))

vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: vi.fn(() => ({ isDestroyed: () => false }))
  },
  dialog: {
    showMessageBoxSync: electronMocks.showMessageBoxSync
  },
  ipcMain: {
    on: electronMocks.on,
    handle: electronMocks.handle
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    sendSync: (channel: string, payload: unknown) => {
      const registration = electronMocks.on.mock.calls.find(([registered]) => registered === channel)
      if (!registration) throw new Error(`No synchronous IPC handler for ${channel}`)
      let firstReply: unknown
      electronMocks.replyAssignments = 0
      const event = {
        sender: {},
        set returnValue(value: unknown) {
          electronMocks.replyAssignments += 1
          if (electronMocks.replyAssignments === 1) firstReply = value
        }
      }
      registration[1](event, payload)
      return firstReply
    }
  },
  contextBridge: {
    exposeInMainWorld: electronMocks.exposeInMainWorld
  }
}))

import { registerDialogHandlers } from '../../electron/ipc/dialogs'
import '../../electron/preload'
import { runConfirmedAction } from './nativeConfirm'
import { buildLayerListRows, type SelectableItemType } from './trackItems'
import { useVeilStore } from '../state/useVeilStore'

const originalState = useVeilStore.getState()
const veilApi = electronMocks.exposeInMainWorld.mock.calls.find(([name]) => name === 'veil')?.[1]

function seedLayers(selectedType: SelectableItemType): string {
  const id = `${selectedType}-target`
  useVeilStore.setState({
    masks: [{
      id: selectedType === 'mask' ? id : 'mask-other', type: 'mask', start: 0, end: 1,
      rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
      style: { mode: 'solid', color: '#000000', opacity: 1 }
    }],
    mutes: [{ id: selectedType === 'mute' ? id : 'mute-other', type: 'mute', start: 0, end: 1 }],
    skips: [{ id: selectedType === 'skip' ? id : 'skip-other', type: 'skip', start: 0, end: 1 }],
    bookmarks: [{
      id: selectedType === 'bookmark' ? id : 'bookmark-other', type: 'bookmark', start: 0, end: 0
    }],
    groups: [{ id: 'group-1', label: 'Group', itemIds: [id], colorToken: 'g1' }],
    selectedItemId: id,
    selectedItemType: selectedType
  })
  return id
}

function renderedIds(): string[] {
  const state = useVeilStore.getState()
  return buildLayerListRows(state.masks, state.mutes, state.skips, state.bookmarks)
    .map((row) => row.item.id)
}

beforeEach(() => {
  electronMocks.on.mockReset()
  electronMocks.handle.mockReset()
  electronMocks.showMessageBoxSync.mockReset().mockReturnValue(0)
  registerDialogHandlers()
  vi.stubGlobal('window', { veil: veilApi, confirm: vi.fn() })
})

afterEach(() => {
  useVeilStore.setState(originalState, true)
  vi.unstubAllGlobals()
})

describe('native layer deletion end to end', () => {
  it.each<SelectableItemType>(['mask', 'mute', 'skip', 'bookmark'])(
    'confirmation removes exactly one %s from store and rendered-list input',
    (type) => {
      const id = seedLayers(type)
      const before = renderedIds()
      const deleteAction = vi.fn(() => useVeilStore.getState().removeTrackItem(id, type))

      expect(runConfirmedAction(`Delete ${type}`, `Delete this ${type}?`, deleteAction)).toBe(true)

      const state = useVeilStore.getState()
      expect(deleteAction).toHaveBeenCalledTimes(1)
      expect(renderedIds()).toHaveLength(before.length - 1)
      expect(renderedIds()).not.toContain(id)
      expect(state.selectedItemId).toBeNull()
      expect(state.selectedItemType).toBeNull()
      expect(state.groups[0]?.itemIds).not.toContain(id)
      expect(electronMocks.replyAssignments).toBe(1)
    }
  )

  it.each<SelectableItemType>(['mask', 'mute', 'skip', 'bookmark'])(
    'cancellation preserves the %s store and list',
    (type) => {
      electronMocks.showMessageBoxSync.mockReturnValue(1)
      const id = seedLayers(type)
      const before = renderedIds()
      const deleteAction = vi.fn(() => useVeilStore.getState().removeTrackItem(id, type))

      expect(runConfirmedAction(`Delete ${type}`, `Delete this ${type}?`, deleteAction)).toBe(false)

      expect(deleteAction).not.toHaveBeenCalled()
      expect(renderedIds()).toEqual(before)
      expect(useVeilStore.getState().selectedItemId).toBe(id)
      expect(electronMocks.replyAssignments).toBe(1)
    }
  )
})
