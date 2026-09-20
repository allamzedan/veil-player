# Changelog

## 0.8.0-RC3

- Provider-enabled showcase/testing distribution: the optional YouTube provider is enabled at packaging time with `VEIL_ENABLE_YOUTUBE_PROVIDER=true` for development, testing, interoperability demonstrations, and project showcase use. VEIL remains provider-independent; no YouTube or Google approval or endorsement is claimed.

## 0.8.0

- Privacy-first, non-destructive `.veil` sidecars with Mask, Mute, Skip, and Bookmark authoring.
- Timeline Multi-Select, Sidecar Compare / Import, and local Content Review workflows.
- Local video and audio playback, plus YouTube support through the official iframe/API path.
- Subtitle import, display, timing, appearance, Smart Cover, and Region Cover controls.
- The current Watch/Edit interface, sidebar editor, Manual VEIL Builder, and improved launcher.
- Dark is the default appearance; Light (Mist Lavender) and System themes are also available.
- Windows installer and portable builds with `.veil` file associations and document artwork.
- Save As, update checking, release notes, and community metadata for VEIL sidecars.

### Track format

- Schema **1.6.0**; saved sidecars stamp `appVersion: "0.8.0"` and never modify the original media.

## 0.7.0

- Complete UI localization (8 languages); English fallback for missing keys
- Mobile track import compatibility (metadata mismatch warns, does not block)
- Help → Check for Updates; silent startup update check (GitHub Releases)
- Track format contract documented (`docs/track-format.md`)
- Sidebar rail polish, timeline LTR enforcement in RTL UI
- i18n for import dialog, playback HUD, fullscreen overlay, layers, and controls

## 0.6.0 (release candidate)

- Stabilization and release-readiness pass
- Error boundary for unexpected UI failures
- Settings dialog (motion, subtitle appearance, status bar)
- Short first-run welcome overlay
- Expanded automated tests (track schema, SRT, mask fades, playback HUD)
- README and user documentation (`docs/`)
- Dead code removal (legacy workflow preset menu)
- Accessibility and UX consistency polish
- Portable Windows EXE packaging refinements

## 0.5.0

- Motion and presentation (Phase 14): mask cue fades, Smart Cover transitions, playback HUD, presentation presets
- Track schema 1.4.0 (`fadeInMs` / `fadeOutMs` on masks)

## 0.4.0

- Workflow and immersion (Phase 13): Smart Cover, region cover, viewing presets, session bookmarks
