export function resolveActiveLocalMediaDuration(
  elementDuration: number,
  fallbackDuration: number
): number {
  if (Number.isFinite(elementDuration) && elementDuration > 0) return elementDuration
  return Number.isFinite(fallbackDuration) && fallbackDuration > 0 ? fallbackDuration : 0
}

export function isDeferredSeekStillCurrent<T>(args: {
  requestedElement: T
  activeElement: T | null
  requestedSource: string | null
  activeSource: string | null
}): boolean {
  return args.requestedElement === args.activeElement && args.requestedSource === args.activeSource
}
