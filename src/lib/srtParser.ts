export interface SrtCue {
  index: number | null
  start: number
  end: number
  text: string
}

export interface ParseSrtResult {
  cues: SrtCue[]
  skippedCount: number
}

const TIMING_LINE_RE =
  /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/

function isIndexLine(line: string): boolean {
  return /^\d+$/.test(line.trim())
}

function isTimingLine(line: string): boolean {
  return TIMING_LINE_RE.test(line.trim())
}

function parseTimestampParts(h: string, m: string, s: string, ms: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
}

function parseTimingLine(line: string): { start: number; end: number } | null {
  const match = TIMING_LINE_RE.exec(line.trim())
  if (!match) {
    return null
  }

  const start = parseTimestampParts(match[1], match[2], match[3], match[4])
  const end = parseTimestampParts(match[5], match[6], match[7], match[8])

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    return null
  }

  return { start, end }
}

function parseBlock(blockText: string): SrtCue | null {
  const nonEmptyLines = blockText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (nonEmptyLines.length === 0) {
    return null
  }

  let index: number | null = null
  let timingLineIndex = 0

  if (isIndexLine(nonEmptyLines[0])) {
    index = Number.parseInt(nonEmptyLines[0], 10)
    timingLineIndex = 1
  }

  if (timingLineIndex >= nonEmptyLines.length) {
    return null
  }

  const timingLine = nonEmptyLines[timingLineIndex]
  if (!isTimingLine(timingLine)) {
    return null
  }

  const timing = parseTimingLine(timingLine)
  if (!timing) {
    return null
  }

  const text = nonEmptyLines.slice(timingLineIndex + 1).join('\n')

  return {
    index,
    start: timing.start,
    end: timing.end,
    text
  }
}

export function parseSrt(text: string): ParseSrtResult {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (normalized.length === 0) {
    return { cues: [], skippedCount: 0 }
  }

  const blocks = normalized.split(/\n\s*\n/)
  const cues: SrtCue[] = []
  let skippedCount = 0

  for (const block of blocks) {
    if (block.trim().length === 0) {
      continue
    }

    const cue = parseBlock(block)
    if (cue) {
      cues.push(cue)
    } else {
      skippedCount += 1
    }
  }

  return { cues, skippedCount }
}
