import { z } from 'zod'
import { MIN_MASK_SIZE } from './geometry'
import { MIN_MASK_DURATION_SECONDS } from './maskTiming'
import { GROUP_COLOR_TOKENS, TRACK_VERSIONS, type VeilTrack } from '../types/track'
import { DEFAULT_MASK_STYLE } from './maskDefaults'
import { admitVeilJson, checkVeilObjectLimits, type VeilResourcePolicyOverride } from './jsonAdmission'

const percentRectSchema = z
  .object({
    xPercent: z.number().finite(),
    yPercent: z.number().finite(),
    widthPercent: z.number().finite(),
    heightPercent: z.number().finite()
  })
  .superRefine((rect, ctx) => {
    if (rect.widthPercent < MIN_MASK_SIZE.widthPercent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `widthPercent must be >= ${MIN_MASK_SIZE.widthPercent}`
      })
    }
    if (rect.heightPercent < MIN_MASK_SIZE.heightPercent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `heightPercent must be >= ${MIN_MASK_SIZE.heightPercent}`
      })
    }
    if (rect.xPercent < 0 || rect.yPercent < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'xPercent and yPercent must be >= 0' })
    }
    if (rect.xPercent + rect.widthPercent > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'xPercent + widthPercent must be <= 100'
      })
    }
    if (rect.yPercent + rect.heightPercent > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'yPercent + heightPercent must be <= 100'
      })
    }
  })

const maskPresentationSchema = z.enum([
  'solid',
  'dim',
  'softGlass',
  'softEdge',
  'lowContrast',
  'blur',
  'frosted'
])

const maskStyleSchema = z.object({
  mode: z.literal('solid'),
  color: z.string().min(1),
  opacity: z.number().finite().min(0).max(1),
  presentation: maskPresentationSchema.optional()
})

const fadeMsSchema = z.number().finite().min(0).max(5000).optional()

const itemMetadataSchema = {
  label: z.string().optional(),
  notes: z.string().optional(),
  locked: z.boolean().optional()
}

const maskSourceSchema = z.object({
  kind: z.enum(['manual', 'srt'])
})

const maskItemSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('mask'),
    start: z.number().finite().min(0),
    end: z.number().finite(),
    enabled: z.boolean().optional(),
    ...itemMetadataSchema,
    source: maskSourceSchema.optional(),
    rect: percentRectSchema,
    style: maskStyleSchema.optional().default({ mode: 'solid', ...DEFAULT_MASK_STYLE }),
    fadeInMs: fadeMsSchema,
    fadeOutMs: fadeMsSchema
  })
  .superRefine((item, ctx) => {
    if (item.end <= item.start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'end must be greater than start' })
    } else if (item.end - item.start < MIN_MASK_DURATION_SECONDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duration must be at least ${MIN_MASK_DURATION_SECONDS}s`
      })
    }
  })

const timedIntervalRefine = (
  item: { start: number; end: number },
  ctx: z.RefinementCtx
): void => {
  if (item.end <= item.start) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'end must be greater than start' })
  } else if (item.end - item.start < MIN_MASK_DURATION_SECONDS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `duration must be at least ${MIN_MASK_DURATION_SECONDS}s`
    })
  }
}

const muteItemSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('mute'),
    start: z.number().finite().min(0),
    end: z.number().finite(),
    enabled: z.boolean().optional(),
    ...itemMetadataSchema
  })
  .superRefine(timedIntervalRefine)

const skipItemSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('skip'),
    start: z.number().finite().min(0),
    end: z.number().finite(),
    enabled: z.boolean().optional(),
    ...itemMetadataSchema
  })
  .superRefine(timedIntervalRefine)

const bookmarkItemSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.literal('bookmark'),
  start: z.number().finite().min(0),
  end: z.number().finite().min(0).optional(),
  enabled: z.boolean().optional(),
  ...itemMetadataSchema
})

const fingerprintSchema = z.object({
  method: z.enum(['partial-sha256', 'metadata-only', 'metadata-v1', 'manual-unbound']),
  value: z.string().min(1)
})

const videoSchema = z
  .object({
    binding: z.enum(['metadata', 'unbound']).optional(),
    name: z.string(),
    duration: z.number().finite().min(0),
    fileSize: z.number().finite().nullable(),
    resolution: z.object({
      width: z.number().finite().min(0),
      height: z.number().finite().min(0)
    }),
    fingerprint: fingerprintSchema
  })
  .superRefine((video, ctx) => {
    const binding =
      video.binding ??
      (video.fingerprint.method === 'manual-unbound' ? 'unbound' : 'metadata')

    if (binding === 'metadata' && video.name.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'video.name is required for metadata-bound tracks',
        path: ['name']
      })
    }
  })

const trackMetadataSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    language: z.string().optional(),
    notes: z.string().optional(),
    summary: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    rating: z.union([z.number(), z.string()]).optional(),
    downloads: z.number().finite().nonnegative().optional(),
    signature: z.string().optional()
  })
  .passthrough()

const youtubeMediaSchema = z.object({
  kind: z.literal('youtube'),
  provider: z.literal('youtube'),
  videoId: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9_-]{11}$/, 'media.videoId must be an 11-character YouTube id'),
  canonicalUrl: z.string().url(),
  duration: z.number().finite().min(0).optional(),
  title: z.string().optional()
})

const trackAnchorSchema = z.object({
  id: z.string().min(1),
  time: z.number().finite().min(0),
  label: z.string().optional(),
  kind: z.enum(['manual', 'cue', 'bookmark']).optional()
})

const trackGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  itemIds: z.array(z.string().min(1)),
  colorToken: z.enum(GROUP_COLOR_TOKENS).optional()
})

const subtitleCoverSchema = z.object({
  mode: z.enum(['show', 'smartCover', 'regionCover']),
  regionRect: percentRectSchema.optional()
})

const KNOWN_ITEM_TYPES = new Set(['mask', 'mute', 'skip', 'bookmark'])
const unknownItemSchema = z.object({ type: z.string().min(1) }).passthrough().superRefine((item, ctx) => {
  if (KNOWN_ITEM_TYPES.has(item.type)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Malformed known item' })
})

export const veilTrackSchema = z
  .object({
    version: z.enum(TRACK_VERSIONS),
    app: z.literal('VEIL'),
    appVersion: z.string().optional(),
    exportedAt: z.string().optional(),
    subtitleCover: subtitleCoverSchema.optional(),
    video: videoSchema.optional(),
    media: youtubeMediaSchema.optional(),
    globalOffsetSeconds: z.number().finite(),
    trackMetadata: trackMetadataSchema.optional(),
    groups: z.array(trackGroupSchema).optional(),
    anchors: z.array(trackAnchorSchema).optional(),
    items: z.array(z.union([maskItemSchema, muteItemSchema, skipItemSchema, bookmarkItemSchema, unknownItemSchema]))
  })
  .passthrough()
  .superRefine((track, ctx) => {
    const isYouTube = track.media?.kind === 'youtube'
    if (isYouTube) {
      if (!track.media?.videoId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'media.videoId is required for YouTube tracks',
          path: ['media', 'videoId']
        })
      }
      // Mute/skip/mask are not executable on YouTube in this phase — parse but mark via capability
      // rules at runtime. Visual mask/cover data must not silently apply.
      return
    }

    if (!track.video) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'video is required for local tracks',
        path: ['video']
      })
    }
  })

export type VeilTrackParsed = z.infer<typeof veilTrackSchema>

export interface PreservedUnknownTrackItem {
  index: number
  value: Record<string, unknown>
}
export type ParsedVeilTrack = VeilTrack & {
  preservedUnknownItems?: PreservedUnknownTrackItem[]
  preservedUnknownRootFields?: Record<string, unknown>
}

export type ParseVeilTrackResult =
  | { ok: true; track: ParsedVeilTrack; status: 'ACCEPT' | 'ACCEPT_PARTIAL' }
  | { ok: false; message: string; status?: 'REJECT_DOCUMENT' | 'LIMIT_EXCEEDED' }

function formatZodError(error: z.ZodError): string {
  const first = error.issues[0]
  if (!first) {
    return 'Invalid track file'
  }
  const path = first.path.length > 0 ? `${first.path.join('.')}: ` : ''
  return `${path}${first.message}`
}

const ROOT_FIELDS = new Set(['version','app','appVersion','exportedAt','subtitleCover','video','media','globalOffsetSeconds','trackMetadata','groups','anchors','items'])

export function parseVeilTrack(data: unknown, resourcePolicy?: VeilResourcePolicyOverride): ParseVeilTrackResult {
  const limitFailure = checkVeilObjectLimits(data, resourcePolicy)
  if (limitFailure) return { ok: false, message: limitFailure, status: 'LIMIT_EXCEEDED' }
  const result = veilTrackSchema.safeParse(data)
  if (!result.success) return { ok: false, message: formatZodError(result.error), status: 'REJECT_DOCUMENT' }
  const raw = result.data as Record<string, unknown> & { items: Array<Record<string, unknown>> }
  const preservedUnknownItems: PreservedUnknownTrackItem[] = []
  const knownItems = raw.items.filter((item, index) => {
    const known = KNOWN_ITEM_TYPES.has(item.type as string)
    if (!known) preservedUnknownItems.push({ index, value: structuredClone(item) })
    return known
  })
  const preservedUnknownRootFields = Object.fromEntries(Object.entries(raw).filter(([key]) => !ROOT_FIELDS.has(key)))
  const track = { ...raw, items: knownItems } as unknown as ParsedVeilTrack
  Object.defineProperties(track, {
    preservedUnknownItems: { value: preservedUnknownItems, enumerable: false },
    preservedUnknownRootFields: { value: preservedUnknownRootFields, enumerable: false }
  })
  return { ok: true, track, status: preservedUnknownItems.length ? 'ACCEPT_PARTIAL' : 'ACCEPT' }
}

function formatUnknownVersionMessage(version: unknown): string {
  const shown =
    version === undefined
      ? 'missing'
      : typeof version === 'string' || typeof version === 'number'
        ? String(version)
        : 'invalid'
  return `Unsupported track version (${shown}). Expected version ${TRACK_VERSIONS.join(' or ')}.`
}

export function parseVeilTrackJson(jsonText: string, resourcePolicy?: VeilResourcePolicyOverride): ParseVeilTrackResult {
  const admitted = admitVeilJson(jsonText, resourcePolicy)
  if (!admitted.ok) return { ok: false, message: admitted.message, status: admitted.kind === 'limit' ? 'LIMIT_EXCEEDED' : 'REJECT_DOCUMENT' }
  const parsed = admitted.value

  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
    const version = (parsed as { version: unknown }).version
    if (!TRACK_VERSIONS.includes(version as (typeof TRACK_VERSIONS)[number])) {
      return { ok: false, message: formatUnknownVersionMessage(version) }
    }
  }

  return parseVeilTrack(parsed, resourcePolicy)
}
