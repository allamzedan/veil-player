import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isMediaLaunchFilePath, isVeilLaunchFilePath, parseLaunchPath } from './launchFile'

describe('Windows launch-file parsing', () => {
  it('recognizes .veil and supported media paths with spaces, Unicode, and apostrophes', () => {
    const directory = mkdtempSync(join(tmpdir(), 'veil-launch-'))
    const veilPath = join(directory, "L'été — sample.veil")
    const mediaPath = join(directory, '旅行 clip.mp4')
    writeFileSync(veilPath, '{}')
    writeFileSync(mediaPath, 'media')

    expect(isVeilLaunchFilePath(veilPath)).toBe(true)
    expect(isMediaLaunchFilePath(mediaPath)).toBe(true)
    expect(parseLaunchPath(['VEIL Player.exe', veilPath])).toEqual({ kind: 'veil', filePath: veilPath })
    expect(parseLaunchPath(['VEIL Player.exe', mediaPath])).toEqual({ kind: 'media', filePath: mediaPath })
  })

  it('ignores unsupported files and flags', () => {
    const directory = mkdtempSync(join(tmpdir(), 'veil-launch-'))
    const unsupportedPath = join(directory, 'notes.txt')
    writeFileSync(unsupportedPath, 'text')

    expect(parseLaunchPath(['VEIL Player.exe', '--flag', unsupportedPath])).toBeNull()
  })
})
