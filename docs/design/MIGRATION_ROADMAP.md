# VEIL UI Refresh — Migration Roadmap

**Phase D7 — documentation only.** Maps current VEIL to target VEIL without losing functionality. No React, CSS, or component deletion in this phase.

**Related design specs:**

| Doc | Scope |
|-----|--------|
| [WATCH_MODE.md](./WATCH_MODE.md) | Default playback chrome |
| [EDIT_MODE.md](./EDIT_MODE.md) | Inspector + timeline editing |
| [HOME_REDESIGN.md](./HOME_REDESIGN.md) | No-video lobby |
| [COMPONENT_SPECIFICATIONS.md](./COMPONENT_SPECIFICATIONS.md) | Sizes, states, tokens |
| [COLOR_SYSTEM.md](./COLOR_SYSTEM.md) · [TYPOGRAPHY.md](./TYPOGRAPHY.md) | Visual tokens |

---

## Purpose

This roadmap answers:

- **What moves** from current UI to target UI
- **What stays** (business logic, engines, data)
- **What gets replaced** (chrome/layout shells)
- **In what order** to implement with acceptable risk
- **How to release** without breaking track workflows

**Principle:** Migrate **shell and visibility** first; preserve **store, serialization, timeline math, mask geometry, and IPC** throughout.

---

## 1. Current → future screen mapping

| Current surface | File(s) | Target | Notes |
|-----------------|---------|--------|-------|
| **Startup screen** | `StartupScreen.tsx` | **Home** (brief splash optional) | Same copy family as Home hero; ≤2s or remove |
| **Empty workspace** | `EmptyState.tsx` + `App.tsx` `workspace-no-video` | **Home** | Full-width; no sidebar |
| **Player (video open)** | `VideoPlayer.tsx` | **Watch Mode** (default) | Lands here on open video |
| **Player + timeline + sidebar** | `VideoPlayer.tsx` | **Edit Mode** | Explicit `E` / Edit Track |
| **Track editor (implicit)** | Sidebar panels + `TrackEditor.tsx` | **Edit Mode inspector** | Not a separate route |
| **Track sidebar** | `TrackSidebar.tsx` | **Inspector + Track Tools menus** | Shell replaced; inner panels reused in dialogs |
| **Track sidebar rail** | `TrackSidebarRail.tsx` | **Removed** (Watch); **N/A** (Edit uses inspector) | Rail not in target |
| **Layer list** | `LayerList.tsx` | **Timeline + optional list drawer** | List not default open |
| **Status bar** | `StatusBar.tsx` | **Track chip + toasts** | Default hidden in Watch |
| **File menu / App menu** | `AppMenuBar.tsx` | **Kept** | View items gated by mode |
| **Settings** | `SettingsDialog.tsx` | **Kept** | Minor layout/token refresh |
| **Load track flow** | `TrackImportDialog.tsx` + `useTrackFileActions.ts` | **Kept** | Dialog token refresh only |
| **Fullscreen overlay** | `FullscreenEditOverlay.tsx` | **Watch-first fullscreen** | Edit drawer on `E` only |
| **First-run overlay** | `FirstRunOverlay.tsx` | **Home Quick start** or merged | De-duplicate copy |
| **About / Update** | `AboutDialog.tsx`, `UpdateAvailableDialog.tsx` | **Kept** | Dialog shell standardization |

---

## 2. Current sidebar mapping

Every `TrackSidebar` section mapped to target. **Inner components are reused** unless noted; **CollapsiblePanel wrapper** is what goes away.

| Current section | `panelId` | Inner component(s) | Target | Disposition |
|-----------------|-----------|-------------------|--------|-------------|
| **Track** | `sidebar-track` | `TrackFileControls` | **Track Overview** (inspector) + File menu | **Merged** — Save/Load/Clear in overview; chip for status |
| **Create** | `sidebar-create` | `TrackActionControls` | **+ Add Action** menu | **Moved** — not always visible |
| **Selected item** | `sidebar-selected` | `TrackEditor` + `MaskStyleControls` | **Inspector (item selected)** | **Merged** into inspector shell |
| **Subtitles** | `sidebar-subtitles` | `SrtImportControls` | **Track Tools → Subtitles** dialog/sheet | **Moved** |
| **Organization** (parent) | `sidebar-organization` | nested stack | **Dissolved** | **Removed** as container |
| **Track info** | `track-info` | `TrackMetadataPanel` | **Track Overview** fields | **Merged** |
| **Groups** | `track-groups` | `TrackGroupsPanel` | **Track Tools → Groups** + overview count | **Moved** |
| **Anchors** | `track-anchors` | `TrackAnchorsPanel` | **Track Tools → Anchors** | **Moved** |
| **Bookmarks** | `session-bookmarks` | `BookmarkControls` | **Track Tools → Bookmarks** | **Moved** |
| **Offset & shift** | `offset-shift` | `TrackOffsetControls` | **Track Tools → Offset** | **Moved** |
| **Motion** | `motion-settings` | link to Settings | **Settings** (already) | **Removed** from sidebar |
| **Layers** | `sidebar-layers` | `LayerList` | **Timeline** (+ optional drawer) | **Merged** into timeline UX |

### Summary disposition

| Disposition | Sections |
|-------------|----------|
| **Removed** (container only) | Organization accordion, Motion panel, TrackSidebarRail, CollapsiblePanel stack |
| **Merged** | Track + Track info → Track Overview; Selected item → Inspector |
| **Moved** | Create, Subtitles, Groups, Anchors, Bookmarks, Offset → menus/dialogs |
| **Merged (timeline)** | Layers → timeline primary |

### Bridges to preserve during migration

| Bridge | File | Until |
|--------|------|-------|
| Sidebar panel open requests | `sidebarPanelBridge.ts` | Inspector focuses equivalent section or opens dialog |
| App menu actions | `appMenuBridge.ts` | Keep; retarget to new surfaces |
| Chrome prefs | `playerChromePreferences.ts` | Migrate to `playerMode` + optional legacy toggle |

---

## 3. Components to keep

**Do not rewrite** — these are correctness-critical or already solid.

### Engines & logic

| Asset | Location | Why keep |
|-------|----------|----------|
| **Timeline engine** | `TimelineEditor.tsx`, `TimelineBar.tsx`, `TimelineRuler.tsx`, `TimelineControls.tsx` | Drag, zoom, snap, selection math |
| **Mask on video** | `MaskBox.tsx`, `RegionSubtitleCover.tsx`, `lib/videoRect.ts`, `lib/geometry.ts` | Percent-based alignment |
| **Playback / reconcile** | `VideoPlayer.tsx` (logic hooks), `lib/maskTransitions.ts` | Active intervals, skip, mute |
| **Track serialization** | `lib/trackSerialization.ts`, `lib/trackSchema.ts` | Save/load contract |
| **Import / export** | `useTrackFileActions.ts`, `trackMatching.ts`, `fingerprint.ts` | Mismatch + mobile compat |
| **Subtitle parser** | `lib/srtParser.ts`, cue storage in store | SRT workflows |
| **Store** | `useVeilStore.ts` | Single source of truth |
| **History** | `lib/trackHistory.ts`, undo/redo | Edit workflows |
| **Groups session** | `lib/trackGroupSession.ts` | Solo/hide/collapse prefs |
| **Update checker** | `lib/updateChecker.ts` | Help → Check for Updates |
| **i18n** | `src/i18n/*` | 8 locales; add keys only |
| **IPC / native dialogs** | `electron/*`, `veilEnv.ts` | Save/load track JSON |
| **Manual track builder** | `ManualTrackBuilderDialog.tsx`, `manualTrackBuilder.ts` | Off-video authoring |

### UI shells (keep, restyle later)

| Asset | Notes |
|-------|-------|
| **Modal** | `Modal.tsx` — apply dialog spec |
| **Toast store** | `useToastStore.ts`, `ToastRegion.tsx` |
| **Settings content** | `SettingsDialog.tsx`, motion/subtitle prefs |
| **Keyboard / shortcuts** | `lib/shortcuts.ts`, `ShortcutHelp.tsx` |

---

## 4. Components to replace

| Current | Replacement | Rationale |
|---------|-------------|-----------|
| **`TrackSidebarRail.tsx`** | Nothing in Watch; Edit uses inspector | Rail is editor navigation; conflicts with Watch Mode |
| **`TrackSidebar.tsx` shell** | `InspectorPanel.tsx` (new) + menu triggers | One right column vs 7+ accordions |
| **`CollapsiblePanel` stack in sidebar** | Inspector sections + dialogs | Progressive disclosure via menus |
| **Status bar track/dirty info** | **Track chip** (new) | Always visible, minimal |
| **Create panel (always open)** | **Add Action** menu (new) | [EDIT_MODE.md](./EDIT_MODE.md) |
| **Timeline toggle in transport** | **Mode-gated timeline** | Timeline = Edit only |
| **`workspace-no-video` + sidebar** | **`HomeScreen`** (new) | [HOME_REDESIGN.md](./HOME_REDESIGN.md) |
| **Duplicate track status** | Chip + overview counts | `showDirtyStatus` in file controls redundant |

**Replacement = new layout components wrapping existing inner panels** where possible — not rewriting `TrackEditor` on day one.

---

## 5. Components to refactor

| Component | Scope | Work |
|-----------|-------|------|
| **`App.tsx`** | **Major** | `playerMode` state; Home vs Player routing; remove no-video sidebar |
| **`VideoPlayer.tsx`** | **Major** | Watch/Edit layout; top bar; chip slot; hide sidebar/timeline by mode |
| **`TrackSidebar.tsx`** | **Major** | Deprecate → extract panels into inspector/dialog hosts |
| **`TimelineEditor.tsx`** | **Moderate** | Height cap; header toolbar; optional list drawer hook |
| **Transport (in `VideoPlayer`)** | **Moderate** | Volume; remove timeline btn; Edit/Done |
| **`TrackFileControls.tsx`** | **Moderate** | Split: overview actions vs chip menu |
| **`TrackImportDialog.tsx`** | **Minor** | Dialog tokens; already localized |
| **`SettingsDialog.tsx`** | **Minor** | Tokens + spacing |
| **`EmptyState.tsx`** | **Major** | Becomes `HomeScreen` hero |
| **`StartupScreen.tsx`** | **Minor** | Align or remove |
| **`FullscreenEditOverlay.tsx`** | **Moderate** | Watch-default; edit on demand |
| **`AppMenuBar.tsx`** | **Moderate** | View menu mode gating |
| **`StatusBar.tsx`** | **Minor** | Default off; optional keep |
| **`LayerList.tsx`** | **Moderate** | Drawer mode vs embedded sidebar |

---

## 6. Recommended implementation order

Each phase should merge behind a **feature flag** or `playerMode` until stable: `veil:classicLayout` optional for one release.

---

### Phase 1 — Mode state

**Goal:** `playerMode: 'watch' | 'edit'` without visual redesign.

| Task | Detail |
|------|--------|
| Add mode to store or `App.tsx` | Default `watch` on video open |
| Wire `E` toggle | Enter/exit edit |
| Couple visibility | `watch` → hide timeline + sidebar; `edit` → show |
| Persist optional | Session only first |
| Menu | View → Edit Track |

**Touches:** `App.tsx`, `VideoPlayer.tsx`, `AppMenuBar.tsx`, `playerChromePreferences.ts`

**Do not yet:** Delete sidebar files.

---

### Phase 2 — Track chip

**Goal:** [COMPONENT_SPECIFICATIONS.md § Track Chip](./COMPONENT_SPECIFICATIONS.md)

| Task | Detail |
|------|--------|
| New `TrackChip.tsx` | States: none, loaded, dirty, disabled |
| Top bar placement | Watch + Edit |
| Chip menu | Load, enable/disable, replace, remove, info |
| Dirty dot | From `isTrackDirty` |

**Touches:** New component, `VideoPlayer` or `PlayerTopBar`, `useTrackFileActions` menu hooks

---

### Phase 3 — Home

**Goal:** [HOME_REDESIGN.md](./HOME_REDESIGN.md)

| Task | Detail |
|------|--------|
| `HomeScreen.tsx` | Hero, CTA, concept strip, quick start |
| Remove no-video `TrackSidebar` | `App.tsx` |
| Recents (optional MVP) | Persist paths local |
| Empty state copy | i18n keys |

**Touches:** `App.tsx`, `EmptyState` → `HomeScreen`, `styles.css` (later phase)

---

### Phase 4 — Inspector

**Goal:** [EDIT_MODE.md](./EDIT_MODE.md)

| Task | Detail |
|------|--------|
| `InspectorPanel.tsx` | Overview vs item states |
| Embed `TrackMetadataPanel`, `TrackEditor` | Reuse internals |
| Track Overview actions | Save, Export, Duplicate stubs |
| Collapse toggle | Width 320px |

**Touches:** New shell; slim `TrackSidebar` or parallel render in Edit Mode

---

### Phase 5 — Track Tools

**Goal:** Menu-driven former sidebar sections

| Task | Detail |
|------|--------|
| `TrackToolsMenu.tsx` | Subtitles, Groups, Anchors, Offset, Bookmarks, Manual builder |
| Dialog hosts | Wrap `SrtImportControls`, `TrackGroupsPanel`, etc. |
| **+ Add Action** menu | Wire `TrackActionControls` actions |

**Touches:** New menus; sidebar panels become dialog content

---

### Phase 6 — Timeline polish

**Goal:** Height, colors, layer integration

| Task | Detail |
|------|--------|
| Reduce timeline height | 120–160px |
| Semantic bar colors | [COLOR_SYSTEM.md](./COLOR_SYSTEM.md) |
| Optional layer drawer | From timeline header |
| Hide layer sidebar panel | When drawer ships |

**Touches:** `TimelineEditor.tsx`, `TimelineBar.tsx`, `LayerList.tsx`

---

### Phase 7 — Visual refresh

**Goal:** Design tokens app-wide

| Task | Detail |
|------|--------|
| CSS custom properties | Brand, surfaces, semantic, spacing |
| Buttons | Four types per spec |
| Typography | Inter scale 12–32 |
| Dialogs / toasts | Standard shells |
| Remove classic layout flag | After soak |

**Touches:** `styles.css`, component class names (incremental)

---

### Phase 8 — Cleanup (post-1.0)

| Task | Detail |
|------|--------|
| Remove `TrackSidebar.tsx` | After inspector + dialogs parity |
| Remove `TrackSidebarRail.tsx` | |
| Remove `CollapsiblePanel` sidebar usage | Keep for inspector Advanced `<details>` if useful |
| Update docs | README screenshots |

**Not in early phases** — deprecation only after QA gates pass.

---

## 7. Risk analysis

### High risk

| Area | Risk | Mitigation |
|------|------|------------|
| **Timeline regressions** | Drag, snap, zoom, selection break when resizing or hiding | Phase 1 keeps engine; Phase 6 visual only; full timeline QA each phase |
| **Save / load regressions** | Moving Save out of sidebar breaks discoverability | Chip + overview + Ctrl+S unchanged; QA gate every phase |
| **Mask geometry** | Layout reflow shifts mask alignment | No change to `MaskBox` / `videoRect` in UI phases; resize tests |
| **Mode transition bugs** | Playback interrupt, lost selection | Explicit tests for watch↔edit; no store reset on toggle |
| **Subtitle workflows** | Moving SRT to dialog breaks import/generate | Port `SrtImportControls` intact; dialog wrapper only |

### Medium risk

| Area | Risk | Mitigation |
|------|------|------------|
| **RTL regressions** | Inspector side, menus, toasts | Mirror shell; LTR timeline rule; Arabic QA pass |
| **Keyboard shortcuts** | M/U/K, E conflicts | Document in ShortcutHelp; `sidebarPanelBridge` remap |
| **Fullscreen behavior** | Edit drawer vs Watch | Phase after chip + mode stable |
| **i18n string churn** | New Home/chip keys | Add keys before UI swap |
| **Mobile track import** | Mismatch dialog + chip load paths | Keep `useTrackFileActions`; regression test file |

### Low risk

| Area | Risk | Mitigation |
|------|------|------------|
| **Update checker** | Unaffected | No changes required |
| **About / settings** | Token-only | Phase 7 |
| **Toasts** | Stripe styling | Phase 7 |
| **Startup splash** | Cosmetic | Phase 3 |
| **Status bar hide** | Power users miss layer count | Setting to re-enable |

---

## 8. QA gates

**Must pass before merging each implementation phase** (automated where exists + manual smoke).

| Gate | Phase 1+ | Automation |
|------|----------|------------|
| `npm run qa` | All | typecheck, tests, build |
| **Open video** | All | manual / smoke script |
| **Save track** | 1+ | manual; native dialog |
| **Load track** | 1+ | manual; mobile sample JSON |
| **Mask** add/edit/playback | 1+ | manual |
| **Mute** | 1+ | manual |
| **Skip** | 1+ | manual |
| **Subtitles** import + smart cover | 5+ | `srtParser` tests + manual |
| **Mobile compatibility** load | 1+ | `trackMatching.test.ts` + manual mismatch confirm |
| **Watch ↔ Edit toggle** | 1+ | manual |
| **Track chip** menu actions | 2+ | manual |
| **RTL Arabic** shell | 4+ | manual |
| **Undo / redo** | 1+ | existing tests |
| **Unsaved guard** | 1+ | manual close video |

### Per-phase minimum

| Phase | Extra gate |
|-------|------------|
| **1 Mode** | Default watch on open; timeline hidden |
| **2 Chip** | Dirty dot; load/replace from chip |
| **3 Home** | No sidebar without video; open video → watch |
| **4 Inspector** | Overview + item edit parity with old Selected + Track |
| **5 Track Tools** | SRT import dialog; groups dialog |
| **6 Timeline** | Bar colors; height; selection ↔ inspector |
| **7 Visual** | Contrast spot-check; button states |

---

## 9. Release strategy

| Version | Theme | Scope |
|---------|-------|-------|
| **0.8.0** | **UI transition** | Phases 1–4: mode, chip, Home, inspector (classic layout flag optional) |
| **0.9.0** | **Polish** | Phases 5–6: Track Tools, timeline; remove flag default-on new UI |
| **1.0.0** | **Final** | Phase 7 visual refresh; sidebar deprecation; docs + soak |

### Branch / flag strategy

- `classicLayout` reads old `sidebarCollapsed` + `timelineVisible` behavior
- Default **off** in 0.8.0 beta; **on** new UI in 0.9.0
- Remove flag in 1.0.0

### Track schema

- **Current:** **1.5.0** (bookmark segments in `items[]`)
- **Import:** `1.0.0`–`1.5.0`; tracks without bookmarks load on older clients
- **Export:** new saves use `1.5.0` when bookmarks or current desktop exporter are used

### Communication

- CHANGELOG per minor: “Watch Mode default”, “Track chip”, “New Home”
- `docs/track-format.md` unchanged
- Update `docs/testing-regression.md` with mode + chip checks

### Deferred release items

- **Future:** When editing VEIL without video, show a default 16:9 canvas/background so masks can be positioned visually before video is loaded.
- **0.9 / 1.0:** Custom frameless desktop title bar, integrated menu, and app window controls.

---

## Dependency graph (summary)

```
Phase 1 Mode State
    ├── Phase 2 Track Chip
    ├── Phase 4 Inspector (requires Edit Mode)
    └── Phase 6 Timeline polish (requires Edit Mode)

Phase 3 Home (independent of video modes)

Phase 5 Track Tools (requires Phase 4 shell or dialog host)

Phase 7 Visual Refresh (after 1–6 functionally complete)
```

---

## R11 — Bookmark Segments

**Status:** Implemented in schema `1.5.0`.

| Area | Change |
|------|--------|
| **Track format** | New `bookmark` item type in `items[]` — point marker (`start` == `end`) |
| **Runtime** | Bookmarks excluded from mask/mute/skip reconciliation |
| **Store** | `bookmarks[]` with add/patch/delete; undo/redo included |
| **Timeline** | Dedicated Bookmarks lane with diamond markers |
| **Inspector** | Bookmark selected-item editor; overview card separate from runtime actions |
| **Track Tools** | Bookmarks panel lists track bookmarks (replaces session-only flow for VEIL items) |

Session bookmarks (`sessionStorage`) remain for legacy canvas markers; track bookmarks persist in `.veil` files.

---

## Implementation note

**This document authorizes planning only.** No file deletion until Phase 8 QA sign-off. Engineers should link PRs to phase numbers and QA gate rows.

---

## Implementation Progress

UI refresh phases behind `veil:uiRefreshV1` (enable: `localStorage.setItem('veil:uiRefreshV1', '1')`).

| Phase | Status | Summary |
|-------|--------|---------|
| **I1** | Complete | Watch/Edit mode foundation (`playerMode`, `E` toggle) |
| **I2** | Complete | Track chip in header |
| **I3** | Complete | Home lobby (no-video) |
| **I4** | Complete | Watch mode chrome |
| **I5** | Complete | Edit mode Inspector shell |
| **I6** | Complete | Track Tools dialog routing |
| **I7** | Complete | Inspector item editing (`TrackEditor`) |
| **I8** | Complete | Inspector Track Overview + Add Action menu |
| **I9** | Complete | Timeline visual polish (semantic colors) |
| **I10** | Complete | Refresh path activation cleanup |
| **I11** | Complete | Visual token pass (`--veil-*`, refreshed surfaces) |
| **I12** | Complete | Refresh QA checklist, Settings toggle, default readiness prep |
| **I13** | Complete | Layer Manager drawer — Track Tools + timeline header; layer dependency removed |
| **R1** | Complete | Soak audit + P0 bug fixes ([SOAK_TEST.md](./SOAK_TEST.md)) |
| **R2** | Complete | Release candidate audit — Save As, clear confirm, 0.8.0 prep |
| **M1** | Complete | Community track metadata (title, description, author, tags) |
| **M2** | Complete | Export / Share dialog (local only) |
| **R3** | Complete | **0.8.0 Preview release freeze** ([RELEASE_0.8.0_PREVIEW.md](../release/RELEASE_0.8.0_PREVIEW.md)) |

Legacy sidebar remains available via **Advanced Sidebar** in the Inspector footer (explicit opt-in only). **No functional refresh workflow requires it** after I13 (organization tree is the only minor edge case).

**0.8.0 Preview:** shipped opt-in; default-on deferred to post-soak (target 0.9.0).

---

## Default Readiness

Criteria before making `uiRefreshV1` the default (target: **0.8.0** or **0.9.0**):

| Criterion | Status |
|-----------|--------|
| **Local soak** | ≥ 1 week daily use on real tracks without critical regressions |
| **Manual QA** | All items in [UI_REFRESH_QA.md](./UI_REFRESH_QA.md) pass |
| **Automated QA** | `npm run qa` green on release branch |
| **Classic fallback** | Settings toggle disables refresh; legacy UI unchanged |
| **No critical bugs** | Save/load, mask/mute/skip playback, subtitles, RTL timeline alignment |

**When ready:**

1. Set `readUiRefreshV1()` default to `true` (or migrate unset key → enabled)
2. Keep Settings toggle for one release so users can return to classic layout
3. Update README screenshots and `docs/testing-regression.md`
4. Announce in CHANGELOG; remove “preview” notice after soak

**Not required for default:** deleting `TrackSidebar`, rail, or legacy panels (Phase I12+ / post-1.0).

---

## Document index (design package)

| Phase | Doc |
|-------|-----|
| D1 | DESIGN_SYSTEM, COLOR, TYPOGRAPHY, UX, COMPONENTS, LAYOUTS |
| D2 | PLAYER_REDESIGN |
| D3 | HOME_REDESIGN |
| D4 | WATCH_MODE |
| D5 | EDIT_MODE |
| D6 | COMPONENT_SPECIFICATIONS |
| D7 | **MIGRATION_ROADMAP** (this file) |
