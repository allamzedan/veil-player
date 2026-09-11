import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  recentTargetLabel,
  recentTargetTitle,
  toRecentOpenTargets
} from './recentHistory'
import type { PersistedRecentHistory } from '../../electron/lib/recentHistoryStore'

const read = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

function historyFixture(): PersistedRecentHistory {
  return {
    videos: [
      {
        kind: 'local',
        name: 'movie.mp4',
        mediaKey: 'veil-media://one',
        filePath: 'C:\\Films\\A\\movie.mp4',
        openedAt: 30
      },
      {
        kind: 'youtube',
        name: 'Saved video',
        mediaKey: 'dQw4w9WgXcQ',
        videoId: 'dQw4w9WgXcQ',
        canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        openedAt: 20
      },
      {
        kind: 'local',
        name: 'movie.mp4',
        mediaKey: 'veil-media://two',
        filePath: 'D:\\Films\\B\\movie.mp4',
        openedAt: 10
      }
    ],
    veils: [
      {
        title: 'Family edit',
        filePath: 'C:\\Veils\\family.veil',
        actionCount: 4,
        badge: 'familySafe',
        openedAt: 25
      }
    ]
  }
}

describe('authoritative recent history projection', () => {
  it('combines local media, YouTube, and VEIL entries newest-first', () => {
    const targets = toRecentOpenTargets(historyFixture())
    expect(targets.map((target) => target.kind)).toEqual(['local', 'veil', 'youtube', 'local'])
    expect(recentTargetTitle(targets[2])).toBe('Saved video')
  })

  it('shows compact labels and disambiguates duplicate local filenames by parent folder', () => {
    const targets = toRecentOpenTargets(historyFixture())
    expect(recentTargetLabel(targets[0], targets)).toBe('movie.mp4 — A')
    expect(recentTargetLabel(targets[2], targets)).toBe('Saved video')
    expect(recentTargetLabel(targets[3], targets)).toBe('movie.mp4 — B')
  })

  it('uses one Electron-backed hook in both launcher and File menu, with no renderer history storage', () => {
    const launcher = read('../launcher/LauncherApp.tsx')
    const menu = read('../components/AppMenuBar.tsx')
    const hook = read('./recentHistory.ts')
    const media = read('./sessionRecovery.ts')
    const veils = read('./recentVeils.ts')

    expect(launcher).toContain('useRecentHistory(window.veilLauncher)')
    expect(menu).toContain('useRecentHistory(window.veil)')
    expect(hook).toContain('api.readRecentHistory()')
    expect(hook).toContain('api.onRecentHistoryChanged')
    expect(hook).toContain('api.clearRecentHistory()')
    expect(media).not.toContain('localStorage')
    expect(veils).not.toContain('localStorage')
  })

  it('keeps launcher and menu activation routed through existing application workflows', () => {
    const launcher = read('../launcher/LauncherApp.tsx')
    const app = read('../App.tsx')
    expect(launcher).toContain('api.openYouTube()')
    expect(launcher).toContain('api.openRecentYouTube(entry.canonicalUrl!)')
    expect(app).toContain("action.type === 'openYouTubeUrl'")
    expect(app).toContain('parseYouTubeUrl(target.url)')
    expect(app).toContain("target.kind === 'local'")
    expect(app).toContain('recentPathExists(target.filePath)')
  })

  it('shows an empty state for each empty launcher list and exposes Clear Recent', () => {
    const launcher = read('../launcher/LauncherApp.tsx')
    const menu = read('../components/AppMenuBar.tsx')
    expect(launcher.match(/<p className="launcher-empty">\{t\('launcher.noRecents'\)\}<\/p>/g)).toHaveLength(2)
    expect(launcher).toContain("t('menu.clearRecent')")
    expect(menu).toContain("id: 'clearRecent'")
  })

  it('places Clear Recent in the Recent Media header with its existing action and empty-state behavior', () => {
    const launcher = read('../launcher/LauncherApp.tsx')
    const recentMediaStart = launcher.indexOf("t('launcher.recentMedia')")
    const recentListStart = launcher.indexOf('{recentVideos.length > 0', recentMediaStart)
    const recentHeader = launcher.slice(recentMediaStart, recentListStart)

    expect(recentMediaStart).toBeGreaterThan(-1)
    expect(recentHeader).toContain('launcher-section__actions')
    expect(recentHeader).toContain('launcher-section__clear')
    expect(recentHeader).toContain('aria-label={t(\'menu.clearRecent\')}')
    expect(recentHeader).toContain('onClick={() => void clearRecent()}')
    expect(recentHeader).toContain('disabled={history.videos.length === 0 && history.veils.length === 0}')
    expect(launcher).not.toContain('launcher-recents__toolbar')
  })
})

describe('startup Welcome removal', () => {
  it('does not mount or gate startup on the first-run dialog', () => {
    const app = read('../App.tsx')
    expect(app).toContain('const [firstRunOpen, setFirstRunOpen] = useState(false)')
    expect(app).toContain('{firstRunOpen ? (')
    expect(app).toContain('<FirstRunOverlay open onDismiss={() => setFirstRunOpen(false)} />')
    expect(app).not.toContain('readFirstRunComplete')
  })

  it('keeps the explicit Learn More action and reusable content without replacement onboarding', () => {
    expect(read('../components/FirstRunOverlay.tsx')).toContain("t('firstRun.title')")
    const app = read('../App.tsx')
    expect(app).toContain('onLearnMore={() => setFirstRunOpen(true)}')
    expect(app).not.toMatch(/onboarding|tutorial|tour/i)
  })

  it('leaves schema 1.6.0 unchanged', () => {
    expect(read('../types/track.ts')).toContain("export const TRACK_VERSION_1_6 = '1.6.0'")
  })
  it('uses the official VEIL document artwork and isolated thumbnail fallback presentation', () => {
    const launcher = read('../launcher/LauncherApp.tsx')
    const thumbnail = read('../launcher/RecentMediaThumb.tsx')
    expect(launcher).toContain("import veilDocument from '../assets/veil-document.png'")
    expect(launcher).toContain('launcher-row__thumb--veil')
    expect(thumbnail).toContain('thumbnailCache')
    expect(thumbnail).toContain("kind !== 'video'")
    expect(thumbnail).toContain("kind === 'audio'")
    expect(thumbnail).not.toContain('youtube.com')
  })
})