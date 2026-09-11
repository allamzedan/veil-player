import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  registerUiRefreshPanelRouting,
  requestUiRefreshEditMode,
  requestUiRefreshPanelNavigation
} from './uiRefreshPanelBridge'
import { registerSubtitleSheetBridge } from './subtitleSheetBridge'
import { writeUiRefreshV1 } from './uiRefreshV1'

function createStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    }
  }
}

describe('uiRefreshPanelBridge', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
    writeUiRefreshV1(true)
  })

  afterEach(() => {
    writeUiRefreshV1(false)
    registerSubtitleSheetBridge({
      open: () => {},
      close: () => {},
      isOpen: () => false
    })()
    registerUiRefreshPanelRouting({
      openTrackTool: () => {},
      enterEditMode: () => {},
      isAdvancedSidebarActive: () => false
    })()
  })

  it('routes subtitles to subtitle sheet when refresh is on', () => {
    let sheetOpened = false

    registerSubtitleSheetBridge({
      open: () => {
        sheetOpened = true
      },
      close: () => {},
      isOpen: () => sheetOpened
    })

    registerUiRefreshPanelRouting({
      openTrackTool: () => {},
      enterEditMode: () => {},
      isAdvancedSidebarActive: () => false
    })

    const handled = requestUiRefreshPanelNavigation('subtitles')

    expect(handled).toBe(true)
    expect(sheetOpened).toBe(true)
  })

  it('routes layers to track tools when refresh is on', () => {
    const opened: string[] = []
    let editEntered = false

    registerUiRefreshPanelRouting({
      openTrackTool: (tool) => {
        opened.push(tool)
      },
      enterEditMode: () => {
        editEntered = true
      },
      isAdvancedSidebarActive: () => false
    })

    const handled = requestUiRefreshPanelNavigation('layers')

    expect(handled).toBe(true)
    expect(editEntered).toBe(true)
    expect(opened).toEqual(['layers'])
  })

  it('falls through when advanced sidebar fallback is active', () => {
    let editEntered = false

    registerUiRefreshPanelRouting({
      openTrackTool: () => {},
      enterEditMode: () => {
        editEntered = true
      },
      isAdvancedSidebarActive: () => true
    })

    expect(requestUiRefreshPanelNavigation('subtitles')).toBe(false)
    expect(requestUiRefreshEditMode()).toBe(false)
    expect(editEntered).toBe(false)
  })

  it('migrates legacy preference values to the current routing', () => {
    writeUiRefreshV1(false)
    let editEntered = false

    registerUiRefreshPanelRouting({
      openTrackTool: () => {},
      enterEditMode: () => {
        editEntered = true
      },
      isAdvancedSidebarActive: () => false
    })

    expect(requestUiRefreshPanelNavigation('create')).toBe(true)
    expect(editEntered).toBe(true)
  })
})
