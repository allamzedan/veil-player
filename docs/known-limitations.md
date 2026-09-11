# Known limitations (0.8.0 source candidate)

- **Windows portable EXE only** — no macOS/Linux build in this release
- **No installer or auto-update** — portable executable only; signing deferred
- **No track autosave** — save `.veil` explicitly; unsaved changes prompt on close
- **Blur presentation** — experimental; GPU/driver dependent; Advanced section only
- **No telemetry** — also means no cloud crash reporting; uncaught main-process errors append to `%AppData%/VEIL/veil-crash.log` locally only
- **Recent videos list** — session convenience only; does not auto-open files without confirmation
- **Very large tracks** (1000+ masks) may stress the timeline UI — prefer Smart Cover over per-cue masks
- **Dense bookmark lists** — at extreme densities, bookmark markers may overlap on the timeline. This is **expected behavior** in R11 (not a defect).

## Bookmark timeline roadmap (not in R11)

Planned future improvements for very large bookmark sets:

- **Clustering** — group nearby markers when zoomed out
- **Search** — find bookmarks by label, notes, or time
- **Virtualization** — render only visible markers in dense lanes

These are documentation-only; R11 does not implement clustering, search, or virtualization.

## Roadmap Notes

Future media support audit:
- mp4, avi, mkv, ts, mov, webm, mpeg, mpg, 3gp, vob, ogv
- audio: mp3, wav, m4a, aac, flac, ogg
- audio-only VEIL mode
- volume boost up to 170%
- low-volume detection
- headphone safety warning
- playlists

These items are notes only and are not part of the 0.8.x interaction polish sprint.

## Track schema

- **Current export:** `1.6.0` (YouTube media identity + metadata.summary; bookmarks retained from 1.5.0)
- **Import:** `1.0.0` through `1.6.0`
- **Bookmarks:** exported at `1.5.0+`; older clients do not support bookmark items
- **YouTube:** desktop embeds via the official IFrame Player API only. Mute and Skip ranges are user-authored playback instructions implemented with official playback commands; VEIL does not detect or target advertisements and does not place mask overlays on the iframe.
- **YouTube duration drift:** if the live duration materially differs from the saved snapshot, VEIL warns; timestamps are not rewritten
- **Mobile coordination:** before shipping YouTube VEILs across desktop/mobile, confirm both sides accept `1.6.0` `media` + `summary` and the existing Mute/Skip item structures.

## YouTube playback limits

- Playback depends on YouTube embed permission (uploader may disable embedding; Error 101/150)
- Packaged Electron uses a loopback HTTP origin so postMessage/`origin` match the IFrame API
- Provider-enabled binary publication remains subject to a separate provider-compliance review, including request identity and applicable YouTube API/service requirements.
- Source availability does not imply YouTube or Google endorsement, and this source candidate does not claim provider-distribution approval.
- Controls outside the iframe (VEIL chrome) drive play/pause/seek/volume/rate when wired; YouTube chrome inside the iframe remains present
- “Open on YouTube” opens the canonical watch URL externally
- No other providers in this phase

## YouTube persistent VEIL integration — documented test gaps

At merge time there was **no known reproducible product defect**. Remaining items are packaged-test gaps, not confirmed bugs:

- Packaged fail-then-success same-ID Retry was not directly reproduced (covered by deterministic generation/requestId tests)
- Full exact-final-SHA Save As cancellation matrix was not repeated
- Full exact-final-SHA MP4/MP3/SRT/local 1.5 regression matrix was not repeated
- Final raw Host/CSP matrix was not repeated; deterministic Host/CSP/navigation tests pass

Next phase: normal product use and targeted fixes only when a reproducible issue appears.
