import { describe, expect, it } from 'vitest'
import { INSPECTOR_ACTION_COLORS } from './inspectorActionColors'
import { VEIL_ACTION_COLORS, VEIL_MASK, VEIL_MUTE, VEIL_SKIP } from './veilDesignTokens'

describe('veilDesignTokens', () => {
  it('action colors match inspector export', () => {
    expect(INSPECTOR_ACTION_COLORS).toEqual(VEIL_ACTION_COLORS)
    expect(VEIL_ACTION_COLORS.mask).toBe(VEIL_MASK)
    expect(VEIL_ACTION_COLORS.mute).toBe(VEIL_MUTE)
    expect(VEIL_ACTION_COLORS.skip).toBe(VEIL_SKIP)
  })
})
