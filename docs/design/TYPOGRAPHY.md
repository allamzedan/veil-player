# VEIL Typography

Type system for VEIL Player.

**Status:** Foundation (Phase D1) — documentation only.

---

## Font family

**Inter** — primary UI typeface.

| Role | Family |
|------|--------|
| UI (all chrome) | Inter, system-ui fallback stack |
| Monospace (optional) | ui-monospace, Consolas — debug stats, raw IDs only |

**Rule:** Do not introduce secondary display fonts for marketing chrome inside the desktop app without updating this document.

---

## Type scale

Allowed sizes only. **No arbitrary font sizes.**

| Size (px) | Token | Role |
|-----------|-------|------|
| **12** | `text-xs` | Captions, badges, timeline micro-labels, keyboard shortcut hints in menus |
| **13** | `text-sm-meta` | Metadata lines (schema version, file size, saved-with app version) |
| **14** | `text-sm` | **Body** — default UI copy, button labels, list rows, form labels |
| **16** | `text-base` | **Section titles** — sidebar panel headings, dialog section headers |
| **20** | `text-lg` | **Page titles** — dialog titles, major workspace headings |
| **24** | `text-xl` | Large headings — startup title, first-run hero |
| **32** | `text-2xl` | **Hero headings** — marketing moments only (startup, empty state hero if used) |

### Line height (guidance)

| Size | Suggested line-height |
|------|------------------------|
| 12–13 | 1.35 |
| 14–16 | 1.45–1.5 |
| 20+ | 1.25–1.35 |

### Weight (guidance)

| Weight | Use |
|--------|-----|
| 400 (regular) | Body, descriptions |
| 500 (medium) | Buttons, emphasized list labels |
| 600 (semibold) | Section titles, dialog titles |
| 700 (bold) | Hero only — use sparingly |

---

## Usage by context

### Captions (12px)

- Toast secondary line
- Badge text (MASK / MUTE / SKIP)
- Collapsed rail segment labels (vertical)
- Status bar secondary info

### Metadata (13px)

- Example copy: “Saved with VEIL Mobile 0.1.0 · schema 1.5.0”
- Track import dialog footer notes
- About dialog version line
- Layer list timing subtext (with tabular nums)

### Body (14px)

- Default for all interactive UI
- Menu items, checkbox labels, settings rows
- Timeline control tooltips (when shown as text)

### Section titles (16px)

- Sidebar: Track, Create, Layers, Subtitles
- Settings group headings
- Import dialog: Contents, Media comparison

### Page titles (20px)

- Modal titles (Load track, Settings, About)
- Timeline chrome header when emphasized

### Hero (24px+)

- Startup screen product name
- First-run welcome title
- Not used in dense editing surfaces

---

## Rules

1. **No arbitrary font sizes** — if 15px or 18px seems needed, remap to 14 or 16.
2. **Video-first** — typography in chrome stays smaller than the video; no oversized UI type in the player workspace.
3. **RTL** — Arabic UI may flip layout; timecodes, durations, and timeline digits stay **LTR** with tabular figures (`.ltr-digits` in implementation).
4. **All caps** — avoid except micro-badges (MASK, SKIP); prefer sentence case for buttons and titles.
5. **Truncation** — long filenames use ellipsis at body size; do not shrink below 12px to fit.

---

## Related documents

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — spacing and hierarchy
- [COLOR_SYSTEM.md](./COLOR_SYSTEM.md) — text colors on surfaces
- [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) — calm interface, keyboard-friendly copy
