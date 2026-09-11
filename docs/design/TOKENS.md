# VEIL Design Tokens

CSS custom properties and TypeScript constants for the VEIL Player design system.

**Status:** Implemented (Phase I11) — applied to refreshed UI (`app--ui-refresh-v1`) first.

**Related docs:** [COLOR_SYSTEM.md](./COLOR_SYSTEM.md) · [TYPOGRAPHY.md](./TYPOGRAPHY.md)

---

## Usage

Enable the UI refresh path:

```js
localStorage.setItem('veil:uiRefreshV1', '1')
```

When the refresh flag is on, the root `.app` element receives `app--ui-refresh-v1`, which:

1. Aliases legacy variables (`--bg`, `--surface`, `--accent`, etc.) to `--veil-*` tokens
2. Applies typography and button rules to refreshed surfaces only

Legacy/classic UI (flag off) keeps the original `--bg`, `--accent`, etc. values at `:root`.

---

## Brand

| Token | Value | COLOR_SYSTEM | Usage |
|-------|-------|--------------|-------|
| `--veil-brand` | `#6D5CE7` | Primary | Primary buttons, focus rings, playhead |
| `--veil-brand-hover` | `#7E70EB` | Hover | Primary hover |
| `--veil-brand-pressed` | `#5846D6` | Pressed | Primary active/pressed |

TypeScript: `VEIL_BRAND`, `VEIL_BRAND_HOVER`, `VEIL_BRAND_PRESSED` in `src/lib/veilDesignTokens.ts`

---

## Semantic actions

| Token | Value | COLOR_SYSTEM | Usage |
|-------|-------|--------------|-------|
| `--veil-mask` | `#7C6EE6` | Mask | Mask bars, inspector dots, menu accents |
| `--veil-mute` | `#E8A23A` | Mute | Mute bars and accents |
| `--veil-skip` | `#79B54A` | Skip | Skip bars and accents |
| `--veil-bookmark` | `#4FA4E8` | Bookmark | Bookmarks, anchors (future) |
| `--veil-warning` | `#E0A83A` | Warning | Dirty badge, non-blocking alerts |
| `--veil-danger` | `#D95C5C` | Danger | Clear track, destructive menu items |

TypeScript: `VEIL_MASK`, `VEIL_MUTE`, `VEIL_SKIP` → `INSPECTOR_ACTION_COLORS` in `src/lib/inspectorActionColors.ts`

Inspector and timeline scoped aliases:

- `--inspector-action-mask` → `var(--veil-mask)`
- `--timeline-action-mask` → `var(--veil-mask)` (and mute/skip)

---

## Surfaces

| Token | Value | COLOR_SYSTEM | Usage |
|-------|-------|--------------|-------|
| `--veil-bg` | `#101114` | Background | App shell |
| `--veil-panel` | `#17191E` | Panel | Header, inspector, timeline chrome |
| `--veil-elevated` | `#1D2026` | Elevated | Menus, dialogs, track chip |
| `--veil-border` | `#2B2F38` | Border | Dividers, panel edges |

Under `.app--ui-refresh-v1`, legacy aliases map as:

| Legacy | Refresh alias |
|--------|---------------|
| `--bg` | `--veil-bg` |
| `--surface` | `--veil-panel` |
| `--surface-elevated` | `--veil-elevated` |
| `--border` | `--veil-border` |

---

## Text

| Token | Value | COLOR_SYSTEM | Usage |
|-------|-------|--------------|-------|
| `--veil-text` | `#F3F4F6` | Primary | Headings, body, labels |
| `--veil-text-secondary` | `#A0A7B5` | Secondary | Descriptions, hints |
| `--veil-text-muted` | `#6D7480` | Muted | Metadata, captions |

Legacy aliases under refresh: `--text` → `--veil-text`, `--muted` → `--veil-text-muted`

---

## Typography scale

| Token | Size | TYPOGRAPHY | Role |
|-------|------|------------|------|
| `--veil-text-xs` | 12px | text-xs | Captions, badges, quick-start labels |
| `--veil-text-sm-meta` | 13px | text-sm-meta | Track chip, stats, metadata |
| `--veil-text-sm` | 14px | text-sm | Body, buttons, menu items |
| `--veil-text-base` | 16px | text-base | Section titles, inspector heading |
| `--veil-text-lg` | 20px | text-lg | Dialog titles |
| `--veil-text-xl` | 24px | text-xl | Home headline |
| `--veil-text-2xl` | 32px | text-2xl | Hero (reserved) |

Font stack: `--veil-font` → Inter, system-ui fallbacks

---

## Spacing

| Token | Value |
|-------|-------|
| `--space-1` | 0.25rem |
| `--space-2` | 0.5rem |
| `--space-3` | 0.75rem |
| `--space-4` | 1rem |
| `--space-5` | 1.25rem |
| `--space-6` | 1.5rem |

---

## Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--motion-fast` | 150ms | Buttons, hovers, selection |
| `--motion-normal` | 200ms | Bar drag feedback |
| `--motion-slow` | 250ms | Reserved |

Under refresh, `--motion-duration-fast` and `--motion-duration-normal` alias to these values.

Respect `html.motion-reduced` — transitions on refreshed controls are gated with `html:not(.motion-reduced)`.

---

## Refreshed surfaces using tokens

| Surface | Scope |
|---------|--------|
| Home lobby | `.app--ui-refresh-v1 .home-lobby*` |
| Track chip + menu | `.app--ui-refresh-v1 .track-chip*` |
| Watch/Edit header | `.app--ui-refresh-v1 .app-header--watch/edit` |
| Watch transport | `.app--ui-refresh-v1 .player-controls--watch` |
| Volume control | `.app--ui-refresh-v1 .volume-control*` |
| Inspector | `.app--ui-refresh-v1 .inspector-panel*` |
| Timeline chrome | `.player-chrome-timeline--refresh` + refresh aliases |
| Track tool dialogs | `.app--ui-refresh-v1 .modal__panel--track-tool` |

---

## Transition note

Legacy variables (`--accent`, `--bg`, etc.) remain at `:root` for classic UI. Do not remove them until Phase I12+ cleanup. New work in the refresh path should prefer `--veil-*` tokens directly or rely on `.app--ui-refresh-v1` aliases.
