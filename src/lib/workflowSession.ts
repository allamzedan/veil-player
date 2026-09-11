export const MOMENTARY_REVEAL_MS = 1500

export function isMomentaryRevealActive(untilMs: number): boolean {
  return untilMs > 0 && Date.now() < untilMs
}
