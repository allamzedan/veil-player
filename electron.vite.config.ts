import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const youtubeProviderEnabled = process.env.VEIL_ENABLE_YOUTUBE_PROVIDER === 'true'
const providerDefine = { __VEIL_ENABLE_YOUTUBE_PROVIDER__: JSON.stringify(youtubeProviderEnabled) }

export default defineConfig({
  main: {
    define: providerDefine,
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts')
        }
      }
    }
  },
  preload: {
    define: providerDefine,
    plugins: [externalizeDepsPlugin()],
    build: {
      // Sandboxed preload cannot execute ESM; CommonJS is required in packaged builds.
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts')
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  renderer: {
    root: '.',
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
      ...providerDefine
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          launcher: resolve(__dirname, 'launcher.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: [react()]
  }
})
