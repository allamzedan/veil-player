import { create } from 'zustand'

export type ToastKind = 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
}

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 4000

let nextToastId = 0

interface ToastState {
  toasts: Toast[]
  pushToast: (input: { kind: ToastKind; message: string }) => void
  dismissToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  pushToast: ({ kind, message }) => {
    const id = `toast-${nextToastId++}`
    const next: Toast = { id, kind, message }

    set((state) => {
      const toasts = [...state.toasts, next]
      return { toasts: toasts.length > MAX_VISIBLE ? toasts.slice(-MAX_VISIBLE) : toasts }
    })

    window.setTimeout(() => {
      get().dismissToast(id)
    }, AUTO_DISMISS_MS)
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
  }
}))

export function pushSuccessToast(message: string): void {
  useToastStore.getState().pushToast({ kind: 'success', message })
}

export function pushWarningToast(message: string): void {
  useToastStore.getState().pushToast({ kind: 'warning', message })
}

export function pushErrorToast(message: string): void {
  useToastStore.getState().pushToast({ kind: 'error', message })
}
