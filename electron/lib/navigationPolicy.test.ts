import { describe, expect, it } from 'vitest'
import { evaluateTopLevelNavigation, isYouTubeHttpsUrl } from './navigationPolicy'

const loopback = 'http://127.0.0.1:54321'
const vite = 'http://127.0.0.1:5173'

describe('evaluateTopLevelNavigation', () => {
  const packagedCtx = {
    packagedLoopbackOrigin: loopback,
    viteDevOrigin: null as string | null,
    isDev: false
  }

  const devCtx = {
    packagedLoopbackOrigin: null as string | null,
    viteDevOrigin: vite,
    isDev: true
  }

  it('allows the exact packaged loopback origin', () => {
    expect(evaluateTopLevelNavigation(`${loopback}/`, packagedCtx)).toEqual({ action: 'allow' })
    expect(evaluateTopLevelNavigation(`${loopback}/launcher.html`, packagedCtx)).toEqual({
      action: 'allow'
    })
  })

  it('blocks same host with wrong port', () => {
    expect(evaluateTopLevelNavigation('http://127.0.0.1:1/', packagedCtx).action).toBe('deny')
  })

  it('blocks attacker HTTP origins', () => {
    expect(evaluateTopLevelNavigation('http://attacker.example/', packagedCtx).action).toBe('deny')
    expect(evaluateTopLevelNavigation('https://evil.example/', packagedCtx).action).toBe('deny')
  })

  it('allows Vite origin in development only', () => {
    expect(evaluateTopLevelNavigation(`${vite}/`, devCtx)).toEqual({ action: 'allow' })
    expect(evaluateTopLevelNavigation(`${vite}/`, packagedCtx).action).toBe('deny')
  })

  it.each([
    'veil-media://local/abc',
    'file:///C:/Windows/notepad.exe',
    'data:text/html,hi',
    'javascript:alert(1)',
    'blob:http://127.0.0.1:54321/uuid',
    'devtools://devtools/bundled/inspector.html'
  ])('blocks top-level %s', (url) => {
    expect(evaluateTopLevelNavigation(url, packagedCtx).action).toBe('deny')
  })

  it('blocks malformed URLs', () => {
    expect(evaluateTopLevelNavigation('not a url', packagedCtx).action).toBe('deny')
    expect(evaluateTopLevelNavigation('', packagedCtx).action).toBe('deny')
  })

  it('opens YouTube HTTPS externally rather than navigating internally', () => {
    const decision = evaluateTopLevelNavigation(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      packagedCtx
    )
    expect(decision).toEqual({
      action: 'open-external',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    })
  })

  it('does not allow YouTube as an in-app top-level allow', () => {
    const decision = evaluateTopLevelNavigation('https://youtu.be/dQw4w9WgXcQ', packagedCtx)
    expect(decision.action).not.toBe('allow')
  })
})

describe('isYouTubeHttpsUrl', () => {
  it('accepts YouTube HTTPS family hosts', () => {
    expect(isYouTubeHttpsUrl('https://www.youtube.com/watch?v=x')).toBe(true)
    expect(isYouTubeHttpsUrl('https://youtu.be/x')).toBe(true)
  })

  it('rejects non-HTTPS and non-YouTube', () => {
    expect(isYouTubeHttpsUrl('http://www.youtube.com/watch?v=x')).toBe(false)
    expect(isYouTubeHttpsUrl('https://example.com')).toBe(false)
  })
})
