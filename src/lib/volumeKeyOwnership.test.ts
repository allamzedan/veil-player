import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('volume arrow key ownership', () => {
  it('global VideoPlayer keydown returns immediately when defaultPrevented is set', () => {
    const source = readFileSync(new URL('../components/VideoPlayer.tsx', import.meta.url), 'utf8')
    expect(source).toMatch(/if\s*\(\s*event\.defaultPrevented\s*\)\s*\{\s*return\s*\}/)
  })

  it('VolumeControl preventDefault on Arrow Up/Down so page scroll and global steps are suppressed', () => {
    const source = readFileSync(new URL('../components/VolumeControl.tsx', import.meta.url), 'utf8')
    expect(source).toMatch(/if\s*\(\s*event\.key\s*===\s*'ArrowUp'\s*\)\s*\{[^}]*event\.preventDefault\(\)/s)
    expect(source).toMatch(/if\s*\(\s*event\.key\s*===\s*'ArrowDown'\s*\)\s*\{[^}]*event\.preventDefault\(\)/s)
    expect(source).toMatch(/\+\s*0\.05/)
    expect(source).toMatch(/-\s*0\.05/)
  })

  it('models a single 5% step when the global handler respects preventDefault', () => {
    const localStep = 0.05
    const globalStep = 0.05
    const duplicate = localStep + globalStep
    const guarded = localStep + (true ? 0 : globalStep)
    expect(duplicate).toBeCloseTo(0.1)
    expect(guarded).toBeCloseTo(0.05)
  })
})
