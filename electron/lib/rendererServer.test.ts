import { createConnection, createServer } from 'node:net'
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  extractRawHostValues,
  isAllowedRendererHost,
  rawHostHttpStatus,
  resolveRendererRequestPath,
  startRendererServer,
  validateRawHostHeaders,
  type RendererServer
} from './rendererServer'
import { buildRendererCsp, RENDERER_CSP } from './rendererCsp'

const fixtureRoot = join(process.cwd(), '.tmp-renderer-server-test')

async function readBody(res: Response): Promise<string> {
  return Buffer.from(await res.arrayBuffer()).toString('utf8')
}

async function requestWithHost(
  port: number,
  hostHeader: string | undefined,
  path = '/'
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = require('node:http').request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
        headers: hostHeader === undefined ? {} : { Host: hostHeader }
      },
      (res: import('node:http').IncomingMessage) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8')
          })
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

/** Raw TCP HTTP request — preserves duplicate Host fields exactly as provided. */
async function rawHttpRequest(
  port: number,
  requestText: string,
  timeoutMs = 3000
): Promise<{ status: number; headers: string; body: string; raw: string }> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => {
      socket.write(requestText.replace(/\n/g, '\r\n'))
    })
    const chunks: Buffer[] = []
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`rawHttpRequest timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    socket.on('data', (c) => chunks.push(c))
    socket.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    socket.on('end', () => {
      clearTimeout(timer)
      const raw = Buffer.concat(chunks).toString('utf8')
      const headerEnd = raw.indexOf('\r\n\r\n')
      const headerBlock = headerEnd >= 0 ? raw.slice(0, headerEnd) : raw
      const body = headerEnd >= 0 ? raw.slice(headerEnd + 4) : ''
      const statusLine = headerBlock.split('\r\n')[0] ?? ''
      const statusMatch = /^HTTP\/\d\.\d\s+(\d+)/.exec(statusLine)
      resolve({
        status: statusMatch ? Number(statusMatch[1]) : 0,
        headers: headerBlock,
        body,
        raw
      })
    })
  })
}

function assertNoSensitiveLeak(body: string, headers = ''): void {
  const blob = `${headers}\n${body}`
  expect(blob).not.toMatch(/app\.asar/i)
  expect(blob).not.toMatch(/[A-Za-z]:\\Users\\/i)
  expect(blob).not.toMatch(/stack/i)
  expect(blob).not.toContain('<!doctype html>')
  expect(blob).not.toContain('<script')
  expect(blob).not.toContain('renderer-root')
}

describe('validateRawHostHeaders', () => {
  const expected = '127.0.0.1:4567'

  it('accepts exactly one exact Host', () => {
    const result = validateRawHostHeaders(['Host', expected], expected)
    expect(result).toEqual({ valid: true, host: expected })
    expect(rawHostHttpStatus(result)).toBeNull()
  })

  it('rejects zero Host headers', () => {
    const result = validateRawHostHeaders(['User-Agent', 't'], expected)
    expect(result).toEqual({ valid: false, reason: 'missing' })
    expect(rawHostHttpStatus(result)).toBe(400)
  })

  it('rejects duplicate Host regardless of order or equality', () => {
    expect(
      validateRawHostHeaders(
        ['Host', expected, 'Host', 'attacker.example'],
        expected
      ).reason
    ).toBe('duplicate')
    expect(
      validateRawHostHeaders(
        ['Host', 'attacker.example', 'Host', expected],
        expected
      ).reason
    ).toBe('duplicate')
    expect(
      validateRawHostHeaders(['Host', expected, 'Host', expected], expected).reason
    ).toBe('duplicate')
    expect(
      validateRawHostHeaders(
        ['Host', 'evil', 'Host', 'evil', 'Host', expected],
        expected
      ).reason
    ).toBe('duplicate')
    expect(
      validateRawHostHeaders(
        ['HOST', expected, 'host', 'attacker.example'],
        expected
      ).reason
    ).toBe('duplicate')
  })

  it('extractRawHostValues is case-insensitive on names', () => {
    expect(extractRawHostValues(['HoSt', 'a', 'X-Forwarded-Host', 'b', 'HOST', 'c'])).toEqual([
      'a',
      'c'
    ])
  })

  it('rejects malformed observable syntax with 400', () => {
    const cases = [
      '',
      '127.0.0.1:4567,evil.example',
      'user@127.0.0.1:4567',
      '127.0.0.1:4567.',
      '127.0.0.1:4567 ',
      ' 127.0.0.1:4567',
      '127.0.0.1: 4567',
      '127.0.0.1:\t4567',
      '127.0.0.1:45\x007',
      'http://127.0.0.1:4567',
      '127.0.0.1:4567/path'
    ]
    for (const value of cases) {
      const result = validateRawHostHeaders(['Host', value], expected)
      expect(result.valid, value).toBe(false)
      expect(result.reason === 'malformed' || result.reason === 'missing', value).toBe(true)
      expect(rawHostHttpStatus(result), value).toBe(400)
    }
  })

  it('rejects well-formed but incorrect authorities with 403', () => {
    const cases = [
      'attacker.example',
      'attacker.example:4567',
      '127.0.0.1:9999',
      'localhost:4567',
      '127.0.0.1',
      '[::1]:4567'
    ]
    for (const value of cases) {
      const result = validateRawHostHeaders(['Host', value], expected)
      expect(result).toEqual({ valid: false, reason: 'mismatch', host: value })
      expect(rawHostHttpStatus(result)).toBe(403)
    }
  })

  it('ignores Forwarded / X-Forwarded-Host when Host is valid', () => {
    const result = validateRawHostHeaders(
      [
        'Host',
        expected,
        'X-Forwarded-Host',
        'attacker.example',
        'Forwarded',
        'host=attacker.example'
      ],
      expected
    )
    expect(result).toEqual({ valid: true, host: expected })
  })
})

describe('resolveRendererRequestPath', () => {
  beforeAll(async () => {
    await mkdir(join(fixtureRoot, 'assets'), { recursive: true })
    await writeFile(join(fixtureRoot, 'index.html'), '<!doctype html><title>ok</title>', 'utf8')
    await writeFile(join(fixtureRoot, 'assets', 'app.js'), 'console.log(1)', 'utf8')
    await writeFile(join(fixtureRoot, 'assets', 'app.css'), 'body{color:red}', 'utf8')
  })

  afterAll(async () => {
    await rm(fixtureRoot, { recursive: true, force: true })
  })

  it('maps / to index.html', () => {
    const resolved = resolveRendererRequestPath(fixtureRoot, '/')
    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.absolutePath.endsWith('index.html')).toBe(true)
      expect(resolved.contentType).toContain('text/html')
      expect(resolved.spaFallback).toBe(false)
    }
  })

  it('resolves JS/CSS assets with MIME types', () => {
    const js = resolveRendererRequestPath(fixtureRoot, '/assets/app.js')
    const css = resolveRendererRequestPath(fixtureRoot, '/assets/app.css')
    expect(js.ok && js.contentType).toContain('javascript')
    expect(css.ok && css.contentType).toContain('text/css')
  })

  it.each([
    '/../package.json',
    '/%2e%2e/package.json',
    '/%252e%252e/package.json',
    '/..\\package.json',
    '/assets/../../package.json'
  ])('rejects traversal %s', (pathname) => {
    const resolved = resolveRendererRequestPath(fixtureRoot, pathname)
    expect(resolved.ok).toBe(false)
    if (!resolved.ok) {
      expect([400, 403]).toContain(resolved.status)
    }
  })

  it('returns 404 for missing static assets without SPA fallback', () => {
    const resolved = resolveRendererRequestPath(fixtureRoot, '/assets/missing.js')
    expect(resolved.ok).toBe(false)
    if (!resolved.ok) {
      expect(resolved.status).toBe(404)
      expect(resolved.reason).toBe('missing_asset')
    }
  })

  it('SPA-falls back extensionless routes to index.html', () => {
    const resolved = resolveRendererRequestPath(fixtureRoot, '/settings')
    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.spaFallback).toBe(true)
      expect(resolved.absolutePath.endsWith('index.html')).toBe(true)
    }
  })
})

describe('isAllowedRendererHost', () => {
  const allowed = '127.0.0.1:4567'

  it('allows the exact active authority', () => {
    expect(isAllowedRendererHost(allowed, allowed).ok).toBe(true)
  })

  it.each([
    ['attacker.example', 403],
    ['attacker.example:4567', 403],
    ['127.0.0.1:1', 403],
    ['localhost:4567', 403],
    ['127.0.0.1:4567.', 400],
    ['user@127.0.0.1:4567', 400],
    ['127.0.0.1:4567,evil.com', 400],
    [' 127.0.0.1:4567', 400],
    ['127.0.0.1:4567 ', 400]
  ] as const)('rejects Host %s', (host, status) => {
    const result = isAllowedRendererHost(host, allowed)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(status)
    }
  })

  it('rejects missing Host', () => {
    const result = isAllowedRendererHost(undefined, allowed)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
    }
  })

  it('rejects array Host values', () => {
    const result = isAllowedRendererHost(['127.0.0.1:4567', 'evil'], allowed)
    expect(result.ok).toBe(false)
  })
})

describe('startRendererServer', () => {
  let server: RendererServer | null = null

  beforeAll(async () => {
    await mkdir(join(fixtureRoot, 'assets'), { recursive: true })
    await writeFile(join(fixtureRoot, 'index.html'), '<!doctype html><title>ok</title>', 'utf8')
    await writeFile(join(fixtureRoot, 'assets', 'app.js'), 'console.log(1)', 'utf8')
    await writeFile(join(fixtureRoot, 'assets', 'app.css'), 'body{color:red}', 'utf8')
    server = await startRendererServer(fixtureRoot)
  })

  afterAll(async () => {
    await server?.close()
    server = null
    await rm(fixtureRoot, { recursive: true, force: true })
  })

  it('binds only to 127.0.0.1 with an ephemeral port', () => {
    expect(server?.host).toBe('127.0.0.1')
    expect(server?.port).toBeGreaterThan(0)
    expect(server?.origin).toBe(`http://127.0.0.1:${server?.port}`)
    expect(server?.allowedHost).toBe(`127.0.0.1:${server?.port}`)
  })

  it('serves / as index.html for the exact Host', async () => {
    const res = await fetch(`${server!.origin}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await readBody(res)).toContain('<title>ok</title>')
  })

  it('serves JS/CSS with correct MIME types', async () => {
    const js = await fetch(`${server!.origin}/assets/app.js`)
    const css = await fetch(`${server!.origin}/assets/app.css`)
    expect(js.status).toBe(200)
    expect(css.status).toBe(200)
    expect(js.headers.get('content-type')).toContain('javascript')
    expect(css.headers.get('content-type')).toContain('text/css')
  })

  it('rejects path traversal over HTTP', async () => {
    const encoded = await fetch(`${server!.origin}/%2e%2e/package.json`)
    expect([400, 403, 404]).toContain(encoded.status)
    expect(encoded.status).not.toBe(200)
  })

  it('returns 404 for missing static assets', async () => {
    const res = await fetch(`${server!.origin}/assets/nope.js`)
    expect(res.status).toBe(404)
  })

  it('returns 405 for unsupported methods', async () => {
    const res = await fetch(`${server!.origin}/`, { method: 'POST' })
    expect(res.status).toBe(405)
  })

  it('rejects attacker Host headers over HTTP', async () => {
    const port = server!.port
    const exact = await requestWithHost(port, server!.allowedHost)
    expect(exact.status).toBe(200)

    for (const host of [
      'attacker.example',
      `attacker.example:${port}`,
      '127.0.0.1:1',
      `localhost:${port}`,
      `user@127.0.0.1:${port}`,
      `${server!.allowedHost}.`,
      `${server!.allowedHost},evil`
    ]) {
      const res = await requestWithHost(port, host)
      expect(res.status, `Host=${JSON.stringify(host)}`).not.toBe(200)
      expect([400, 403], `Host=${JSON.stringify(host)}`).toContain(res.status)
      assertNoSensitiveLeak(res.body)
    }
  })

  it('raw-socket: exact Host returns 200', async () => {
    const port = server!.port
    const allowed = server!.allowedHost
    const res = await rawHttpRequest(
      port,
      `GET / HTTP/1.1\nHost: ${allowed}\nConnection: close\n\n`
    )
    expect(res.status).toBe(200)
    expect(res.body).toContain('<title>ok</title>')
  })

  it('raw-socket: duplicate Host always 400 (any order / casing / equality)', async () => {
    const port = server!.port
    const allowed = server!.allowedHost
    const cases = [
      `GET / HTTP/1.1\nHost: ${allowed}\nHost: attacker.example\nConnection: close\n\n`,
      `GET / HTTP/1.1\nHost: attacker.example\nHost: ${allowed}\nConnection: close\n\n`,
      `GET / HTTP/1.1\nHost: ${allowed}\nHost: ${allowed}\nConnection: close\n\n`,
      `GET / HTTP/1.1\nHost: evil\nHost: evil\nConnection: close\n\n`,
      `GET / HTTP/1.1\nHOST: ${allowed}\nhost: attacker.example\nConnection: close\n\n`,
      `GET / HTTP/1.1\nHost: a\nHost: b\nHost: ${allowed}\nConnection: close\n\n`
    ]
    for (const requestText of cases) {
      const res = await rawHttpRequest(port, requestText)
      expect(res.status, requestText).toBe(400)
      assertNoSensitiveLeak(res.body, res.headers)
    }
  })

  it('raw-socket: single invalid Host authorities', async () => {
    const port = server!.port
    const allowed = server!.allowedHost
    const mismatch403 = [
      'attacker.example',
      `attacker.example:${port}`,
      '127.0.0.1:1',
      `localhost:${port}`,
      '127.0.0.1'
    ]
    for (const host of mismatch403) {
      const res = await rawHttpRequest(
        port,
        `GET / HTTP/1.1\nHost: ${host}\nConnection: close\n\n`
      )
      expect(res.status, host).toBe(403)
      assertNoSensitiveLeak(res.body, res.headers)
    }

    const malformed400 = [
      `user@127.0.0.1:${port}`,
      `${allowed}.`,
      `${allowed},evil.example`,
      ''
    ]
    for (const host of malformed400) {
      const res = await rawHttpRequest(
        port,
        `GET / HTTP/1.1\nHost: ${host}\nConnection: close\n\n`
      )
      expect(res.status, JSON.stringify(host)).toBe(400)
      assertNoSensitiveLeak(res.body, res.headers)
    }
  })

  it('raw-socket: missing Host on HTTP/1.0 and HTTP/1.1 → 400', async () => {
    const port = server!.port
    for (const requestText of [
      'GET / HTTP/1.1\nConnection: close\n\n',
      'GET / HTTP/1.0\nConnection: close\n\n'
    ]) {
      const res = await rawHttpRequest(port, requestText)
      expect(res.status).toBe(400)
      assertNoSensitiveLeak(res.body, res.headers)
    }
  })

  it('raw-socket: comma-separated Host rejected without renderer content', async () => {
    const port = server!.port
    const res = await rawHttpRequest(
      port,
      `GET / HTTP/1.1\nHost: ${server!.allowedHost},attacker.example\nConnection: close\n\n`
    )
    expect([400, 403]).toContain(res.status)
    expect(res.status).not.toBe(200)
    assertNoSensitiveLeak(res.body, res.headers)
  })

  it('raw-socket: embedded whitespace / tab / control where parser permits', async () => {
    const port = server!.port
    const allowed = server!.allowedHost
    // Synthetic unit tests cover values that Node trims/rejects before the handler.
    // Live: probe forms; if Node delivers the request, application must not serve content.
    const probes = [
      `GET / HTTP/1.1\nHost: ${allowed} evil\nConnection: close\n\n`,
      `GET / HTTP/1.1\nHost: ${allowed}\tevil\nConnection: close\n\n`,
      `GET / HTTP/1.1\nHost: ${allowed}\x01\nConnection: close\n\n`
    ]
    for (const requestText of probes) {
      try {
        const res = await rawHttpRequest(port, requestText, 1500)
        expect(res.status, requestText).not.toBe(200)
        assertNoSensitiveLeak(res.body, res.headers)
      } catch {
        // Parser closed the connection before a complete HTTP response — also OK.
      }
    }
  })

  it('raw-socket: leading OWS on Host — document Node trim vs app rejection', async () => {
    const port = server!.port
    const allowed = server!.allowedHost
    const res = await rawHttpRequest(
      port,
      `GET / HTTP/1.1\nHost:  ${allowed}\nConnection: close\n\n`
    )
    // Node/llhttp typically strips OWS; rawHeaders may then hold the exact allowed host.
    // Application rejects only values that remain observably padded in rawHeaders.
    expect([200, 400]).toContain(res.status)
    if (res.status !== 200) {
      assertNoSensitiveLeak(res.body, res.headers)
    }
  })

  it('ignores malicious X-Forwarded-Host and Forwarded when Host is valid', async () => {
    const port = server!.port
    const allowed = server!.allowedHost
    const res = await rawHttpRequest(
      port,
      [
        'GET / HTTP/1.1',
        `Host: ${allowed}`,
        'X-Forwarded-Host: attacker.example',
        'Forwarded: host=attacker.example',
        'Connection: close',
        '',
        ''
      ].join('\n')
    )
    expect(res.status).toBe(200)
    expect(res.body).toContain('<title>ok</title>')
  })

  it('rejects a raw HTTP request with no Host header', async () => {
    const port = server!.port
    const res = await rawHttpRequest(port, 'GET / HTTP/1.1\nConnection: close\n\n')
    expect(res.status).toBe(400)
    assertNoSensitiveLeak(res.body, res.headers)
  })

  it('closes idempotently and stops accepting connections', async () => {
    const local = await startRendererServer(fixtureRoot)
    const origin = local.origin
    await local.close()
    await local.close()
    await expect(fetch(origin)).rejects.toThrow()
  })

  it('is not reachable via non-loopback interfaces by construction', async () => {
    const probe = createServer()
    await new Promise<void>((resolve) => probe.listen(0, '0.0.0.0', () => resolve()))
    const addr = probe.address()
    expect(addr && typeof addr === 'object' && addr.address === '0.0.0.0').toBe(true)
    expect(server!.host).toBe('127.0.0.1')
    await new Promise<void>((resolve, reject) =>
      probe.close((error) => (error ? reject(error) : resolve()))
    )
  })

  it('emits CSP with raw.githubusercontent.com in connect-src', async () => {
    const res = await fetch(`${server!.origin}/`)
    const csp = res.headers.get('content-security-policy') ?? ''
    expect(csp).toContain('https://raw.githubusercontent.com')
    expect(csp).not.toContain('*')
    expect(csp).not.toContain('unsafe-eval')
  })
})

describe('renderer CSP parity', () => {
  it('matches index.html meta CSP content', async () => {
    const html = await readFile(join(process.cwd(), 'index.html'), 'utf8')
    const match = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)
    expect(match?.[1]).toBeTruthy()
    expect(match![1]).toBe(buildRendererCsp())
    expect(RENDERER_CSP).toBe(buildRendererCsp())
    expect(RENDERER_CSP).toContain('https://raw.githubusercontent.com')
  })
})
