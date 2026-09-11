export function createMaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `mask_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}
