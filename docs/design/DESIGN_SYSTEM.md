# VEIL Design System

Single source of truth for VEIL visual design. This document defines principles, hierarchy, and consistency rules. Implementation lives in code and companion docs — not here.

**Status:** Foundation (Phase D1) — documentation only. No UI changes until later phases.

---

## 1. Philosophy

### VEIL is

| Trait | Meaning |
|-------|---------|
| **Media-first** | The video is the primary object. UI exists to support watching and controlling visibility — not to compete with the picture. |
| **Calm** | Low visual noise, restrained motion, comfortable contrast for long sessions. |
| **Professional** | Trustworthy, polished, suitable for study, review, and parental use — not flashy or experimental. |
| **Precise** | Timing, masks, and track data demand accuracy. Controls and feedback should feel exact and dependable. |
| **Non-destructive** | The original media file is never modified. Tracks are separate assets. The UI must never imply permanent edits to video. |

### VEIL is NOT

| Anti-pattern | Why it is excluded |
|--------------|-------------------|
| **Video editor** | No timeline-as-compositor, no export-as-rendered-video workflow as the default mental model. |
| **Enterprise dashboard** | No dense KPI grids, admin chrome, or corporate data-viz aesthetic. |
| **Gamer UI** | No neon, aggressive gradients, or high-contrast “gaming” skins. |
| **Cyberpunk UI** | No glitch effects, scanlines, or dystopian ornamentation. |
| **Developer tool** | No raw JSON-first UI, debug-terminal styling, or unlabeled power-user-only surfaces as the default experience. |

**Design test:** If a screen feels like it belongs in Premiere, Jira, Discord, or a hacker movie — it is off-brand.

---

## 2. Product Hierarchy

Order of importance (highest first):

1. **Video** — The picture, playback, and in-video overlays (masks, subtitle cover).
2. **Timeline** — Temporal structure: playhead, lanes, intervals, selection.
3. **Context** — Sidebar panels, layer list, selected-item editor, import/save flows.
4. **Settings** — Motion, appearance, language, status bar — accessed when needed, not dominant.

### Rule

**Video always receives the highest visual emphasis.**

- Largest contiguous area on screen during playback.
- Darkest/neutral surround so content reads clearly.
- Chrome (menus, sidebars, timeline headers) stays visually subordinate.
- Settings and advanced panels must not steal focus from the stage during normal viewing.

---

## 3. Progressive Disclosure

### Rule

**Common tasks should be visible.**

**Advanced controls should remain hidden until needed.**

| Tier | Examples | Placement |
|------|----------|-----------|
| **Always visible** | Play/pause, seek, open video, save/load track, add mask/mute/skip | Player chrome, sidebar Create, File menu |
| **Contextual** | Selected item timing/style, layer list actions, subtitle mode | Sidebar when a section or item is active |
| **Advanced** | Fade ms, presentation presets, offset/shift, anchors, groups | Collapsible sections, details blocks, dedicated panels |
| **Rare / power** | Manual track builder, debug stats, keyboard shortcut reference | Menu, dialog, or overlay — not default chrome |

Beginners should complete core workflows without opening five panels. Experts should reach depth without extra clicks for daily actions.

---

## 4. Consistency Rules

One system per dimension. No one-off spacing, type, or color in new work.

### Spacing scale

Use a **4px base unit**. All layout gaps, padding, and margins snap to this scale:

| Token | Value | Typical use |
|-------|-------|-------------|
| `space-1` | 4px | Tight inline gaps, icon padding |
| `space-2` | 8px | Button padding (compact), list item gaps |
| `space-3` | 12px | Form field spacing, panel inner padding (small) |
| `space-4` | 16px | Section padding, standard control gaps |
| `space-5` | 20px | Panel sections, sidebar block spacing |
| `space-6` | 24px | Dialog padding, major section breaks |
| `space-8` | 32px | Page-level margins, hero spacing |
| `space-10` | 40px | Large empty states, startup screen |

**Rule:** Do not introduce arbitrary values (e.g. 13px, 18px) unless documented as a one-time exception with rationale.

### Typography scale

See [TYPOGRAPHY.md](./TYPOGRAPHY.md). Summary: **12, 13, 14, 16, 20, 24, 32** only.

### Color system

See [COLOR_SYSTEM.md](./COLOR_SYSTEM.md). Summary: brand purple, semantic lane colors, dark surfaces, three text levels.

### Button system

| Variant | Purpose |
|---------|---------|
| **Primary** | One main action per surface (e.g. Load track, Save, Get started) |
| **Secondary** | Common alternate actions (Add mask, Open video) |
| **Ghost** | Tertiary, low emphasis (Cancel, collapse, icon-adjacent text) |
| **Compact** | Dense toolbars (timeline, player controls) |

**States (all variants):** default, hover, pressed/active, disabled, focus-visible.

**Rule:** One primary button per dialog footer or modal action row. Destructive actions use Danger semantic color, not a separate “red button species” unless specified in COMPONENTS.md.

---

## Related documents

| Document | Contents |
|----------|----------|
| [COLOR_SYSTEM.md](./COLOR_SYSTEM.md) | Palette and semantic usage |
| [TYPOGRAPHY.md](./TYPOGRAPHY.md) | Type scale and roles |
| [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) | Product and interaction principles |
| [COMPONENTS.md](./COMPONENTS.md) | Component inventory (purpose, states) |
| [LAYOUTS.md](./LAYOUTS.md) | Future screen hierarchies |

---

## Governance

- New UI work must reference this system before implementation (Phase D2+).
- Changes to tokens or principles require updating this doc and affected companion files.
- Track schema and app versioning are separate from visual design versioning.
