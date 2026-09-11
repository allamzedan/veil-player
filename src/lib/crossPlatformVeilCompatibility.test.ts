import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseAndDeserializeTrackJson } from './trackSerialization'
import { serializeTrackForExport } from './trackExport'
import { SUPPORTED_TRACK_VERSION } from '../types/track'
import { buildMatchingVeilCandidates } from './matchingVeilPaths'

const fixturePath = resolve(process.cwd(), 'src/lib/__fixtures__/local-cross-platform-1.6.0.veil.json')
const fixture = readFileSync(fixturePath, 'utf8').trim()

describe('cross-platform .veil compatibility', () => {
  it('parses LF and CRLF JSON identically and preserves the canonical fixture', () => {
    const lf = parseAndDeserializeTrackJson(fixture.replaceAll('\r\n', '\n'))
    const crlf = parseAndDeserializeTrackJson(fixture.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'))

    expect(lf.ok).toBe(true)
    expect(crlf).toEqual(lf)
    if (!lf.ok) return

    expect(lf.track.version).toBe(SUPPORTED_TRACK_VERSION)
    expect(lf.track.video?.name).toBe('旅行 — café.mp4')
    expect(lf.track.trackMetadata?.title).toBe('Пример — café 演示')
    expect(lf.track.items.map((item) => item.type)).toEqual(['mask', 'mute', 'skip', 'bookmark'])
    expect(serializeTrackForExport(lf.track)).toBe(serializeTrackForExport(crlf.ok ? crlf.track : lf.track))
  })

  it('round-trips action timings, metadata, and Unicode without path leakage', () => {
    const parsed = parseAndDeserializeTrackJson(fixture)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.track.items.map(({ type, start, end }) => ({ type, start, end }))).toEqual([
      { type: 'mask', start: 12.25, end: 18.5 },
      { type: 'mute', start: 30, end: 34.75 },
      { type: 'skip', start: 60.5, end: 72.125 },
      { type: 'bookmark', start: 99.875, end: 99.875 }
    ])
    expect(JSON.stringify(parsed.track)).not.toMatch(/[A-Za-z]:\\|\\\\/)
  })

  it('keeps moved-media matching platform-neutral at the sidecar boundary', () => {
    expect(buildMatchingVeilCandidates('C:/Media/旅行 — café.mp4').map((path) => path.replaceAll(String.fromCharCode(92), '/'))).toEqual([
      'C:/Media/旅行 — café.veil',
      'C:/Media/旅行 — café.mp4.veil',
      'C:/Media/旅行 — café.veil.json',
      'C:/Media/旅行 — café.mp4.veil.json',
      'C:/Media/旅行 — café.veil.veil'
    ])
    expect(buildMatchingVeilCandidates('C:\\Media\\旅行 — café.mp4').map((path) => path.replaceAll(String.fromCharCode(92), '/'))).toEqual([
      'C:/Media/旅行 — café.veil',
      'C:/Media/旅行 — café.mp4.veil',
      'C:/Media/旅行 — café.veil.json',
      'C:/Media/旅行 — café.mp4.veil.json',
      'C:/Media/旅行 — café.veil.veil'
    ])
  })

  it('continues rejecting unknown schema versions', () => {
    const future = fixture.replace('"version": "1.6.0"', '"version": "1.7.0"')
    expect(parseAndDeserializeTrackJson(future)).toEqual({
      ok: false,
      message: 'Unsupported track version (1.7.0). Expected version 1.0.0 or 1.1.0 or 1.2.0 or 1.3.0 or 1.4.0 or 1.5.0 or 1.6.0.'
    })
  })
})
