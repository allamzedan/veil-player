/// <reference types="vite/client" />

import type { VeilApi, VeilLauncherApi } from '../electron/preload'

declare global {
  const __APP_VERSION__: string

  interface Window {
    veil?: VeilApi
    veilLauncher?: VeilLauncherApi
  }
}

export {}
