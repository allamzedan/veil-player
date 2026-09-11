import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildMediaRangeResponse } from './mediaRangeResponse'

const fixtureDir = join(process.cwd(), '.tmp-media-range-test')
const fixturePath = join(fixtureDir, 'sample.mp4')

async function responseText(response: Response): Promise<string> {
  return Buffer.from(await response.arrayBuffer()).toString('utf8')
}

describe('buildMediaRangeResponse', () => {
  beforeAll(async () => {
    await mkdir(fixtureDir, { recursive: true })
    await writeFile(fixturePath, '0123456789', 'utf8')
  })

  afterAll(async () => {
    await rm(fixtureDir, { recursive: true, force: true })
  })

  it('serves a full media response with range support headers', async () => {
    const response = await buildMediaRangeResponse(fixturePath, null)

    expect(response.status).toBe(200)
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(response.headers.get('content-length')).toBe('10')
    expect(response.headers.get('content-type')).toBe('video/mp4')
    expect(await responseText(response)).toBe('0123456789')
  })

  it('serves a requested byte range as a partial content response', async () => {
    const response = await buildMediaRangeResponse(fixturePath, 'bytes=2-5')

    expect(response.status).toBe(206)
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(response.headers.get('content-length')).toBe('4')
    expect(response.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(await responseText(response)).toBe('2345')
  })

  it('serves suffix byte ranges', async () => {
    const response = await buildMediaRangeResponse(fixturePath, 'bytes=-3')

    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 7-9/10')
    expect(await responseText(response)).toBe('789')
  })

  it('rejects unsatisfiable byte ranges', async () => {
    const response = await buildMediaRangeResponse(fixturePath, 'bytes=99-120')

    expect(response.status).toBe(416)
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(response.headers.get('content-range')).toBe('bytes */10')
  })

  it('maps common audio extensions to audio MIME types', async () => {
    const cases = [
      ['sample.mp3', 'audio/mpeg'],
      ['sample.wav', 'audio/wav'],
      ['sample.m4a', 'audio/mp4'],
      ['sample.aac', 'audio/aac'],
      ['sample.flac', 'audio/flac'],
      ['sample.ogg', 'audio/ogg']
    ] as const

    for (const [name, mime] of cases) {
      const path = join(fixtureDir, name)
      await writeFile(path, 'audio-bytes', 'utf8')
      const response = await buildMediaRangeResponse(path, null)
      expect(response.headers.get('content-type')).toBe(mime)
    }
  })

  it('maps common video extensions to video MIME types', async () => {
    const cases = [
      ['sample.mp4', 'video/mp4'],
      ['sample.m4v', 'video/x-m4v'],
      ['sample.mov', 'video/quicktime'],
      ['sample.webm', 'video/webm'],
      ['sample.ogv', 'video/ogg'],
      ['sample.mkv', 'video/x-matroska'],
      ['sample.avi', 'video/x-msvideo']
    ] as const

    for (const [name, mime] of cases) {
      const path = join(fixtureDir, name)
      await writeFile(path, 'audio-bytes', 'utf8')
      const response = await buildMediaRangeResponse(path, null)
      expect(response.headers.get('content-type')).toBe(mime)
    }
  })
})
