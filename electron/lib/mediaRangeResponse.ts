import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

const CONTENT_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.avi': 'video/x-msvideo',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.m4v': 'video/x-m4v',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm'
}

interface ByteRange {
  start: number
  end: number
}

function contentTypeForPath(filePath: string): string {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function parseSingleByteRange(rangeHeader: string | null, size: number): ByteRange | null {
  if (!rangeHeader) {
    return null
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())
  if (!match) {
    return null
  }

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') {
    return null
  }

  if (rawStart === '') {
    const suffixLength = Number(rawEnd)
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return null
    }
    const start = Math.max(size - suffixLength, 0)
    return { start, end: size - 1 }
  }

  const start = Number(rawStart)
  const end = rawEnd === '' ? size - 1 : Number(rawEnd)
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return null
  }

  return { start, end: Math.min(end, size - 1) }
}

function streamBody(filePath: string, range: ByteRange): ConstructorParameters<typeof Response>[0] {
  return Readable.toWeb(createReadStream(filePath, range)) as ConstructorParameters<typeof Response>[0]
}

export async function buildMediaRangeResponse(
  filePath: string,
  rangeHeader: string | null
): Promise<Response> {
  const stats = await stat(filePath)
  const size = stats.size
  const contentType = contentTypeForPath(filePath)
  const baseHeaders = {
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType
  }

  if (size <= 0) {
    return new Response(null, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Length': '0'
      }
    })
  }

  const range = parseSingleByteRange(rangeHeader, size)
  if (rangeHeader && !range) {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes */${size}`
      }
    })
  }

  if (!range) {
    return new Response(streamBody(filePath, { start: 0, end: size - 1 }), {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Length': String(size)
      }
    })
  }

  return new Response(streamBody(filePath, range), {
    status: 206,
    headers: {
      ...baseHeaders,
      'Content-Length': String(range.end - range.start + 1),
      'Content-Range': `bytes ${range.start}-${range.end}/${size}`
    }
  })
}
