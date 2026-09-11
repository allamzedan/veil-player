import { describe, expect, it } from 'vitest'
import {
  buildTrackForExport,
  estimateUtf8Bytes,
  formatEstimatedFileSize,
  serializeTrackForExport
} from './trackExport'
import { useVeilStore } from '../state/useVeilStore'

describe('trackExport', () => {
  it('serializes export JSON without local file paths', () => {
    useVeilStore.setState({
      videoFileName: 'movie.mp4',
      videoMetadata: {
        name: 'movie.mp4',
        duration: 120,
        fileSize: 1000,
        width: 1920,
        height: 1080
      },
      trackFilePath: 'C:\\Users\\secret\\movie.veil.json',
      trackMetadata: {
        title: 'Family Safe',
        author: 'Username',
        tags: ['family', 'safe']
      },
      masks: [
        {
          id: 'm1',
          type: 'mask',
          enabled: true,
          start: 0,
          end: 5,
          rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
          style: { mode: 'solid', color: '#000', opacity: 1 }
        }
      ],
      mutes: [],
      skips: []
    })

    const track = buildTrackForExport()
    expect(track).not.toBeNull()
    if (!track) {
      return
    }

    const json = serializeTrackForExport(track)
    expect(json).not.toContain('C:\\\\Users')
    expect(json).not.toContain('trackFilePath')
    expect(json).toContain('"title": "Family Safe"')
    expect(estimateUtf8Bytes(json)).toBeGreaterThan(0)
    expect(formatEstimatedFileSize(estimateUtf8Bytes(json))).toMatch(/B|KB|MB/)
  })
})
