import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('NSIS presentation configuration', () => {
  it('enables both standard shortcuts and custom sidebar artwork', () => {
    const config = readFileSync('electron-builder.yml', 'utf8')
    expect(config).toContain('createStartMenuShortcut: true')
    expect(config).toContain('createDesktopShortcut: true')
    expect(config).toContain('installerSidebar: build/installer-sidebar.bmp')
    expect(config).toContain('uninstallerSidebar: build/uninstaller-sidebar.bmp')
    expect(config).toContain('include: build/installer.nsh')
    const include = readFileSync('build/installer.nsh', 'utf8')
    expect(include).toContain('!insertmacro MUI_PAGE_WELCOME')
    expect(include).toContain('!ifndef BUILD_UNINSTALLER')
    expect(include).toContain('Page custom DesktopShortcutPageCreate DesktopShortcutPageLeave')
    expect(include).toContain('Create a desktop shortcut')
    expect(include).toContain('customInstall')
    expect(existsSync('build/installer-sidebar.bmp')).toBe(true)
    expect(existsSync('build/uninstaller-sidebar.bmp')).toBe(true)
  })
})
