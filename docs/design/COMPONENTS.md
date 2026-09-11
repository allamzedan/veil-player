# VEIL Component Inventory

Inventory of UI building blocks in VEIL Player. **Purpose, states, and notes only** — no visual specs yet (Phase D2).

**Status:** Foundation (Phase D1) — documentation only.

---

## Buttons

| Aspect | Notes |
|--------|-------|
| **Purpose** | Trigger actions: save, load, add item, confirm dialog, transport |
| **Variants** | Primary, secondary, ghost, compact (see DESIGN_SYSTEM.md) |
| **States** | Default, hover, pressed, disabled, focus-visible |
| **Notes** | One primary per action group; destructive uses Danger semantic, not a new variant family |

---

## Icon buttons

| Aspect | Notes |
|--------|-------|
| **Purpose** | Compact actions where label is redundant (play, collapse, dismiss toast, rail expand) |
| **States** | Same as buttons; often square hit target ≥ 32px |
| **Notes** | Must have `aria-label` or visible text alternative; tooltips optional supplement |

---

## Dialogs

| Aspect | Notes |
|--------|-------|
| **Purpose** | Focused tasks: load track, settings, about, update available, manual builder, unsaved changes |
| **States** | Open, closed; footer with cancel + primary action |
| **Notes** | Trap focus; Escape closes when safe; do not block video preview when mismatch is informational |

---

## Panels

| Aspect | Notes |
|--------|-------|
| **Purpose** | Persistent sidebar sections: Track, Create, Selected item, Subtitles, Layers, Organization |
| **States** | Expanded content; may be hidden when sidebar collapsed |
| **Notes** | Panel surface token; section titles at 16px scale |

---

## Collapsible panels

| Aspect | Notes |
|--------|-------|
| **Purpose** | Progressive disclosure within sidebar (details blocks, advanced mask style) |
| **States** | Expanded, collapsed; optional `aria-expanded` |
| **Notes** | Chevron or label indicates state; motion respects reduce-motion pref |

---

## Timeline rows

| Aspect | Notes |
|--------|-------|
| **Purpose** | One lane per item type (mask, mute, skip) or grouped view; bars represent intervals |
| **States** | Default, selected, disabled, locked, hover, dragging |
| **Notes** | Semantic colors per type; LTR always; playhead independent of UI direction |

---

## Track cards

| Aspect | Notes |
|--------|-------|
| **Purpose** | *(Future)* Represent saved tracks in library/home — metadata preview, open, load |
| **States** | Default, hover, selected, loading |
| **Notes** | Not fully implemented in current app; inventory for D2 Studio/Home layouts |

---

## Inputs

| Aspect | Notes |
|--------|-------|
| **Purpose** | Text, time entry, labels, track metadata, search/filter |
| **States** | Default, focus, invalid, disabled, read-only |
| **Notes** | Time fields use LTR digits; validation messages near field |

---

## Sliders

| Aspect | Notes |
|--------|-------|
| **Purpose** | Seek, opacity, font scale, subtitle appearance, zoom |
| **States** | Default, focus, disabled |
| **Notes** | Prefer visible value readout; seek slider in player chrome is primary |

---

## Toasts

| Aspect | Notes |
|--------|-------|
| **Purpose** | Transient feedback: track saved/loaded, undo empty, up to date, errors |
| **States** | Enter, visible, dismiss |
| **Notes** | Success / warning / error semantic; auto-dismiss; polite `aria-live` |

---

## Tooltips

| Aspect | Notes |
|--------|-------|
| **Purpose** | Shortcut hints, truncated label expansion, icon clarification |
| **States** | Hidden, visible on hover/focus |
| **Notes** | Not sole carrier of essential info; keyboard users need title or aria |

---

## Chips

| Aspect | Notes |
|--------|-------|
| **Purpose** | *(Future)* Compact filters, active subtitle mode, quick tags |
| **States** | Default, selected, disabled |
| **Notes** | Optional pattern; layer badges today are closer to tags |

---

## Tags

| Aspect | Notes |
|--------|-------|
| **Purpose** | Type badges (MASK, MUTE, SKIP), locked/disabled/active/hidden on layer rows |
| **States** | Static informational; may combine (e.g. locked + disabled) |
| **Notes** | 12px caption scale; semantic colors from COLOR_SYSTEM.md |

---

## Cross-cutting state matrix

| State | Applies to |
|-------|------------|
| **Disabled** | Buttons, inputs, sliders, timeline bars when no video or item locked |
| **Loading** | Dialogs during IPC read/write; future track cards |
| **Empty** | Layer list, bookmarks, anchors — copy at Secondary/Muted |
| **Error** | Form validation, import failure — toast + inline where applicable |

---

## Related documents

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [COLOR_SYSTEM.md](./COLOR_SYSTEM.md)
- [TYPOGRAPHY.md](./TYPOGRAPHY.md)
- [LAYOUTS.md](./LAYOUTS.md)
