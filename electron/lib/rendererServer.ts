import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { RENDERER_CSP } from './rendererCsp'

export interface RendererServer {
  origin: string
  host: '127.0.0.1'
  port: number
  /** Exact Host header value accepted for this server instance. */
  allowedHost: string
  close(): Promise<void>
}

export interface StartRendererServerOptions {
  /** Optional fixed port for tests. Packaged app must use 0 (ephemeral). */
  port?: number
}

/** @deprecated Prefer importing RENDERER_CSP / buildRendererCsp from ./rendererCsp */
export const RENDERER_LOOPBACK_CSP = RENDERER_CSP

const ALLOWED_METHODS = new Set(['GET', 'HEAD'])

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm'
}

const ASSET_EXT_PATTERN =
  /\.(js|mjs|cjs|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|json|txt|wasm)$/i

export type ResolveRendererPathResult =
  | { ok: true; absolutePath: string; contentType: string; spaFallback: boolean }
  | { ok: false; status: 400 | 403 | 404; reason: string }

export interface RawHostValidationResult {
  valid: boolean
  host?: string
  reason?: 'missing' | 'duplicate' | 'malformed' | 'mismatch'
}

/**
 * Collect every raw Host field value (name match is case-insensitive).
 * Uses request.rawHeaders — never request.headers.host — so duplicates remain visible.
 */
export function extractRawHostValues(rawHeaders: readonly string[]): string[] {
  const hosts: string[] = []
  for (let i = 0; i + 1 < rawHeaders.length; i += 2) {
    const name = rawHeaders[i]
    if (typeof name === 'string' && name.toLowerCase() === 'host') {
      hosts.push(rawHeaders[i + 1] ?? '')
    }
  }
  return hosts
}

/**
 * Validate raw Host header occurrences against the exact loopback authority.
 *
 * Observable in rawHeaders (application-enforced):
 * - duplicate Host field names (any casing)
 * - empty / comma-joined / userinfo / trailing-dot / embedded whitespace / control chars
 * - authority mismatch vs expected `127.0.0.1:<port>`
 *
 * Typically stripped by Node/llhttp before the handler (often not visible in rawHeaders):
 * - header-value optional whitespace (OWS) after `Host:`
 *
 * Rejected by Node before the request handler (no renderer content):
 * - incomplete TCP requests / illegal framing
 */
export function validateRawHostHeaders(
  rawHeaders: readonly string[],
  expectedHost: string
): RawHostValidationResult {
  const hosts = extractRawHostValues(rawHeaders)
  if (hosts.length === 0) {
    return { valid: false, reason: 'missing' }
  }
  if (hosts.length > 1) {
    // Any second Host field is fatal — including identical duplicates.
    return { valid: false, reason: 'duplicate' }
  }

  const value = hosts[0]
  if (value.length === 0) {
    return { valid: false, reason: 'missing' }
  }

  // Reject observable malformation in the single raw value.
  if (
    value !== value.trim() ||
    /[\s\t\r\n,]/.test(value) ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.includes('@') ||
    value.endsWith('.') ||
    /:\/\//.test(value) ||
    value.includes('/')
  ) {
    return { valid: false, reason: 'malformed', host: value }
  }

  // Require explicit port in IPv4 host:port form and exact equality.
  if (!/^127\.0\.0\.1:\d{1,5}$/.test(value) || value !== expectedHost) {
    return { valid: false, reason: 'mismatch', host: value }
  }

  return { valid: true, host: value }
}

export function rawHostHttpStatus(result: RawHostValidationResult): 400 | 403 | null {
  if (result.valid) {
    return null
  }
  return result.reason === 'mismatch' ? 403 : 400
}

export type HostValidationResult =
  | { ok: true }
  | { ok: false; status: 400 | 403; reason: string }

/**
 * @deprecated Prefer validateRawHostHeaders(rawHeaders, expectedHost).
 * Kept for narrow single-value checks in legacy unit coverage.
 */
export function isAllowedRendererHost(
  hostHeader: string | string[] | undefined,
  allowedHost: string
): HostValidationResult {
  if (hostHeader === undefined || hostHeader === null) {
    return { ok: false, status: 400, reason: 'missing_host' }
  }
  if (Array.isArray(hostHeader)) {
    return { ok: false, status: 400, reason: 'multiple_host' }
  }
  const synthetic = ['Host', hostHeader]
  const result = validateRawHostHeaders(synthetic, allowedHost)
  if (result.valid) {
    return { ok: true }
  }
  return {
    ok: false,
    status: rawHostHttpStatus(result) ?? 400,
    reason: result.reason ?? 'malformed_host'
  }
}

function looksLikeStaticAsset(pathname: string): boolean {
  return ASSET_EXT_PATTERN.test(pathname) || /\.[a-z0-9]{1,8}$/i.test(pathname)
}

function decodePathname(raw: string): string | null {
  let pathname = raw
  try {
    pathname = decodeURIComponent(raw)
  } catch {
    return null
  }

  try {
    const twice = decodeURIComponent(pathname)
    if (twice !== pathname) {
      pathname = twice
    }
  } catch {
    return null
  }

  return pathname
}

/**
 * Map a request pathname onto a file under rendererRoot.
 * Rejects traversal, null bytes, backslashes, and absolute Windows paths.
 */
export function resolveRendererRequestPath(
  rendererRoot: string,
  rawPathname: string
): ResolveRendererPathResult {
  const root = resolve(rendererRoot)
  const raw = rawPathname || '/'
  const pathname = decodePathname(raw)
  if (pathname === null) {
    return { ok: false, status: 400, reason: 'malformed_encoding' }
  }

  if (pathname.includes('\0') || pathname.includes('\\') || /^[a-zA-Z]:/.test(pathname)) {
    return { ok: false, status: 403, reason: 'illegal_path' }
  }

  const collapsed = pathname.replace(/\\/g, '/')
  if (
    collapsed.includes('/../') ||
    collapsed.endsWith('/..') ||
    collapsed.startsWith('../') ||
    collapsed === '..'
  ) {
    return { ok: false, status: 403, reason: 'traversal' }
  }

  const segments = collapsed.split('/').filter((segment) => segment.length > 0)
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.includes('\0'))) {
    return { ok: false, status: 403, reason: 'traversal' }
  }

  const relative = segments.length === 0 ? 'index.html' : segments.join('/')
  const absolutePath = resolve(root, relative)
  const rootWithSep = root.endsWith(sep) ? root : root + sep
  if (absolutePath !== root && !absolutePath.startsWith(rootWithSep)) {
    return { ok: false, status: 403, reason: 'outside_root' }
  }

  if (existsSync(absolutePath) && statSync(absolutePath).isFile()) {
    const ext = extname(absolutePath).toLowerCase()
    return {
      ok: true,
      absolutePath,
      contentType: MIME_BY_EXT[ext] ?? 'application/octet-stream',
      spaFallback: false
    }
  }

  if (looksLikeStaticAsset(collapsed)) {
    return { ok: false, status: 404, reason: 'missing_asset' }
  }

  const indexPath = resolve(root, 'index.html')
  if (existsSync(indexPath) && statSync(indexPath).isFile()) {
    return {
      ok: true,
      absolutePath: indexPath,
      contentType: MIME_BY_EXT['.html'],
      spaFallback: true
    }
  }

  return { ok: false, status: 404, reason: 'not_found' }
}

function sendText(
  res: ServerResponse,
  status: number,
  body: string,
  contentType = 'text/plain; charset=utf-8'
): void {
  const buffer = Buffer.from(body, 'utf8')
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': buffer.byteLength,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': RENDERER_CSP,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(buffer)
}

function handleRequest(
  rendererRoot: string,
  req: IncomingMessage,
  res: ServerResponse,
  allowedHost: string
): void {
  const method = (req.method ?? 'GET').toUpperCase()
  if (!ALLOWED_METHODS.has(method)) {
    sendText(res, 405, 'Method Not Allowed')
    return
  }

  const hostCheck = validateRawHostHeaders(req.rawHeaders, allowedHost)
  if (!hostCheck.valid) {
    const status = rawHostHttpStatus(hostCheck) ?? 400
    sendText(res, status, status === 403 ? 'Forbidden' : 'Bad Request')
    return
  }

  // Absolute-form request targets (http://attacker.example/) must not bypass Host checks.
  const rawUrl = req.url ?? '/'
  if (/^https?:\/\//i.test(rawUrl)) {
    sendText(res, 400, 'Bad Request')
    return
  }

  let pathname = '/'
  try {
    pathname = new URL(rawUrl, `http://${allowedHost}`).pathname
  } catch {
    sendText(res, 400, 'Bad Request')
    return
  }

  const resolved = resolveRendererRequestPath(rendererRoot, pathname)
  if (!resolved.ok) {
    const body = resolved.status === 404 ? 'Not Found' : 'Forbidden'
    sendText(res, resolved.status, body)
    return
  }

  const { size } = statSync(resolved.absolutePath)
  const headers: Record<string, string | number> = {
    'Content-Type': resolved.contentType,
    'Content-Length': size,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': RENDERER_CSP,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff'
  }

  if (method === 'HEAD') {
    res.writeHead(200, headers)
    res.end()
    return
  }

  res.writeHead(200, headers)
  createReadStream(resolved.absolutePath).pipe(res)
}

/**
 * Serve packaged renderer assets on 127.0.0.1 with an ephemeral port.
 * Never binds to 0.0.0.0.
 */
export async function startRendererServer(
  rendererRoot: string,
  options: StartRendererServerOptions = {}
): Promise<RendererServer> {
  const root = resolve(rendererRoot)
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`[VEIL] Renderer root is not a directory: ${root}`)
  }

  const indexHtml = join(root, 'index.html')
  if (!existsSync(indexHtml)) {
    throw new Error(`[VEIL] Renderer root missing index.html: ${root}`)
  }

  const port = options.port ?? 0
  if (port < 0 || port > 65535) {
    throw new Error('[VEIL] Invalid renderer server port')
  }

  // Filled before the listen promise resolves; requests are only expected after start returns.
  let allowedHost = ''

  const server: Server = createServer((req, res) => {
    try {
      if (!allowedHost) {
        sendText(res, 503, 'Service Unavailable')
        return
      }
      handleRequest(root, req, res, allowedHost)
    } catch (error) {
      console.error('[VEIL] Renderer server request failed:', error)
      if (!res.headersSent) {
        sendText(res, 500, 'Internal Server Error')
      } else {
        res.destroy()
      }
    }
  })

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    // Explicit loopback-only bind — never 0.0.0.0
    server.listen(port, '127.0.0.1', () => {
      server.off('error', rejectListen)
      resolveListen()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('[VEIL] Renderer server failed to acquire a TCP address')
  }
  if (address.address !== '127.0.0.1') {
    server.close()
    throw new Error(`[VEIL] Renderer server bound unexpectedly to ${address.address}`)
  }

  allowedHost = `127.0.0.1:${address.port}`
  const origin = `http://${allowedHost}`
  let closed = false

  return {
    origin,
    host: '127.0.0.1',
    port: address.port,
    allowedHost,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        if (closed) {
          resolveClose()
          return
        }
        closed = true
        server.close((error) => {
          if (error) {
            // Already closed / not running — treat as success for idempotent cleanup.
            const code = (error as NodeJS.ErrnoException).code
            if (code === 'ERR_SERVER_NOT_RUNNING') {
              resolveClose()
              return
            }
            rejectClose(error)
            return
          }
          resolveClose()
        })
      })
  }
}

/** Packaged / preview renderer folder next to electron main output. */
export function resolvePackagedRendererRoot(mainDirname: string): string {
  return resolve(mainDirname, '../renderer')
}
