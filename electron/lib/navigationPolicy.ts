/**
 * Top-level BrowserWindow navigation policy for VEIL Player.
 * Media protocol `veil-media:` remains registered for <video>/<audio> resource
 * requests; it must never replace the application renderer as a top-level URL.
 */

export type NavigationDecision =
  | { action: 'allow' }
  | { action: 'deny' }
  | { action: 'open-external'; url: string }

export interface NavigationPolicyContext {
  /** Exact packaged loopback origin, e.g. http://127.0.0.1:54321 */
  packagedLoopbackOrigin: string | null
  /** Exact Vite renderer origin while unpackaged, e.g. http://127.0.0.1:5173 */
  viteDevOrigin: string | null
  isDev: boolean
}

function originsEqual(left: string, right: string): boolean {
  try {
    const a = new URL(left)
    const b = new URL(right)
    return a.origin === b.origin
  } catch {
    return false
  }
}

function urlStartsWithOrigin(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url)
    const allowed = new URL(origin)
    return parsed.origin === allowed.origin
  } catch {
    return false
  }
}

export function isYouTubeHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      return false
    }
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    return (
      host === 'youtube.com' ||
      host === 'youtu.be' ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube.com') ||
      host.endsWith('.youtu.be') ||
      host.endsWith('.youtube-nocookie.com')
    )
  } catch {
    return false
  }
}

/**
 * Evaluate whether a top-level navigation / window open may proceed.
 * Protocol-only checks are insufficient; origins are compared exactly.
 */
export function evaluateTopLevelNavigation(
  rawUrl: string,
  ctx: NavigationPolicyContext
): NavigationDecision {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { action: 'deny' }
  }

  const protocol = parsed.protocol.toLowerCase()

  if (
    protocol === 'veil-media:' ||
    protocol === 'file:' ||
    protocol === 'data:' ||
    protocol === 'javascript:' ||
    protocol === 'blob:' ||
    protocol === 'devtools:' ||
    protocol === 'veil:'
  ) {
    return { action: 'deny' }
  }

  if (ctx.packagedLoopbackOrigin && urlStartsWithOrigin(rawUrl, ctx.packagedLoopbackOrigin)) {
    return { action: 'allow' }
  }

  if (ctx.isDev && ctx.viteDevOrigin && urlStartsWithOrigin(rawUrl, ctx.viteDevOrigin)) {
    return { action: 'allow' }
  }

  if (protocol === 'https:' && isYouTubeHttpsUrl(rawUrl)) {
    return { action: 'open-external', url: parsed.toString() }
  }

  // Same host as loopback but wrong port / scheme must not pass.
  if (ctx.packagedLoopbackOrigin) {
    try {
      const allowed = new URL(ctx.packagedLoopbackOrigin)
      if (
        parsed.hostname === allowed.hostname &&
        !originsEqual(rawUrl, ctx.packagedLoopbackOrigin)
      ) {
        return { action: 'deny' }
      }
    } catch {
      // ignore
    }
  }

  return { action: 'deny' }
}
