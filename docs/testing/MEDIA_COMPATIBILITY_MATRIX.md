# VEIL Player — Media Compatibility Matrix

**Audit date:** 2026-07-02  
**Playback stack:** Electron 36 (Chromium ~136) renderer `<video>` element + `veil-media://` byte-range protocol  
**Scope:** Extension allowlist, MIME serving, Chromium decode expectations, VEIL feature compatibility  
**Not verified in CI:** Real codec playback (no binary fixtures in repo)

---

## Executive summary

VEIL does **not** implement its own demuxer/decoder. A file is playable only if:

1. Its extension is on the VEIL allowlist (main process + renderer), and  
2. Chromium can decode the container/codec inside that file.

The allowlist is **consistent** across `src/lib/mediaKind.ts`, `electron/ipc/approvedMedia.ts`, `electron/ipc/dialogs.ts`, and `electron/lib/mediaRangeResponse.ts` (see [Allowlist audit](#allowlist-audit)).

**Official support recommendation** (product baseline):

| Tier | Extensions |
|------|------------|
| **Officially safe** | `mp4`, `m4v`, `webm`, `mp3`, `wav`, `m4a`, `aac`, `ogg` |
| **Conditionally supported** | `mov`, `flac`, `ogv` |
| **Experimental** | `mkv`, `avi` |
| **Not supported** | `ts`, `mpeg`, `mpg`, `3gp`, `vob`, `wmv`, `flv` (and anything not on allowlist) |

---

## Allowlist audit

| Source | Video extensions | Audio extensions | Notes |
|--------|------------------|------------------|-------|
| `src/lib/mediaKind.ts` | mp4, webm, mkv, mov, avi, m4v, ogv | mp3, wav, m4a, aac, flac, ogg | Single source of truth for renderer |
| `electron/ipc/approvedMedia.ts` | Re-exports `VIDEO_EXTENSIONS` | Re-exports `AUDIO_EXTENSIONS` | **Match** |
| `electron/ipc/dialogs.ts` | Same via `MEDIA_FILTERS` | Same | **Match** |
| `electron/lib/mediaRangeResponse.ts` | MIME map for all 7 video ext | MIME map for all 6 audio ext | **Match** (13 entries) |

**Mismatch found:** None.

**MIME map** (`mediaRangeResponse.ts`):

| Extension | Content-Type |
|-----------|--------------|
| mp4 | video/mp4 |
| m4v | video/x-m4v |
| mov | video/quicktime |
| webm | video/webm |
| ogv | video/ogg |
| mkv | video/x-matroska |
| avi | video/x-msvideo |
| mp3 | audio/mpeg |
| wav | audio/wav |
| m4a | audio/mp4 |
| aac | audio/aac |
| flac | audio/flac |
| ogg | audio/ogg |

---

## Reliability classification

| Extension | Tier | Rationale |
|-----------|------|-----------|
| mp4 | Officially safe | H.264/AAC in MP4 is Chromium’s primary video path |
| m4v | Officially safe | Same as MP4 container family |
| webm | Officially safe | VP8/VP9 + Opus/Vorbis natively supported |
| mp3 | Officially safe | Native audio decode |
| wav | Officially safe | PCM in WAV widely supported |
| m4a | Officially safe | AAC in MP4 container |
| aac | Officially safe | Raw AAC / ADTS often works; codec profile may vary |
| ogg | Officially safe | Vorbis/Opus in Ogg |
| mov | Conditionally supported | Works when codecs are Chromium-friendly (often H.264); ProRes/DNxHD/etc. may fail |
| flac | Conditionally supported | Supported in Chromium but less exercised in VEIL QA |
| ogv | Conditionally supported | Theora/Vorbis supported but uncommon |
| mkv | Experimental | Container may open; codec mix highly variable (H.264 often OK, others not) |
| avi | Experimental | Legacy container; codec-dependent (Xvid/DivX often problematic) |
| ts, mpeg, mpg, 3gp, vob, wmv, flv | Not supported | Not on allowlist; do not document as supported |

---

## Compatibility matrix — Video

Legend for feature columns:

- **Pass** — Expected to work when file decodes in Chromium  
- **Codec-dep** — Depends on internal codec, not extension alone  
- **Untested** — No committed fixture; manual QA required  
- **N/A** — Masks disabled in product for video with masks = normal VEIL behavior  

| Extension | Container | Typical codec | Chromium support | Open | Duration | Seek | Play/Pause | Volume | Speed | Mute VEIL | Skip VEIL | Bookmark | Save/Reload VEIL | Status | Notes |
|-----------|-----------|---------------|------------------|------|----------|------|------------|--------|-------|-----------|-----------|----------|------------------|--------|-------|
| mp4 | MPEG-4 | H.264 + AAC | Strong | Allowlist | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | **Officially safe** | Primary QA target |
| m4v | MPEG-4 | H.264 + AAC | Strong | Allowlist | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | **Officially safe** | Same family as mp4 |
| mov | QuickTime | H.264 + AAC | Good (codec-dep) | Allowlist | Codec-dep | Codec-dep | Codec-dep | Pass | Pass | Pass | Pass | Pass | Pass | **Conditionally supported** | ProRes/HEVC in .mov may fail |
| webm | WebM | VP9 + Opus | Strong | Allowlist | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | **Officially safe** | VP8 also common |
| ogv | Ogg | Theora + Vorbis | Moderate | Allowlist | Untested | Untested | Untested | Pass | Pass | Pass | Pass | Pass | Pass | **Conditionally supported** | Rare in wild |
| mkv | Matroska | H.264 + AAC (varies) | Weak–moderate | Allowlist | Codec-dep | Codec-dep | Codec-dep | Pass | Pass | Pass | Pass | Pass | Pass | **Experimental** | HEVC/AC3/DTS often fail |
| avi | AVI | Xvid + MP3 (varies) | Weak | Allowlist | Codec-dep | Codec-dep | Codec-dep | Pass | Pass | Pass | Pass | Pass | Pass | **Experimental** | Legacy; many files won’t decode |

---

## Compatibility matrix — Audio

| Extension | Container | Typical codec | Chromium support | Open | Duration | Seek | Play/Pause | Volume | Speed | Mute VEIL | Skip VEIL | Bookmark | Save/Reload VEIL | Status | Notes |
|-----------|-----------|---------------|------------------|------|----------|------|------------|--------|-------|-----------|-----------|----------|------------------|--------|-------|
| mp3 | MPEG audio | MPEG-1 Layer III | Strong | Allowlist | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | **Officially safe** | Compact audio UI default |
| wav | WAV | PCM | Strong | Allowlist | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | **Officially safe** | Large files OK via range |
| m4a | MPEG-4 | AAC | Strong | Allowlist | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | **Officially safe** | |
| aac | ADTS/raw | AAC | Good | Allowlist | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | **Officially safe** | Extension may be .aac or .m4a |
| flac | FLAC | FLAC | Good | Allowlist | Untested | Untested | Untested | Pass | Pass | Pass | Pass | Pass | Pass | **Conditionally supported** | Chromium supports; less VEIL QA |
| ogg | Ogg | Vorbis / Opus | Strong | Allowlist | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | **Officially safe** | Opus common for web |

Audio VEIL saves use `resolution: 0×0`; fingerprint/matching still work.

---

## Formats explicitly not supported

These are **rejected at open** (not on allowlist). Do not claim support unless manually verified and product decision made.

| Extension | Typical container | Why not supported |
|-----------|-------------------|-------------------|
| ts | MPEG-TS | Not on allowlist; HLS/live-oriented |
| mpeg, mpg | MPEG-PS | Not on allowlist |
| 3gp | 3GPP | Not on allowlist |
| vob | DVD MPEG-PS | Not on allowlist |
| wmv | ASF | Not on allowlist; WMV/VC-1 |
| flv | Flash Video | Not on allowlist; deprecated |

---

## Diagnostics & error handling

| Scenario | Current behavior | Status |
|----------|------------------|--------|
| Unsupported extension (dialog/drop/browser) | Toast: “Selected file is not a supported media format.” | **OK** |
| Unsupported path in main process | `registerApprovedMediaPath` throws; open canceled | **OK** |
| Allowed extension, Chromium decode failure | Toast: “This media could not be played. The file may use an unsupported codec.” (once per `src`) | **Fixed R12.3** |
| Decode failure crash | No crash observed in code path; error is element-level | **OK** |
| Silent black screen | Possible if metadata loads but frames don’t render; rare | **Residual risk** |

Error details are also captured in seek debug (`errorCode`, `errorMessage`) when debug overlays enabled.

---

## Fixture strategy

**No binary media fixtures exist in the repository.** `electron/lib/mediaRangeResponse.test.ts` uses tiny dummy byte files only to verify HTTP range + MIME headers.

### Required manual fixtures

Store under a local-only folder (e.g. `test-fixtures/media/`, **gitignored**) — do not commit copyrighted media.

#### Video

| File | Container | Codec | Purpose |
|------|-----------|-------|---------|
| `h264-aac.mp4` | MP4 | H.264 + AAC | Baseline safe |
| `h264-aac.m4v` | MPEG-4 | H.264 + AAC | m4v path |
| `h264-aac.mov` | QuickTime | H.264 + AAC | mov conditional |
| `vp9-opus.webm` | WebM | VP9 + Opus | webm safe |
| `theora-vorbis.ogv` | Ogg | Theora + Vorbis | ogv conditional |
| `h264-aac.mkv` | Matroska | H.264 + AAC | mkv experimental |
| `xvid-mp3.avi` | AVI | MPEG-4 Part 2 + MP3 | avi experimental |

#### Audio

| File | Format | Purpose |
|------|--------|---------|
| `sample.mp3` | MP3 | Baseline |
| `sample.wav` | WAV PCM | Uncompressed |
| `sample.m4a` | AAC in MP4 | m4a |
| `sample.aac` | AAC | Raw/ADTS |
| `sample.flac` | FLAC | Conditional |
| `sample.ogg` | Vorbis or Opus | ogg |

### Manual test script (per fixture)

1. **Open** — File → Open Media or drag onto workspace  
2. **Duration** — Wait for metadata; confirm duration > 0 and seek bar range  
3. **Seek** — Scrub to ~50%; confirm timecode updates and playback position  
4. **Play/Pause** — Toggle; confirm audio/video output  
5. **Volume** — Change volume; confirm level  
6. **Speed** — 0.5× and 1.5×; confirm rate changes  
7. **Mute VEIL** — Add mute interval at playhead; confirm silence in range  
8. **Skip VEIL** — Add skip interval; confirm jump on playback  
9. **Bookmark** — Add bookmark; confirm marker/timeline entry  
10. **Save VEIL** — Save `.veil` beside media  
11. **Reload VEIL** — Close/reopen media + load `.veil`; confirm items restore  

Record Pass/Fail in a copy of this matrix for your QA run.

---

## Automated tests (code-level only)

| Test file | What it proves |
|-----------|----------------|
| `src/lib/mediaKind.test.ts` | Extension classification, MIME acceptance |
| `src/lib/mediaAllowlistConsistency.test.ts` | Renderer/main/MIME alignment; unsupported ext rejection |
| `electron/lib/mediaRangeResponse.test.ts` | MIME headers + byte ranges for all approved extensions |

Tests do **not** assert Chromium decode success.

---

## Risks

1. **Codec ≠ extension** — Allowlist is extension-only; MKV/AVI/MOV failures are user-visible decode errors.  
2. **No transcode fallback** — No mpv/libVLC; unsupported codecs stay unsupported.  
3. **HEVC / AC-3 / DTS** — Often inside MKV/MP4; may fail silently before R12.3 toast, now surfaced on `error` event.  
4. **Manual matrix mostly untested** — Classifications follow Chromium documentation + engineering judgment, not a full fixture lab run.  
5. **MIME vs decode** — Correct `Content-Type` does not guarantee decode.

---

## Next implementation recommendations

1. **Run manual fixture pass** — Fill Status column with real Pass/Fail; promote/demote tiers based on evidence.  
2. **Optional: tighten experimental tier** — Warn on first open of `.mkv`/`.avi` (toast, non-blocking).  
3. **Optional: document in-app** — Short “Supported formats” link in Help pointing to this doc.  
4. **Do not expand allowlist** until fixtures prove Chromium decode for `wmv`/`flv`/etc.  
5. **Keep single decoder path** — Avoid backend refactor unless product scope changes.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-07-02 | R12.3 initial audit matrix |
