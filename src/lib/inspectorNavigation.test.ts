import { describe, expect, it } from 'vitest'
import {
  buildInspectorNavigationItems,
  resolveInspectorEmptyStateAction,
  resolveInspectorEmptyStateKind,
  supportedInspectorTypeFilters
} from './inspectorNavigation'
import { resolvePlaybackCapabilities } from './playbackCapabilities'
import type {
  BookmarkTrackItem,
  MaskTrackItem,
  MuteTrackItem,
  SkipTrackItem
} from '../types/track'

const mask: MaskTrackItem = {
  id: 'mask-1',
  type: 'mask',
  start: 10,
  end: 20,
  enabled: true,
  rect: { xPercent: 0, yPercent: 0, widthPercent: 10, heightPercent: 10 },
  style: { mode: 'solid', color: '#000', opacity: 1 }
}
const mute: MuteTrackItem = { id: 'mute-1', type: 'mute', start: 30, end: 40, enabled: true }
const skip: SkipTrackItem = { id: 'skip-1', type: 'skip', start: 50, end: 60, enabled: true }
const bookmark: BookmarkTrackItem = {
  id: 'bookmark-1',
  type: 'bookmark',
  start: 35,
  end: 35,
  enabled: true,
  label: 'Full label',
  notes: 'Full note'
}

describe('inspector navigation browser', () => {
  it.each([
    { statusFilter: 'all', typeFilter: null, supportedTypes: ['mask', 'mute', 'skip', 'bookmark'], expected: 'all' },
    { statusFilter: 'all', typeFilter: 'mask', supportedTypes: ['mask', 'mute', 'skip', 'bookmark'], expected: 'mask' },
    { statusFilter: 'all', typeFilter: 'mute', supportedTypes: ['mask', 'mute', 'skip', 'bookmark'], expected: 'mute' },
    { statusFilter: 'all', typeFilter: 'skip', supportedTypes: ['mask', 'mute', 'skip', 'bookmark'], expected: 'skip' },
    { statusFilter: 'all', typeFilter: 'bookmark', supportedTypes: ['mask', 'mute', 'skip', 'bookmark'], expected: 'bookmark' },
    { statusFilter: 'active', typeFilter: null, supportedTypes: ['mask', 'mute', 'skip', 'bookmark'], expected: 'active' },
    { statusFilter: 'active', typeFilter: null, supportedTypes: ['bookmark'], expected: 'bookmark' }
  ] as const)('resolves the $expected empty state', ({ statusFilter, typeFilter, supportedTypes, expected }) => {
    expect(resolveInspectorEmptyStateKind({
      statusFilter,
      typeFilter,
      supportedTypes: [...supportedTypes]
    })).toBe(expected)
  })

  it('shows all supported local video items and type filters', () => {
    const capabilities = resolvePlaybackCapabilities({ kind: 'local', path: 'v.mp4', mediaType: 'video' }, 'video')

    expect(supportedInspectorTypeFilters(capabilities)).toEqual(['mask', 'mute', 'skip', 'bookmark'])
    expect(buildInspectorNavigationItems({
      masks: [mask],
      mutes: [mute],
      skips: [skip],
      bookmarks: [bookmark],
      capabilities,
      currentTime: 35,
      statusFilter: 'all',
      typeFilter: null
    }).map((row) => row.type)).toEqual(['mask', 'mute', 'bookmark', 'skip'])
    expect(buildInspectorNavigationItems({
      masks: [mask],
      mutes: [mute],
      skips: [skip],
      bookmarks: [bookmark],
      capabilities,
      currentTime: 35,
      statusFilter: 'all',
      typeFilter: 'mute'
    }).map((row) => row.item.id)).toEqual(['mute-1'])
  })

  it('uses current playback time for Active without classifying bookmarks as ranges', () => {
    const capabilities = resolvePlaybackCapabilities({ kind: 'local', path: 'v.mp4', mediaType: 'video' }, 'video')

    const active = buildInspectorNavigationItems({
      masks: [mask],
      mutes: [mute],
      skips: [skip],
      bookmarks: [bookmark],
      capabilities,
      currentTime: 35,
      statusFilter: 'active',
      typeFilter: null
    })

    expect(active.map((row) => row.item.id)).toEqual(['mute-1'])

    expect(buildInspectorNavigationItems({
      masks: [mask],
      mutes: [mute],
      skips: [skip],
      bookmarks: [bookmark],
      capabilities,
      currentTime: 35,
      statusFilter: 'active',
      typeFilter: 'bookmark'
    })).toEqual([])
  })

  it('shows YouTube Mute, Skip, and Bookmark navigation without Mask', () => {
    const capabilities = resolvePlaybackCapabilities({
      kind: 'youtube',
      provider: 'youtube',
      videoId: 'abc123def45',
      canonicalUrl: 'https://www.youtube.com/watch?v=abc123def45'
    }, 'video')

    expect(supportedInspectorTypeFilters(capabilities)).toEqual(['mute', 'skip', 'bookmark'])
    expect(resolveInspectorEmptyStateAction('bookmark', capabilities)).toBe('bookmark')
    expect(buildInspectorNavigationItems({
      masks: [mask],
      mutes: [mute],
      skips: [skip],
      bookmarks: [bookmark],
      capabilities,
      currentTime: 35,
      statusFilter: 'all',
      typeFilter: null
    }).map((row) => row.type)).toEqual(['mute', 'bookmark', 'skip'])
  })

  it('keeps local audio capability gated', () => {
    const capabilities = resolvePlaybackCapabilities({ kind: 'local', path: 'a.mp3', mediaType: 'audio' }, 'audio')

    expect(supportedInspectorTypeFilters(capabilities)).toEqual(['mute', 'skip', 'bookmark'])
    expect(resolveInspectorEmptyStateAction('all', capabilities)).toBe('overview')
    expect(resolveInspectorEmptyStateAction('mask', capabilities)).toBeNull()
    expect(resolveInspectorEmptyStateAction('mute', capabilities)).toBe('mute')
    expect(resolveInspectorEmptyStateAction('skip', capabilities)).toBe('skip')
    expect(buildInspectorNavigationItems({
      masks: [mask],
      mutes: [mute],
      skips: [skip],
      bookmarks: [bookmark],
      capabilities,
      currentTime: 55,
      statusFilter: 'all',
      typeFilter: null
    }).map((row) => row.type)).toEqual(['mute', 'bookmark', 'skip'])
  })

  it('selects exactly one capability-gated creation action for each empty state', () => {
    const capabilities = resolvePlaybackCapabilities(
      { kind: 'local', path: 'v.mp4', mediaType: 'video' },
      'video'
    )
    expect(resolveInspectorEmptyStateAction('all', capabilities)).toBe('overview')
    expect(resolveInspectorEmptyStateAction('mask', capabilities)).toBe('mask')
    expect(resolveInspectorEmptyStateAction('mute', capabilities)).toBe('mute')
    expect(resolveInspectorEmptyStateAction('skip', capabilities)).toBe('skip')
    expect(resolveInspectorEmptyStateAction('bookmark', capabilities)).toBe('bookmark')
    expect(resolveInspectorEmptyStateAction('active', capabilities)).toBeNull()
  })
})
