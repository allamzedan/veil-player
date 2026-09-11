type BookmarkListener = (bookmarkId: string) => void
type BookmarkDismissalListener = (targetBookmarkId?: string) => void

const toastListeners = new Set<BookmarkListener>()
const toastDismissalListeners = new Set<BookmarkDismissalListener>()

export function requestBookmarkToast(bookmarkId: string): void {
  toastListeners.forEach((listener) => listener(bookmarkId))
}

export function subscribeBookmarkToast(listener: BookmarkListener): () => void {
  toastListeners.add(listener)
  return () => toastListeners.delete(listener)
}

export function requestBookmarkToastDismissal(targetBookmarkId?: string): void {
  toastDismissalListeners.forEach((listener) => listener(targetBookmarkId))
}

export function subscribeBookmarkToastDismissal(listener: BookmarkDismissalListener): () => void {
  toastDismissalListeners.add(listener)
  return () => toastDismissalListeners.delete(listener)
}

export function resetBookmarkInteractionBridgeForTests(): void {
  toastListeners.clear()
  toastDismissalListeners.clear()
}
