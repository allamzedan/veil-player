export const NATIVE_CONFIRM_BUTTONS = ['OK', 'Cancel'] as const
export const NATIVE_CONFIRM_ACCEPT_ID = 0
export const NATIVE_CONFIRM_CANCEL_ID = 1

export function isNativeConfirmAccepted(response: number): boolean {
  return response === NATIVE_CONFIRM_ACCEPT_ID
}
