import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_VERSION } from './appVersion'
import { SUPPORTED_TRACK_VERSION } from '../types/track'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

describe('About branding and version source', () => {
  it('renders the existing logo and product name in Settings About', () => {
    const settings = read('../components/SettingsDialog.tsx')
    expect(settings).toContain("import veilLogo from '../assets/veil-logo.png'")
    expect(settings).toContain('<img src={veilLogo} alt="" className="about-dialog__logo" />')
    expect(settings).toContain('>VEIL Player</h4>')
    expect(APP_VERSION).toBe('0.8.0-rc.2')
  })

  it('uses authoritative app and track schema constants in both About surfaces', () => {
    for (const component of ['../components/AboutDialog.tsx', '../components/SettingsDialog.tsx']) {
      const source = read(component)
      expect(source).toContain('APP_VERSION')
      expect(source).toContain('SUPPORTED_TRACK_VERSION')
      expect(source).toContain('schema: SUPPORTED_TRACK_VERSION')
    }
    expect(SUPPORTED_TRACK_VERSION).toBe('1.6.0')
  })

  it('has no stale schema literal in localized About metadata', () => {
    for (const language of ['en', 'ar', 'de', 'es', 'fr', 'ja', 'tr', 'zh']) {
      const dictionary = read(`../i18n/${language}.ts`)
      const metaLine = dictionary.split('\n').find((line) => line.includes("'about.metaVersion'"))
      expect(metaLine).toContain('{schema}')
      expect(metaLine).not.toContain('1.5.0')
    }
  })
})
