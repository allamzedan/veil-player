/**
 * Shared renderer Content-Security-Policy for packaged loopback and index.html.
 * Keep directives in one place to avoid meta/header drift.
 */
export const RENDERER_CSP_DIRECTIVES: ReadonlyArray<{
  name: string
  values: readonly string[]
}> = [
  { name: 'default-src', values: ["'self'"] },
  {
    name: 'script-src',
    values: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://s.ytimg.com']
  },
  { name: 'style-src', values: ["'self'", "'unsafe-inline'"] },
  {
    name: 'img-src',
    values: [
      "'self'",
      'data:',
      'blob:',
      'https://i.ytimg.com',
      'https://i9.ytimg.com',
      'https://s.ytimg.com'
    ]
  },
  { name: 'media-src', values: ["'self'", 'blob:', 'veil-media:'] },
  {
    name: 'frame-src',
    values: ['https://www.youtube.com', 'https://www.youtube-nocookie.com']
  },
  {
    name: 'connect-src',
    values: [
      "'self'",
      'https://www.youtube.com',
      'https://www.youtube-nocookie.com',
      'https://s.ytimg.com',
      'https://i.ytimg.com',
      'https://api.github.com',
      'https://raw.githubusercontent.com'
    ]
  }
]

/** Serialize CSP directives into the header/meta content string. */
export function buildRendererCsp(): string {
  return (
    RENDERER_CSP_DIRECTIVES.map(({ name, values }) => `${name} ${values.join(' ')}`).join('; ') +
    ';'
  )
}

export const RENDERER_CSP = buildRendererCsp()
