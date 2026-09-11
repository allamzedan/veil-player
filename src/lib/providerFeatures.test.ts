import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('RC2 provider distribution gate', () => {
  it('defaults production builds to provider-disabled', () => {
    const config = readFileSync('electron.vite.config.ts', 'utf8')
    expect(config).toContain("process.env.VEIL_ENABLE_YOUTUBE_PROVIDER === 'true'")
    expect(config).toContain('__VEIL_ENABLE_YOUTUBE_PROVIDER__')
  })

  it('gates provider UI and main-process metadata registration', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    const menu = readFileSync('src/components/AppMenuBar.tsx', 'utf8')
    const launcher = readFileSync('src/launcher/LauncherApp.tsx', 'utf8')
    const main = readFileSync('electron/main.ts', 'utf8')
    expect(app).toContain('YOUTUBE_PROVIDER_ENABLED ? handleOpenYouTube : undefined')
    expect(menu).toContain('YOUTUBE_PROVIDER_ENABLED')
    expect(launcher).toContain('YOUTUBE_PROVIDER_ENABLED')
    expect(main).toContain('if (youtubeProviderEnabled) registerYouTubeMetadataHandlers()')
  })
})
