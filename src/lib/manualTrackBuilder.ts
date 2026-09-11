import { createMaskId } from './id'
import { MIN_MASK_DURATION_SECONDS } from './maskTiming'
import { createMuteItem, createSkipItem } from './trackItems'
import { isValidMaskTiming, parseSecondsInput } from './time'
import type { MaskTrackItem, MuteTrackItem, SkipTrackItem } from '../types/track'

export const MANUAL_BUILDER_MASK_RECT = {
  xPercent: 35,
  yPercent: 44,
  widthPercent: 30,
  heightPercent: 12
} as const

export type ManualTrackItemType = 'mask' | 'mute' | 'skip'

export interface ManualTrackBuilderRow {
  id: string
  start: string
  end: string
  type: ManualTrackItemType | ''
  label: string
}

export interface ManualTrackBuilderRowErrors {
  start?: string
  end?: string
  type?: string
  label?: string
}

export interface ManualTrackBuilderBatch {
  masks: MaskTrackItem[]
  mutes: MuteTrackItem[]
  skips: SkipTrackItem[]
  firstMaskId: string | null
}

export type ParseManualTrackRowsResult =
  | { ok: true; batch: ManualTrackBuilderBatch }
  | { ok: false; rowErrors: Record<string, ManualTrackBuilderRowErrors> }

function isRowEmpty(row: ManualTrackBuilderRow): boolean {
  return (
    row.start.trim().length === 0 &&
    row.end.trim().length === 0 &&
    row.type === '' &&
    row.label.trim().length === 0
  )
}

function createManualBuilderMask(
  start: number,
  end: number,
  label?: string
): MaskTrackItem {
  const normalizedLabel = label?.trim()

  return {
    id: createMaskId(),
    type: 'mask',
    enabled: true,
    start,
    end,
    rect: { ...MANUAL_BUILDER_MASK_RECT },
    style: {
      mode: 'solid',
      color: '#000000',
      opacity: 1
    },
    source: { kind: 'manual' },
    ...(normalizedLabel ? { label: normalizedLabel } : {})
  }
}

function applyLabel<T extends { label?: string }>(
  item: T,
  label?: string
): T {
  const normalizedLabel = label?.trim()
  if (!normalizedLabel) {
    return item
  }

  return { ...item, label: normalizedLabel }
}

export const MANUAL_TRACK_BUILDER_TIME_PLACEHOLDER = '00:00:00'

export const MANUAL_TRACK_BUILDER_TIME_STEP_SECONDS = 0.1

export function formatManualTrackBuilderTimestamp(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds * 1000) / 1000)
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const wholeSeconds = Math.floor(safe % 60)
  const fraction = safe - Math.floor(safe)
  const fractionalText = fraction > 0
    ? fraction.toFixed(3).slice(1).replace(/0+$/, '')
    : ''
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}${fractionalText}`
}

export function incrementManualTrackBuilderTimestamp(value: string, delta: number): string {
  const current = parseSecondsInput(value) ?? 0
  return formatManualTrackBuilderTimestamp(current + delta)
}

export function normalizeManualTrackBuilderTimestamp(value: string): string | null {
  const parsed = parseSecondsInput(value)
  return parsed === null ? null : formatManualTrackBuilderTimestamp(parsed)
}

export function normalizeManualTrackBuilderRowTimes(
  row: ManualTrackBuilderRow
): ManualTrackBuilderRow {
  const start = row.start.trim()
  const end = row.end.trim()

  return {
    ...row,
    start: start ? (normalizeManualTrackBuilderTimestamp(start) ?? start) : row.start,
    end: end ? (normalizeManualTrackBuilderTimestamp(end) ?? end) : row.end
  }
}

export function normalizeManualTrackBuilderRows(
  rows: ManualTrackBuilderRow[]
): ManualTrackBuilderRow[] {
  return rows.map(normalizeManualTrackBuilderRowTimes)
}

export function createEmptyManualTrackBuilderRow(): ManualTrackBuilderRow {
  return {
    id: createMaskId(),
    start: '',
    end: '',
    type: 'mask',
    label: ''
  }
}

export interface ParseManualTrackRowsOptions {
  videoDuration?: number | null
  /** When false, end time is not compared to video duration. */
  validateVideoDuration?: boolean
}

export function parseManualTrackRows(
  rows: ManualTrackBuilderRow[],
  options: ParseManualTrackRowsOptions = {}
): ParseManualTrackRowsResult {
  const { videoDuration, validateVideoDuration = true } = options
  const rowErrors: Record<string, ManualTrackBuilderRowErrors> = {}
  const masks: MaskTrackItem[] = []
  const mutes: MuteTrackItem[] = []
  const skips: SkipTrackItem[] = []

  const hasDuration =
    validateVideoDuration &&
    videoDuration !== undefined &&
    videoDuration !== null &&
    Number.isFinite(videoDuration) &&
    videoDuration > 0

  let nonEmptyCount = 0

  for (const row of rows) {
    if (isRowEmpty(row)) {
      continue
    }

    nonEmptyCount += 1
    const errors: ManualTrackBuilderRowErrors = {}

    const start = parseSecondsInput(row.start)
    if (start === null) {
      errors.start = 'Enter a valid start time (seconds, m:ss, or h:mm:ss).'
    } else if (start < 0) {
      errors.start = 'Start must be 0 or greater.'
    }

    const end = parseSecondsInput(row.end)
    if (end === null) {
      errors.end = 'Enter a valid end time (seconds, m:ss, or h:mm:ss).'
    } else if (start !== null && end !== null) {
      if (!isValidMaskTiming(start, end)) {
        if (end <= start) {
          errors.end = 'End must be greater than start.'
        } else {
          errors.end = `Duration must be at least ${MIN_MASK_DURATION_SECONDS}s.`
        }
      } else if (hasDuration && end > videoDuration) {
        errors.end = 'End cannot exceed video duration.'
      }
    }

    if (row.type !== 'mask' && row.type !== 'mute' && row.type !== 'skip') {
      errors.type = 'Choose Mask, Mute, or Skip.'
    }

    if (Object.keys(errors).length > 0) {
      rowErrors[row.id] = errors
      continue
    }

    const safeStart = start as number
    const safeEnd = end as number
    const label = row.label.trim() || undefined

    if (row.type === 'mask') {
      masks.push(createManualBuilderMask(safeStart, safeEnd, label))
    } else if (row.type === 'mute') {
      mutes.push(applyLabel(createMuteItem(safeStart, safeEnd), label))
    } else {
      skips.push(applyLabel(createSkipItem(safeStart, safeEnd), label))
    }
  }

  if (nonEmptyCount === 0) {
    const firstRowId = rows[0]?.id
    if (firstRowId) {
      rowErrors[firstRowId] = {
        start: 'Add at least one row with start, end, and type.'
      }
    }
    return { ok: false, rowErrors }
  }

  if (Object.keys(rowErrors).length > 0) {
    return { ok: false, rowErrors }
  }

  return {
    ok: true,
    batch: {
      masks,
      mutes,
      skips,
      firstMaskId: masks[0]?.id ?? null
    }
  }
}
