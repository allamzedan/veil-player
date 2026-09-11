import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { buildMetadataFingerprint } from './fingerprint'
import { localSkipHostTarget } from './localSkipPlayback'
import { parseVeilTrack, parseVeilTrackJson } from './trackSchema'
import { buildVeilTrackFromStore, parseAndDeserializeTrackJson } from './trackSerialization'
import { reconcilePlayback } from './reconciler'
import type { SkipTrackItem } from '../types/track'

const corpus = 'C:/dev/veil/conformance/0.1'
const fixture = (relative: string): string => fs.readFileSync(path.join(corpus, relative), 'utf8')
const skip: SkipTrackItem = { id: 's', type: 'skip', start: 10, end: 20, enabled: true }

describe('final VEIL Spec 0.1 alignment', () => {
  describe('local nonzero-offset Skip', () => {
    const target = (currentTime: number, duration: number, offset: number) => localSkipHostTarget({
      currentTime, duration, globalOffsetSeconds: offset, activeSkips: [skip], allSkips: [skip]
    })
    it('converts +2 VEIL target to host 18', () => expect(target(8, 100, 2)).toBe(18))
    it('converts -2 VEIL target to host 22', () => expect(target(12, 100, -2)).toBe(22))
    it('clamps terminal Skip in VEIL coordinates for known duration', () => expect(target(13, 15, 2)).toBe(15))
    it('converts target for unknown duration', () => expect(target(8, Number.NaN, 2)).toBe(18))
    it('uses the same conversion when playback resumes inside Skip', () => expect(target(13, 100, 2)).toBe(18))
  })

  describe('metadata-v1 deterministic generation', () => {
    const fp = (duration: number, fileSize: number | null, width=1920, height=1080) =>
      buildMetadataFingerprint('synthetic.mp4', { name:'synthetic.mp4', duration, fileSize, width, height }).value
    it('renders null size and integral duration', () => expect(fp(12, null)).toBe('synthetic.mp4|null|12.000|1920|1080'))
    it('renders integral size and one-decimal duration', () => expect(fp(12.3, 123456)).toBe('synthetic.mp4|123456|12.300|1920|1080'))
    it('rounds below, at, and above half milliseconds', () => {
      expect(fp(12.0004, 1)).toContain('|12.000|')
      expect(fp(12.0005, 1)).toContain('|12.001|')
      expect(fp(12.0006, 1)).toContain('|12.001|')
    })
    it('uses canonical decimal dimensions without exponent notation', () => {
      expect(fp(1, 1.5, 1920.5, 0.000001)).toBe('synthetic.mp4|1.5|1.000|1920.5|0.000001')
    })
  })

  describe('parser, forward compatibility, and writer', () => {
    it('accepts a style-less frozen Mask with Desktop defaults', () => {
      const parsed = parseVeilTrackJson(fixture('serialization/valid/mask.veil'))
      expect(parsed.ok).toBe(true)
      if (parsed.ok) expect(parsed.track.items[0]).toMatchObject({ type:'mask', style:{ mode:'solid' } })
    })
    it('still rejects malformed known Masks', () => {
      expect(parseVeilTrackJson(fixture('serialization/invalid/malformed-known-mask.veil')).ok).toBe(false)
      expect(parseVeilTrackJson(fixture('serialization/invalid/mask-style-invalid-mode.veil')).ok).toBe(false)
    })
    it('accepts an isolated unknown item partially and continues known runtime', () => {
      const parsed = parseVeilTrackJson(fixture('serialization/forward/unknown-item-isolatable.veil'))
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      expect(parsed.status).toBe('ACCEPT_PARTIAL')
      expect(parsed.track.preservedUnknownItems).toHaveLength(1)
      expect(reconcilePlayback({ items:parsed.track.items, globalOffsetSeconds:0 }, 12).activeMutes).toHaveLength(1)
    })
    it('preserves unknown root fields and unknown items through ordinary save', () => {
      for (const file of ['serialization/forward/unknown-field-roundtrip.veil','serialization/forward/unknown-item-roundtrip.veil']) {
        const opened = parseAndDeserializeTrackJson(fixture(file))
        expect(opened.ok).toBe(true)
        if (!opened.ok || !opened.payload) continue
        const saved = buildVeilTrackFromStore({ ...opened.payload, videoMetadata:{ name:'sample.mp4',duration:120,fileSize:1000000,width:1920,height:1080 }, videoFileName:'sample.mp4' })
        if (file.includes('unknown-field')) expect((saved as unknown as Record<string, unknown>).futureRoot).toBeDefined()
        else expect((saved?.items[0] as unknown as { type:string }).type).toBe('future_action')
      }
    })
    it('reader tolerates duplicate IDs but writer rejects them deterministically', () => {
      const doc = JSON.parse(fixture('serialization/valid/minimal-local.veil'))
      doc.items = [{ id:'dup',type:'mute',start:1,end:2 },{ id:'dup',type:'skip',start:3,end:4 }]
      const parsed = parseVeilTrack(doc)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      const payload = parseAndDeserializeTrackJson(JSON.stringify(doc))
      expect(payload.ok).toBe(true)
      if (!payload.ok || !payload.payload) return
      const save = () => buildVeilTrackFromStore({ ...payload.payload!, videoMetadata:{ name:'sample.mp4',duration:120,fileSize:1000000,width:1920,height:1080 }, videoFileName:'sample.mp4' })
      expect(save).toThrow('duplicate item id "dup"')
      expect(save).toThrow('duplicate item id "dup"')
    })
  })

  describe('duplicate JSON and resource admission', () => {
    it('rejects root and nested duplicate members without regex parsing', () => {
      expect(parseVeilTrackJson('{"version":"1.6.0","version":"1.6.0"}').ok).toBe(false)
      expect(parseVeilTrackJson('{"version":"1.6.0","app":"VEIL","video":{"name":"a","name":"b"}}').ok).toBe(false)
    })
    it('enforces injected item and string limits', () => {
      const items = JSON.parse(fs.readFileSync(path.join(corpus,'security/limit__items.json'),'utf8')).input.document
      const strings = JSON.parse(fs.readFileSync(path.join(corpus,'security/limit__string.json'),'utf8')).input.document
      expect(parseVeilTrack(items,{maxItems:2})).toMatchObject({ok:false,status:'LIMIT_EXCEEDED'})
      expect(parseVeilTrack(strings,{maxStringLength:16})).toMatchObject({ok:false,status:'LIMIT_EXCEEDED'})
    })
    it('keeps ordinary reasonable documents admissible', () => {
      expect(parseVeilTrackJson(fixture('serialization/valid/minimal-local.veil')).ok).toBe(true)
    })
  })
})
