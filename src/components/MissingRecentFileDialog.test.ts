import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import Modal from './Modal'
import MissingRecentFileDialog from './MissingRecentFileDialog'

describe('MissingRecentFileDialog', () => {
  it('shows a recoverable state without changing the current source', () => {
    const onLocate = vi.fn()
    const onRemove = vi.fn()
    const onCancel = vi.fn()
    const tree = MissingRecentFileDialog({
      target: { kind: 'video', filePath: 'C:\\Media\\missing.mp4' },
      pending: false,
      onLocate,
      onRemove,
      onCancel
    }) as ReactElement<Record<string, unknown>>

    expect(isValidElement(tree)).toBe(true)
    expect(tree.type).toBe(Modal)
    expect(tree.props.title).toBe('File not found')
    expect(tree.props.onClose).toBe(onCancel)
    expect(onLocate).not.toHaveBeenCalled()
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('is dismissible and leaves the stale entry unchanged until an action is chosen', () => {
    const onCancel = vi.fn()
    const tree = MissingRecentFileDialog({
      target: { kind: 'veil', filePath: 'C:\\Veils\\missing.veil' },
      pending: false,
      onLocate: vi.fn(),
      onRemove: vi.fn(),
      onCancel
    }) as ReactElement<Record<string, unknown>>

    ;(tree.props.onClose as () => void)()
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
