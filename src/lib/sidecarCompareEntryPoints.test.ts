import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appMenu = readFileSync(new URL('../components/AppMenuBar.tsx', import.meta.url), 'utf8')
const trackChip = readFileSync(new URL('../components/TrackChip.tsx', import.meta.url), 'utf8')

describe('sidecar compare/import entry points', () => {
  it('exposes the existing action immediately after Load VEIL in both VEIL menu definitions', () => {
    expect(appMenu.match(/id: 'compareImportSidecar'/g)?.length).toBe(2)
    expect(appMenu.match(/id: 'loadTrack',[\s\S]{0,250}id: 'compareImportSidecar'/g)).toHaveLength(2)
  })

  it('exposes the same bridge action after Load / Replace VEIL inline', () => {
    expect(trackChip).toContain("label: t('trackChip.replaceTrack')")
    expect(trackChip).toContain("action: () => runAppMenuAction('compareImportSidecar')")
    expect(trackChip.indexOf("id: 'compareImport'")).toBeGreaterThan(
      trackChip.indexOf("id: 'replace'")
    )
  })
})
