import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APPROVED_MEDIA_EXTENSIONS } from '../../src/lib/mediaKind'

const read = (file: string): string => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('Windows installer and association contract', () => {
  it('declares VEIL identity, NSIS, portable, icon, Start Menu, uninstall, and .veil association', () => {
    const builder = read('electron-builder.yml')
    expect(builder).toContain('productName: VEIL Player')
    expect(builder).toContain('- nsis')
    expect(builder).toContain('- portable')
    expect(builder).toContain('icon: build/icon.ico')
    expect(builder).toContain('createStartMenuShortcut: true')
    expect(builder).toContain('uninstallDisplayName: VEIL Player')
    expect(builder).toContain('ext: veil')
    expect(builder).toContain('description: VEIL Playback Instructions')
  })

  it('registers every supported media type for per-user Open With and removes only VEIL-owned entries', () => {
    const include = read('build/installer.nsh')
    expect(include).toMatch(
      /WriteRegStr\s+HKCU\s+"Software\\Classes\\Applications\\VEIL Player\.exe\\shell\\open\\command"\s+""\s+'"?\$INSTDIR\\VEIL Player\.exe"?\s+"%1"'/
    )
    expect(include).toContain(
      'WriteRegStr HKCU "Software\\Classes\\Applications\\VEIL Player.exe\\SupportedTypes" ".${Extension}" ""'
    )
    expect(include).toContain(
      'WriteRegStr HKCU "Software\\Classes\\.${Extension}\\OpenWithList\\VEIL Player.exe" "" ""'
    )
    expect(include).toContain(
      'DeleteRegKey HKCU "Software\\Classes\\Applications\\VEIL Player.exe"'
    )
    expect(include).toContain(
      'DeleteRegKey HKCU "Software\\Classes\\.${Extension}\\OpenWithList\\VEIL Player.exe"'
    )

    for (const extension of APPROVED_MEDIA_EXTENSIONS) {
      expect(include).toContain(`!insertmacro RegisterVeilMediaType "${extension}"`)
      expect(include).toContain(`!insertmacro UnregisterVeilMediaType "${extension}"`)
    }

    expect(include).not.toContain('UserChoice')
    expect(include).not.toMatch(
      /WriteRegStr\s+HKCU\s+"Software\\Classes\\\.\$\{Extension\}"\s+""/
    )
    expect(read('electron-builder.yml')).toContain('ext: veil')
  })

  it('routes shell launches through the existing startup actions', () => {
    const main = read('electron/main.ts')
    expect(main).toContain("app.on('second-instance'")
    expect(main).toContain('parseLaunchPath(argv)')
    expect(main).toContain('openLaunchFile(launchPath.filePath, launchPath.kind)')
    expect(main).toContain("type: 'openVideoPath'")
    expect(main).toContain("type: 'loadVeilPath'")
    expect(main).toContain('if (!launchPath) return')
  })

  it('keeps normal launch and existing missing/dirty guards intact', () => {
    const main = read('electron/main.ts')
    const app = read('src/App.tsx')
    expect(main).toContain('createLauncherWindow()')
    expect(app).toContain('runIfAllowed(async () => {')
    expect(app).toContain('showMissingRecent(action.kind, action.filePath)')
  })
})
