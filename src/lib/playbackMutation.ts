export function afterTimingMutation(
  resetSkipLatch: () => void,
  reconcileNow: () => void
): void {
  resetSkipLatch()
  reconcileNow()
}
