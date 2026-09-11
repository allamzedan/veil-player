# Manual regression checklist (RC)

Run in **dev** (`npm run dev`) and **packaged** (`npm run smoke:packaged`) before release.

## Core

- [ ] Open video, play/pause, seek
- [ ] Import SRT, Smart Cover peek/reveal
- [ ] Save/load `.veil` / `.veil.json` (v1.3.0, v1.4.0, and v1.5.0 bookmark samples)
- [ ] Undo/redo stress (20+ operations)
- [ ] Malformed track JSON shows toast, no white screen

## Playback HUD & motion

- [ ] R / Shift / speed — no HUD flicker
- [ ] Reduce motion ON — instant transitions

## Fullscreen

- [ ] Enter/exit 20× — no stuck overlay
- [ ] Watch mode minimal chrome

## Packaging

- [ ] Portable EXE launches clean
- [ ] About shows current app version, track schema **1.5.0**
- [ ] Bookmark-only VEIL: Close VEIL enabled; chip shows loaded (not “No VEIL”)

## First-run & settings

- [ ] First-run overlay once, skippable, under ~45s read
- [ ] Settings dialog: motion, subtitles, status bar
