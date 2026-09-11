import { describe, expect, it } from 'vitest'
import { normalizeTrackSavePath, suggestTrackFilename } from './trackFilenames'

describe('trackFilenames', () => {
  it('suggests .veil for a plain video filename', () => {
    expect(normalizeTrackSavePath('movie')).toBe('movie.veil')
    expect(suggestTrackFilename('movie.mp4', null)).toBe('movie.veil')
  })

  it('keeps an existing .veil filename', () => {
    expect(normalizeTrackSavePath('movie.veil')).toBe('movie.veil')
    expect(suggestTrackFilename(null, 'movie.veil')).toBe('movie.veil')
  })

  it('keeps an existing .veil.json filename', () => {
    expect(normalizeTrackSavePath('movie.veil.json')).toBe('movie.veil.json')
    expect(suggestTrackFilename(null, 'movie.veil.json')).toBe('movie.veil.json')
  })

  it('keeps an existing .json filename', () => {
    expect(normalizeTrackSavePath('movie.json')).toBe('movie.json')
    expect(suggestTrackFilename(null, 'movie.json')).toBe('movie.json')
  })

  it('does not allow an accidental .veil.veil suffix', () => {
    expect(normalizeTrackSavePath('movie.veil.veil')).toBe('movie.veil')
    expect(normalizeTrackSavePath('movie.veil.json.veil')).toBe('movie.veil.json')
    expect(normalizeTrackSavePath('movie.json.veil')).toBe('movie.json')
    expect(suggestTrackFilename(null, 'movie.veil.veil')).toBe('movie.veil')
  })
})
