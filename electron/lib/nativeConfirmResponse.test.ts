import { describe, expect, it } from 'vitest'
import {
  isNativeConfirmAccepted,
  NATIVE_CONFIRM_ACCEPT_ID,
  NATIVE_CONFIRM_CANCEL_ID
} from './nativeConfirmResponse'

describe('native confirmation response mapping', () => {
  it('accepts only the affirmative button index', () => {
    expect(isNativeConfirmAccepted(NATIVE_CONFIRM_ACCEPT_ID)).toBe(true)
    expect(isNativeConfirmAccepted(NATIVE_CONFIRM_CANCEL_ID)).toBe(false)
    expect(isNativeConfirmAccepted(-1)).toBe(false)
  })
})
