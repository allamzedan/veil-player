# UI Refresh — Soak Test Log

Phase **R1** tracking document for stabilizing `uiRefreshV1` before default enablement.

**Related:** [UI_REFRESH_QA.md](./UI_REFRESH_QA.md) (manual checklist) · [MIGRATION_ROADMAP.md](./MIGRATION_ROADMAP.md) (default readiness)

Enable refresh: **Settings → Interface → Use refreshed interface** (reload) or `localStorage.setItem('veil:uiRefreshV1', '1')`.

---

## Issue tracker

| ID | Issue | Steps to Reproduce | Expected | Actual | Severity | Status |
|----|-------|-------------------|----------|--------|----------|--------|
| R1-01 | Edit shortcuts work in Watch mode | Flag on → open video → Watch → press M/U/K/I/O/Del | No track mutation | Shortcuts added/edited items | **Critical** | **Fixed** (R1) |
| R1-02 | Track menu edit actions in Watch | Watch → Track menu → Add Mask | Disabled / blocked | Enabled | **Critical** | **Fixed** (R1) |
| R1-03 | Fullscreen edit toolbar in Watch | Watch → fullscreen → toolbar | Playback only | Add mask/mute/skip visible | **High** | **Fixed** (R1) |
| R1-04 | Timeline Hide ineffective | Edit → timeline header Hide | Return to Watch | No visible change | **High** | **Fixed** (R1) |
| R1-05 | Legacy timeline toggle in refresh | Edit → transport Timeline button | N/A (mode-driven) | Toggles dead pref | **Medium** | **Fixed** (R1) — hidden in refresh |
| R1-06 | Clear track no-op (collapsed sidebar) | Collapsed sidebar pref → TrackChip Remove / menu Clear | Confirm + clear | Silent no-op | **Critical** | **Fixed** (R1) |
| R1-07 | Duplicate SRT import registration | Inspector Edit → menu Import SRT | Single handler | Race between sidebar + dialog | **Medium** | **Fixed** (R1) |
| R1-08 | Stale Track Tool after Advanced Sidebar | Open tool dialog → Advanced Sidebar → back to inspector | Dialog closed | Dialog may reopen | **Medium** | **Fixed** (R1) |
| R1-09 | Selection persists in Watch | Edit + select item → Done | Selection cleared | Hidden selection, shortcuts still work | **Medium** | **Fixed** (R1) |
| R1-10 | TrackChip Save As = Save | Save As menu item | New path dialog | Same as Save | **Low** | **Fixed** (R2) |
| R1-11 | Layer list requires Advanced Sidebar | Refresh Edit → need sort/filter/jump list | Inspector Track Tools → Layers or timeline header Layers | Only via Advanced Sidebar | **Medium** | **Fixed** (I13) |
| R1-12 | Hidden sidebar still mounts in inspector | Edit + inspector, DevTools | No legacy sidebar DOM work | Full TrackSidebar mounted, CSS hidden | **Low** | Open (perf) |
| R1-13 | Confirm strings differ for clear | Inspector Clear vs menu Clear | Same copy | `inspector.clearTrackConfirm` vs `track.clearConfirm` | **Low** | **Fixed** (R2) |

---

## Audit summary (code review + targeted fixes)

### Home
- **OK:** HomeLobby only when flag on + no video (`App.tsx`).
- **OK:** Startup tagline aligned with Home tone (I12).

### Watch
- **Fixed R1-01–03:** Keyboard, menu, and fullscreen edit gated when `uiRefreshV1 && playerMode === 'watch'`.
- **OK:** Transport single row, volume, TrackChip, Edit Track header.

### Edit
- **Fixed R1-04–05:** Timeline hide → Watch; legacy timeline toggle hidden under refresh.
- **OK:** Inspector + refreshed timeline when Edit + not Advanced Sidebar fallback.
- **Fixed R1-08–09:** Tool dialog + selection cleanup on mode/fallback changes.

### Inspector / TrackChip / Track Tools
- **OK:** Add Action, Track Tools dialogs, Save/Load via chip and inspector.
- **Fixed R1-06:** `clearTrack` registered in `App.tsx` via shared `runClearTrackAction`.
- **Open R1-10:** Save As not implemented.

### Timeline
- **OK:** Semantic colors, LTR enforcement, drag/resize/scrub logic unchanged.
- Manual stress (100+ drags/zooms): **pending human soak** — no code regressions found in math paths.

### Dialogs / Fullscreen / RTL
- **OK:** Track tool dialogs route correctly; RTL timeline rules in CSS.
- **Fixed:** Watch fullscreen hides edit chrome.

### Mobile track import
- **OK:** `useTrackFileActions` + mismatch dialog unchanged; works from chip/menu/home load.

---

## Watch ↔ Edit stress matrix (manual)

Run after each R1 fix batch. Target **100+** transitions per session.

| Check | Pass criteria | R1 code audit |
|-------|---------------|---------------|
| Layout | No stuck inspector/timeline/sidebar overlap | Mode CSS OK |
| Selection | Cleared on Watch | Fixed R1-09 |
| Dialogs | Track tools close on Watch / Advanced Sidebar | Fixed R1-07, R1-08 |
| Playhead | Scrub/zoom after mode toggle | No mode coupling in math |
| Memory | No runaway listeners after 100 toggles | Standard React cleanup |

**Human soak:** Not yet completed for 1-week criterion — see Default Readiness.

---

## Track operations (manual)

| Operation | Refresh path | Notes |
|-----------|--------------|-------|
| Create mask/mute/skip | Inspector Add Action, Edit menu, timeline | Blocked in Watch after R1 fix |
| Save / Load / Replace | Chip, inspector, File menu | OK |
| Clear | Chip, menu, inspector | Fixed R1-06 |
| Dirty badge | Chip dot, inspector badge | OK |
| Undo / Redo | Menu, shortcuts | OK (unchanged) |

---

## Localization audit (EN + AR)

| Area | EN | AR |
|------|----|----|
| Settings refresh toggle | OK | OK (8 locales) |
| Inspector / Home / Watch strings | OK | OK |
| TrackChip truncation | `text-overflow: ellipsis` | OK |
| RTL timeline LTR | CSS `direction: ltr` on timeline | OK |
| Missing keys | i18n test passes | — |

---

## Legacy dependency audit — Advanced Sidebar required for

| Feature | Refresh alternative | Status |
|---------|---------------------|--------|
| **LayerList** (sort, filter, jump, enable, lock, delete list) | Inspector Track Tools → Layers; timeline header Layers | **Migrated** (I13) |
| **Organization panel** navigation shell | Track Tools menus (partial) | **Optional** — Advanced Sidebar for full tree only |
| **Create panel** (legacy always-visible) | Inspector Add Action | Migrated |
| **Selected item** (legacy panel) | Inspector TrackEditor | Migrated |
| **Track file controls** (sidebar UI) | Chip + inspector overview | Migrated |
| **Motion settings** sidebar link | Settings dialog | Migrated |
| **Collapsed rail** navigation | N/A in refresh (sidebar hidden) | Legacy / fallback only |

**Normal refresh workflows should NOT open Advanced Sidebar** except explicit footer link (legacy escape hatch) or user disabling refresh.

**Layer dependency removed (I13):** no functional need to open Advanced Sidebar for layer list operations.

---

## Candidate deletions (document only — DO NOT DELETE)

| Component / path | Verdict | Notes |
|------------------|---------|-------|
| `TrackSidebar.tsx` | **Blocked** | Advanced Sidebar + flag-off + fallback |
| `TrackSidebarRail.tsx` | **Blocked** | Collapsed legacy layout |
| `sidebarPanelBridge.ts` | **Blocked** | Fallback routing |
| `EmptyState` + no-video sidebar | **Blocked** | Classic home |
| AppMenuBar legacy sidebar/timeline items | **Safe later** | Already hidden when refresh on |
| Duplicate subtitles in hidden sidebar | **Safe after R1-07 fix** | `hideSubtitlesPanel` when inspector active |
| `inspector.classicSidebar` i18n key | **Safe later** | Replaced by `advancedSidebar` in UI |

---

## Release recommendation

| Gate | Status |
|------|--------|
| P0 bugs from audit | **Fixed in R1** |
| P1 (Save As, layers, clear confirm) | **Fixed R2 / I13** |
| `npm run qa` | **Required each release — R3 green** |
| 1-week local soak | **In progress post-preview** |
| [UI_REFRESH_QA.md](./UI_REFRESH_QA.md) full pass | **Recommended before default-on** |

### Verdict (R3 — 0.8.0 Preview)

**Ready to publish 0.8.0 Preview** (opt-in refresh, classic default).

**Not ready** to set `uiRefreshV1` default true — target **0.9.0** after soak + manual QA pass.

Classic fallback remains available via Settings.

---

## Changelog (R1 fixes)

- Gate edit shortcuts, menu actions, and fullscreen edit toolbar in refresh Watch mode
- Timeline Hide returns to Watch under refresh; hide legacy timeline toggle
- Register `clearTrack` globally (`runClearTrackAction`)
- Suppress duplicate SRT panel when inspector active
- Clear selection and track-tool state on Watch / Advanced Sidebar transitions
- **I13:** Layer Manager drawer (`LayerManagerDrawer`) — reuses `LayerList` via Track Tools and timeline header; layer dependency on Advanced Sidebar removed
- **R2:** Save Track As with path memory; unified `track.clearConfirm` for all clear-track flows
- **M1:** Community track metadata fields
- **M2:** Export / Share dialog (local clipboard + Save As)
- **R3:** 0.8.0 Preview release freeze — version audit, packaging, release notes
- **R4:** Pre-publish UX blockers — splash removed (HomeLobby direct); Load VEIL unified via `TrackFileActionsProvider`; `.veil` default extension; VEIL naming in UI; HomeLobby layout; fullscreen idle chrome; TrackChip truncation; Add Action portal menu
- **R5 (deferred):** Frameless main window with custom title bar / window controls (minimize, maximize, close)
- **R5:** Launch card on HomeLobby; timeline playhead/bar coordinate fix; recent color swatch clipping; Track Overview sections; direct Mask/Mute/Skip buttons; Home Quick Start keyboard shortcuts
- **R6:** Frameless launcher window (Open Video / Load VEIL); Inspector back to overview; semantic mask/mute/skip colors; Ctrl+wheel timeline zoom anchor; selection clearing; summary cards open filtered Layer Manager
