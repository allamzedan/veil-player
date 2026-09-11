# VEIL Layouts

Future screen hierarchies for VEIL Player. **Structure and priority only** — no implementation in Phase D1.

**Status:** Foundation (Phase D1) — documentation only.

---

## Layout principles (all screens)

1. **Video first** where playback exists (see UX_PRINCIPLES.md).
2. **Consistent chrome:** app header, menu bar, optional status bar.
3. **Sidebar + timeline** pattern for editing; collapsible to maximize stage.
4. **RTL:** Shell may mirror; timeline and time controls stay LTR.

---

## Home

**Purpose:** Entry when no video is loaded — orient user and start work quickly.

### Hierarchy (top → bottom)

1. **Brand / product identity** — calm hero, not marketing clutter
2. **Primary actions** — Open Video, Load Track (equal visual weight)
3. **Supporting copy** — non-destructive promise, what a track is
4. **Secondary** — recent files (future), documentation links, settings entry

### Notes

- No timeline or layer list on Home.
- Empty state in current app is a subset of this layout.
- Home should feel like a studio lobby, not a file manager.

---

## Player

**Purpose:** Primary workspace — watch video with visibility controls and timing edits.

### Hierarchy (visual emphasis)

1. **Video stage** — largest region, center or left-weighted
2. **Timeline** — below or adjacent to video; playhead and lanes
3. **Context sidebar** — track, create, item, subtitles, layers
4. **Transport** — play, seek, time readout, rate, fullscreen
5. **Settings / help** — menu only unless dialog opened

### Regions

| Region | Role |
|--------|------|
| Header + menu | Global file/edit/view/help |
| Player column | Video + overlays + transport |
| Sidebar (expanded) | Panels per section |
| Sidebar rail (collapsed) | Section switcher only |
| Timeline chrome | Zoom, snap, lane headers |
| Status bar (optional) | Dirty state, layer count, video name |

### Notes

- Collapsed sidebar + hidden timeline = maximum immersion.
- Fullscreen overlay is Player variant with drawer for active layers.

---

## Studio

**Purpose:** *(Future)* Deeper authoring — batch edits, groups, anchors, offset tools without leaving project context.

### Hierarchy

1. **Video + timeline** — still dominant (not a spreadsheet app)
2. **Organization panels** — groups, anchors, offset/shift (today in sidebar Organization)
3. **Layer list** — sort/filter, bulk enable/disable
4. **Inspector** — selected item timing + style

### Notes

- Studio may be the same shell as Player with expanded default panels — not a separate app.
- Manual track builder dialog is a Studio-adjacent flow for off-video authoring.

---

## Export

**Purpose:** *(Future)* Explicit output flows — save track, export summary, share instructions — never “render video” as default.

### Hierarchy

1. **Clarify output type** — `.veil.json` track file vs any future derivative
2. **Confirm scope** — items included, metadata, subtitle cover settings
3. **Destination** — save path, copy path, open folder
4. **Non-destructive reminder** — source video unchanged

### Notes

- Export is not the same as Save Track; if merged in UI, labeling must distinguish.
- No implementation in current 0.7.x; documented for D2+ planning.

---

## Layout ↔ product hierarchy mapping

| Layout | Video | Timeline | Context | Settings |
|--------|-------|----------|---------|----------|
| Home | — | — | Primary (CTAs) | Menu |
| Player | 1 | 2 | 3 | 4 |
| Studio | 1 | 2 | 3 (deeper) | 4 |
| Export | — | — | Dialog / wizard | 4 |

---

## Related documents

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — product hierarchy
- [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) — fast access, video first
- [COMPONENTS.md](./COMPONENTS.md) — building blocks per region
