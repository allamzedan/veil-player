import type { useVeilStore } from '../state/useVeilStore'

type VeilSessionSlice = Pick<
  ReturnType<typeof useVeilStore.getState>,
  'trackFilePath' | 'masks' | 'mutes' | 'skips' | 'bookmarks'
>

export function hasVeilSession(state: VeilSessionSlice): boolean {
  if (state.trackFilePath) {
    return true
  }
  return (
    state.masks.length +
      state.mutes.length +
      state.skips.length +
      state.bookmarks.length >
    0
  )
}

/** File menu Close VEIL and related chrome — same rules as {@link hasVeilSession}. */
export function hasVeilMenuSession(state: VeilSessionSlice): boolean {
  return hasVeilSession(state)
}
