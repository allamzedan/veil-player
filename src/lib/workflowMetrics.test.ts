import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDevMetricsEnabled } from './workflowMetrics'

function stubStorage(values: Record<string, string>) {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values[key] ?? null,
    setItem: vi.fn(),
    removeItem: vi.fn()
  })
}

describe('workflowMetrics debug visibility', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not expose diagnostics for the legacy dev metrics flag alone', () => {
    stubStorage({ 'veil:devMetrics': '1' })

    expect(isDevMetricsEnabled()).toBe(false)
  })

  it('exposes diagnostics only when release debug flags are enabled', () => {
    stubStorage({ 'veil:debugSeek': '1' })
    expect(isDevMetricsEnabled()).toBe(true)

    stubStorage({ 'veil:debugMatching': '1' })
    expect(isDevMetricsEnabled()).toBe(true)
  })
})
