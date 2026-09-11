import { describe, expect, it } from 'vitest'
import {
  isOpenTrackDialogInFlight,
  isOpenVideoDialogInFlight,
  runOpenTrackDialog,
  runOpenVideoDialog
} from './nativeOpenDialogGuard'

describe('nativeOpenDialogGuard', () => {
  it('blocks concurrent open video dialog requests', async () => {
    let unblock: (() => void) | undefined
    const block = new Promise<void>((resolve) => {
      unblock = resolve
    })

    const first = runOpenVideoDialog(async () => {
      await block
      return 'first'
    })

    await Promise.resolve()
    expect(isOpenVideoDialogInFlight()).toBe(true)

    const second = await runOpenVideoDialog(async () => 'second')
    expect(second).toBeNull()

    unblock?.()
    await expect(first).resolves.toBe('first')
    expect(isOpenVideoDialogInFlight()).toBe(false)
  })

  it('blocks concurrent open track dialog requests', async () => {
    let unblock: (() => void) | undefined
    const block = new Promise<void>((resolve) => {
      unblock = resolve
    })

    const first = runOpenTrackDialog(async () => {
      await block
      return 'first'
    })

    await Promise.resolve()
    expect(isOpenTrackDialogInFlight()).toBe(true)

    const second = await runOpenTrackDialog(async () => 'second')
    expect(second).toBeNull()

    unblock?.()
    await expect(first).resolves.toBe('first')
    expect(isOpenTrackDialogInFlight()).toBe(false)
  })

  it('blocks cross-category requests and clears after errors', async () => {
    let unblock: (() => void) | undefined
    const block = new Promise<void>((resolve) => {
      unblock = resolve
    })
    const first = runOpenVideoDialog(async () => {
      await block
      return 'first'
    })
    await Promise.resolve()
    await expect(runOpenTrackDialog(async () => 'track')).resolves.toBeNull()
    unblock?.()
    await expect(first).resolves.toBe('first')

    await expect(runOpenTrackDialog(async () => {
      throw new Error('failed')
    })).rejects.toThrow('failed')
    expect(isOpenVideoDialogInFlight()).toBe(false)
    expect(isOpenTrackDialogInFlight()).toBe(false)
  })
})
