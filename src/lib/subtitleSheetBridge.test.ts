import { afterEach, describe, expect, it } from 'vitest'
import {
  readSubtitleSheetOpen,
  registerSubtitleSheetBridge,
  requestCloseSubtitleSheet,
  requestOpenSubtitleSheet,
  requestSubtitleImport
} from './subtitleSheetBridge'

describe('subtitleSheetBridge', () => {
  afterEach(() => {
    registerSubtitleSheetBridge({
      open: () => {},
      close: () => {},
      isOpen: () => false
    })()
  })

  it('opens and closes the subtitle sheet', () => {
    let open = false
    registerSubtitleSheetBridge({
      open: () => {
        open = true
      },
      close: () => {
        open = false
      },
      isOpen: () => open
    })

    expect(requestOpenSubtitleSheet()).toBe(true)
    expect(open).toBe(true)
    expect(readSubtitleSheetOpen()).toBe(true)

    requestCloseSubtitleSheet()
    expect(open).toBe(false)
  })

  it('returns false when bridge is not registered', () => {
    registerSubtitleSheetBridge({
      open: () => {},
      close: () => {},
      isOpen: () => false
    })()

    expect(requestOpenSubtitleSheet()).toBe(false)
  })

  it('triggers subtitle import when registered', () => {
    let importCount = 0
    registerSubtitleSheetBridge({
      open: () => {},
      close: () => {},
      isOpen: () => false,
      triggerImport: () => {
        importCount += 1
      }
    })

    expect(requestSubtitleImport()).toBe(true)
    expect(importCount).toBe(1)
  })
})
