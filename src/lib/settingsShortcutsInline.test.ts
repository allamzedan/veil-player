import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SHORTCUT_CATEGORY_LABELS, SHORTCUT_ENTRIES } from './shortcuts'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('Settings inline shortcuts', () => {
  it('renders the shared shortcut content directly in the Settings pane', () => {
    const settings = read('../components/SettingsDialog.tsx')
    const help = read('../components/ShortcutHelp.tsx')
    expect(settings).toContain("import { ShortcutHelpContent } from './ShortcutHelp'")
    expect(settings).toContain('shortcuts: <ShortcutHelpContent />')
    expect(help.match(/<ShortcutHelpContent \/>/g)).toHaveLength(1)
    expect(help).toContain('export function ShortcutHelpContent()')
  })

  it('removes the secondary modal launcher from Settings while preserving Help-menu modal support', () => {
    const settings = read('../components/SettingsDialog.tsx')
    const app = read('../App.tsx')
    expect(settings).not.toContain('onOpenShortcutHelp')
    expect(settings).not.toContain("t('settings.openShortcuts')")
    expect(app).not.toContain('onOpenShortcutHelp=')
    expect(app).toContain('<ShortcutHelp open={shortcutHelpOpen}')
  })

  it('preserves all shortcut entries, categories, and internal Settings scrolling', () => {
    const help = read('../components/ShortcutHelp.tsx')
    const styles = read('../styles.css')
    expect(SHORTCUT_ENTRIES.length).toBeGreaterThan(20)
    for (const category of Object.values(SHORTCUT_CATEGORY_LABELS)) {
      expect(category.length).toBeGreaterThan(0)
    }
    expect(help).toContain('SHORTCUT_ENTRIES.filter')
    expect(help).toContain('SHORTCUT_CATEGORY_LABELS[category]')
    expect(styles).toMatch(/\.settings-dialog__content\s*\{[^}]*overflow:\s*auto;/s)
  })
})
