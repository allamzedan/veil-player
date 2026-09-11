/**
 * Renderer-only Vite config reference.
 * electron-vite uses electron.vite.config.ts as the authoritative build config.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
