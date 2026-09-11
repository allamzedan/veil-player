import { describe, expect, it } from 'vitest'
import {
  compareVersionStrings,
  isRemoteVersionNewer,
  parseUpdateMetadata,
  parseVersionSegments
} from './updateChecker'

describe('updateChecker', () => {
  it('parses version segments', () => {
    expect(parseVersionSegments('0.6.0')).toEqual([0, 6, 0])
    expect(parseVersionSegments('v1.10.2-rc.1')).toEqual([1, 10, 2])
  })

  it('compares versions', () => {
    expect(compareVersionStrings('0.6.0', '0.6.1')).toBeLessThan(0)
    expect(compareVersionStrings('0.7.0', '0.6.9')).toBeGreaterThan(0)
    expect(compareVersionStrings('0.6.0', '0.6.0')).toBe(0)
  })

  it('detects newer remote versions', () => {
    expect(isRemoteVersionNewer('0.6.1', '0.6.0')).toBe(true)
    expect(isRemoteVersionNewer('0.6.0', '0.6.0')).toBe(false)
    expect(isRemoteVersionNewer('0.5.9', '0.6.0')).toBe(false)
  })

  it('parses valid update metadata', () => {
    const info = parseUpdateMetadata({
      version: '0.7.0',
      title: 'VEIL Player 0.7.0 is available',
      notes: ['One', 'Two'],
      url: 'https://github.com/allamzedan/veilplayer/releases/latest'
    })

    expect(info).toEqual({
      version: '0.7.0',
      title: 'VEIL Player 0.7.0 is available',
      notes: ['One', 'Two'],
      url: 'https://github.com/allamzedan/veilplayer/releases/latest'
    })
  })

  it('rejects non-https release URLs', () => {
    expect(
      parseUpdateMetadata({
        version: '0.7.0',
        title: 'Update',
        url: 'http://example.com'
      })
    ).toBeNull()
  })
})
