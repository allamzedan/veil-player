import { describe, expect, it } from 'vitest'
import { buildMatchingVeilCandidates, findExistingMatchingVeils } from './matchingVeilPaths'

describe('matching VEIL paths', () => {
  it('builds candidate paths beside a video file', () => {
    expect(buildMatchingVeilCandidates(String.raw`C:\folder\movie.mp4`)).toEqual([
      String.raw`C:\folder\movie.veil`,
      String.raw`C:\folder\movie.mp4.veil`,
      String.raw`C:\folder\movie.veil.json`,
      String.raw`C:\folder\movie.mp4.veil.json`,
      String.raw`C:\folder\movie.veil.veil`
    ])
  })

  it('returns existing matching VEIL candidates without auto-loading', () => {
    const existing = new Set([
      String.raw`C:\folder\movie.veil`,
      String.raw`C:\folder\movie.mp4.veil.json`
    ])

    expect(
      findExistingMatchingVeils(String.raw`C:\folder\movie.mp4`, (filePath) =>
        existing.has(filePath)
      )
    ).toEqual([
      String.raw`C:\folder\movie.veil`,
      String.raw`C:\folder\movie.mp4.veil.json`
    ])
  })
})
