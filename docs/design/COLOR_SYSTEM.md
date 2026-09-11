# VEIL Color System

Official palette for VEIL Player. All new UI should use these tokens — not ad-hoc hex values.

**Status:** Foundation (Phase D1) — documentation only.

---

## Brand

Primary interactive and accent color. Used for links, primary buttons, focus rings, and brand emphasis — not for full backgrounds.

| Token | Hex | Intended use |
|-------|-----|----------------|
| **Primary** | `#6D5CE7` | Default primary buttons, active nav, key accents, selected focus |
| **Hover** | `#7E70EB` | Primary control hover state |
| **Pressed** | `#5846D6` | Primary control active/pressed state |

**Do not** use brand purple for mask fill on video (masks use semantic Mask color or user-chosen mask colors).

---

## Semantic

Semantic colors communicate **meaning** — especially on the timeline and in layer lists. They must stay consistent across locales and themes.

| Token | Hex | Intended use |
|-------|-----|----------------|
| **Mask** | `#7C6EE6` | Mask intervals, mask badges, mask-related icons and lane chrome |
| **Mute** | `#E8A23A` | Mute intervals, mute badges, audio-off indicators |
| **Skip** | `#79B54A` | Skip intervals, skip badges, jump/skip affordances |
| **Bookmark** | `#4FA4E8` | Session bookmarks, anchor markers, navigation highlights |
| **Warning** | `#E0A83A` | Non-blocking warnings (mismatch dialogs, soft alerts, caution banners) |
| **Danger** | `#D95C5C` | Destructive actions, critical errors, delete confirmations |

### Semantic usage rules

- **Timeline lanes:** Mask / Mute / Skip colors identify item type at a glance. Do not swap meanings.
- **Warning vs Danger:** Warning = user can proceed with care. Danger = irreversible or blocking harm.
- **Bookmark:** Distinct from Skip (green) and brand (purple) — used for session navigation, not track item types.
- Semantic colors on **text** should meet contrast requirements on Panel/Elevated surfaces (see Text section).

---

## Surfaces

Dark UI stack. Depth increases with elevation; borders separate regions without heavy shadows.

| Token | Hex | Intended use |
|-------|-----|----------------|
| **Background** | `#101114` | App shell, video surround, deepest canvas |
| **Panel** | `#17191E` | Sidebar, settings sections, standard panels |
| **Elevated** | `#1D2026` | Dialogs, dropdowns, popovers, collapsed rail hover |
| **Border** | `#2B2F38` | Panel edges, dividers, input outlines, timeline grid lines |

### Surface usage rules

- **Video stage** sits on Background; letterboxing/pillarboxing uses Background or near-black — never Panel.
- **Sidebar and timeline chrome** use Panel; modals use Elevated so they read above Panel.
- **Borders** are subtle separators — prefer 1px Border over heavy box-shadow for flat regions.
- Avoid pure `#000000` except behind video content where OLED black is intentional.

---

## Text

Three levels of copy hierarchy on dark surfaces.

| Token | Hex | Intended use |
|-------|-----|----------------|
| **Primary** | `#F3F4F6` | Headings, body copy, button labels, active list items |
| **Secondary** | `#A0A7B5` | Descriptions, section hints, secondary labels |
| **Muted** | `#6D7480` | Placeholders, disabled-adjacent copy, timestamps, metadata |

### Text usage rules

- **Primary** on Background/Panel for all essential reading.
- **Secondary** for supporting sentences (settings descriptions, dialog explanations).
- **Muted** for non-critical info (saved-with version, empty-state hints).
- Do not use Muted for warnings or errors — use Warning/Danger semantic colors with appropriate contrast.
- Timecodes and numeric scrub values may use Primary with `ltr-digits` styling in RTL locales (see TYPOGRAPHY.md).

---

## Composition examples

| UI region | Background | Text | Accent |
|-----------|------------|------|--------|
| Player workspace | Background | Primary on chrome | Brand for play/focus |
| Timeline mask lane | Panel + Mask tint on bars | Primary on labels | Mask on intervals |
| Import mismatch (critical) | Elevated | Primary + Warning/Danger for tier labels | Warning for caution copy |
| Primary CTA | Primary fill | Primary `#F3F4F6` on button | Hover/Pressed states |
| Empty state | Background | Secondary lead, Muted note | Brand on Open Video |

---

## Accessibility notes

- Target WCAG AA contrast for body text (Primary on Panel/Elevated).
- Do not rely on color alone for state — pair with icon, label, or pattern (e.g. disabled + `aria-disabled`).
- Semantic lane colors should remain distinguishable for common color-vision deficiencies; when redesigning (D2+), verify mask vs mute vs skip in grayscale.

---

## Related documents

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — consistency rules
- [TYPOGRAPHY.md](./TYPOGRAPHY.md) — type on colored surfaces
- [COMPONENTS.md](./COMPONENTS.md) — per-component color notes
