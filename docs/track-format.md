# VEIL Track Format

VEIL stores playback-layer edits (masks, mutes, skips, metadata) in a separate **`.veil`** file (legacy **`.veil.json`** and **`.json`** also load). The original video file is never modified.

## File identity

| Field | Required | Description |
|-------|----------|-------------|
| `app` | yes | Must be `"VEIL"`. |
| `version` | yes | Track schema version (see below). |
| `appVersion` | no | Free-form string identifying the exporting app, e.g. `"0.8.0"` or `"VEIL Mobile 0.1.0"`. |
| `exportedAt` | no | ISO-8601 timestamp. |

## Schema versions

| Version | Status | Notes |
|---------|--------|-------|
| `1.0.0` | Legacy | Original format; still loadable. |
| `1.1.0` | Supported | Incremental additions. |
| `1.2.0` | Supported | Groups and anchors. |
| `1.3.0` | Supported | Fade fields on masks. |
| `1.4.0` | Supported | Subtitle cover settings, item metadata, mobile-compatible fields. |
| `1.5.0` | Supported | Bookmark point markers (`type: "bookmark"`). |
| `1.6.0` | **Current** | YouTube-bound `media` identity + `trackMetadata.summary`. |

Desktop and mobile exporters should use **`1.6.0`** for new tracks (local or YouTube). Older consumers that only understand through `1.5.0` should ignore unknown YouTube media fields carefully — coordinate before shipping cross-app YouTube VEILs.

## Top-level structure

```json
{
  "version": "1.6.0",
  "app": "VEIL",
  "appVersion": "0.8.0",
  "globalOffsetSeconds": 0,
  "video": { ... },
  "media": { "kind": "youtube", "provider": "youtube", "videoId": "…", "canonicalUrl": "…" },
  "items": [ ... ],
  "trackMetadata": { "summary": "…", ... },
  "groups": [ ... ],
  "anchors": [ ... ]
}
```

Local tracks continue to use `video { … }` as before. YouTube-bound tracks use `media` instead of `video`.
### `items`

Unified array of timed layers:

- **mask** — rectangular overlay (`rect`, `style`, optional `fadeInMs` / `fadeOutMs`)
- **mute** — audio muted for the interval
- **skip** — playback jumps past the interval
- **bookmark** — informational point marker (`start` == `end`); **never affects playback**

Times are in **seconds** from the start of the video, before applying `globalOffsetSeconds`.

#### Bookmark items

Bookmarks are **point markers** for review, learning notes, and navigation. They are stored in `items[]` like other layers but are **ignored by playback** (no mask, mute, skip, or seek).

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "bookmark",
  "enabled": true,
  "start": 84.25,
  "end": 84.25,
  "label": "Important vocabulary",
  "notes": "Review this sentence later."
}
```

| Rule | Behavior |
|------|----------|
| Point marker | `end` must equal `start` (importer normalizes if missing or different) |
| Optional fields | `label`, `notes` — safe defaults on import |
| No geometry | No `rect`, `style`, or `source` |
| Runtime | Excluded from mask/mute/skip reconciliation |

**Timeline display:** at extreme densities, bookmark markers may overlap on the timeline. This is expected in R11; clustering, search, and virtualization are planned for a future release.

Tracks without bookmark items (any version ≤ `1.4.0`) load unchanged.

### `video`

Describes the source media the track was authored against:

| Field | Description |
|-------|-------------|
| `binding` | `"metadata"` (default) or `"unbound"` for manual tracks without a real file. |
| `name` | Filename at export time. |
| `duration` | Duration in seconds. |
| `fileSize` | Byte size or `null`. |
| `resolution` | `{ width, height }` in pixels. |
| `fingerprint` | `{ method, value }` metadata fingerprint for mismatch detection. |

### `subtitleCover`

Optional playback preference bundled with the track:

| `mode` | Behavior |
|--------|----------|
| `show` | Subtitles visible normally. |
| `smartCover` | Subtitles hidden until peek/reveal. |
| `regionCover` | Fixed region overlay for burned-in subtitles. |

`regionRect` is optional; defaults apply when omitted.

### `trackMetadata`

Optional community-oriented metadata for local organization and **future sharing** (no online repository in current releases). All fields are optional; older tracks without this block load normally with no warnings.

```json
{
  "trackMetadata": {
    "title": "Family Safe",
    "description": "Masks subtitles and skips explicit scenes.",
    "author": "Username",
    "tags": ["family", "safe", "movie"],
    "language": "en",
    "notes": "Personal edit for home viewing.",
    "createdAt": "2026-05-19T10:00:00.000Z",
    "updatedAt": "2026-05-19T12:30:00.000Z"
  }
}
```

| Field | Limits (desktop) | Notes |
|-------|------------------|-------|
| `title` | 120 chars | Shown in Track chip when set |
| `description` | 2000 chars | Short summary for future listings |
| `author` | 80 chars | Display name; not authenticated |
| `tags` | ≤20 tags, 32 chars each | Comma-separated in UI; deduped case-insensitively |
| `language` | 32 chars | Free-form label (e.g. `Japanese`) |
| `notes` | 4000 chars | Private editor notes |
| `summary` | (1.6.0+) | Whole-media untimestamped Summary — distinct from bookmark notes and `notes` |
| `createdAt` / `updatedAt` | ISO-8601 | Set automatically on save |

### `media` (YouTube, schema 1.6.0)

When `media.kind === "youtube"`, the track is bound to a YouTube video. Authoritative identity is `provider` + `videoId` (canonical URL is display/reference only). Desktop YouTube VEILs currently persist **bookmarks** (and metadata/summary); mask/mute/skip are not authored for YouTube in this phase.

| Field | Description |
|-------|-------------|
| `kind` | `"youtube"` |
| `provider` | `"youtube"` |
| `videoId` | 11-character YouTube id |
| `canonicalUrl` | `https://www.youtube.com/watch?v=…` |
| `duration` | Optional seconds snapshot at save |
| `title` | Optional display title |

#### Reserved fields (future community features)

These may appear in shared tracks from future services. Desktop **preserves** them on import/export but does **not** implement behavior yet:

| Field | Purpose (future) |
|-------|------------------|
| `rating` | Community rating |
| `downloads` | Download counter |
| `signature` | Authenticity / publisher signature |

Unknown keys under `trackMetadata` are preserved via schema passthrough for forward compatibility.

## Compatibility rules

### Schema validity vs media mismatch

These are **separate concerns**:

| Situation | Desktop behavior |
|-----------|------------------|
| Invalid JSON or schema | **Block** import; show error. |
| Valid schema, different video | **Warn** (critical / minor / info tiers); user may confirm and load. |

A valid track from another device, filename, duration, or resolution **must be importable** after user confirmation.

### On confirmed load (mismatch allowed)

- Masks, mutes, and skips are applied **as-is** (timings unchanged).
- `globalOffsetSeconds` is preserved (optional anchor-based offset suggestion in UI).
- `trackMetadata`, `groups`, and `anchors` import when the user opts in.
- `subtitleCover` imports when present and valid.
- Track is marked **clean** after successful load.
- Items beyond the current video duration may not play; they are **not silently clamped**.

### Mobile ↔ desktop

- `appVersion` is an opaque string; non-semver values like `"VEIL Mobile 0.1.0"` are valid.
- Mobile-exported `1.4.0` tracks with `smartCover` and standard item shapes load on desktop.
- Desktop tracks load on mobile when schema version is supported there.

### Unbound tracks

Tracks with `video.binding: "unbound"` and `fingerprint.method: "manual-unbound"` have no real source file. Timings apply to whatever video is currently open.

## Fingerprint & mismatch tiers

When loading against an open video, VEIL compares track `video` metadata to the current file:

| Tier | Examples | Blocks load? |
|------|----------|--------------|
| **Critical** | Large duration delta | No — warns strongly |
| **Minor** | Filename, file size, fingerprint | No |
| **Info** | Resolution, binding notes | No |

## Saving

Desktop embeds `appVersion` from the running app and `version: "1.6.0"` (YouTube media + summary when present; bookmarks included). Use **Save VEIL** to write a **`.veil`** file (legacy **`.veil.json`** / **`.json`** still load); the media file is untouched.

Tracks **without** bookmarks remain importable on clients that only support through `1.4.0`. **Bookmark** items require schema **`1.5.0+`**. **YouTube `media` + `summary`** require **`1.6.0`**.

## Sharing locally

VEIL files are **instructions**, not video files. A **`.veil`** file describes masks, mutes, skips, bookmarks, and metadata for a specific source video — it does not contain the media itself.

### What to share

1. The **`.veil` file** (via Save As, Export / Share, or file copy). Legacy **`.veil.json`** / **`.json`** names still work.
2. The **same or compatible video** on the recipient’s device.

Recipients import the track in VEIL Player. If video metadata does not match (different filename, duration, or device), VEIL **warns** but **does not block** import — masks, mutes, and skips are applied as-is.

### Export / Share dialog (desktop)

From the Track chip, Inspector, or File menu:

- Review title, description, author, tags, and action counts.
- **Save As .veil** — native save dialog (reuses existing save flow).
- **Copy JSON** — full track file to clipboard (no local file paths).
- **Copy summary** — short plain-text description for messages or notes.
- **Edit Track Info** — opens the metadata editor (M1 fields).

No cloud upload, accounts, or online repository — sharing is manual (email, USB, chat, etc.).

## Icon & branding (packaging)

Not part of the track file. See project `build/` and `src/assets/` for executable vs in-app logos.
