# VEIL Component Specifications

**Phase D6 — documentation only.** Normative specs for visible UI components: purpose, size, states, and hierarchy. No React, CSS, or implementation in this phase.

**Related:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) · [COLOR_SYSTEM.md](./COLOR_SYSTEM.md) · [TYPOGRAPHY.md](./TYPOGRAPHY.md) · [WATCH_MODE.md](./WATCH_MODE.md) · [EDIT_MODE.md](./EDIT_MODE.md) · [HOME_REDESIGN.md](./HOME_REDESIGN.md) · [COMPONENTS.md](./COMPONENTS.md) (inventory)

---

## Purpose

Every visible UI element must have:

| Attribute | Meaning |
|-----------|---------|
| **Purpose** | Why it exists; what user job it serves |
| **Size** | Height, width, padding, type scale |
| **States** | Default, hover, pressed, disabled, focus, semantic variants |
| **Hierarchy** | Primary vs secondary vs tertiary within its surface |

The same component **looks and behaves consistently** everywhere. One Primary button in a footer; Track Chip always top-right in player modes; timeline bars always use semantic lane colors.

---

## Component hierarchy (global)

```
App Shell
├── Top Bar (brand, track name, track chip, mode actions)
├── Menu Bar (global — File, Edit, Playback, View, Help)
├── Main Region
│   ├── Home Hero / Empty States
│   ├── Player Stage (video + overlays)
│   ├── Timeline (Edit Mode only)
│   ├── Inspector (Edit Mode only)
│   └── Transport (Watch + Edit)
├── Dialogs / Sheets (modal layer)
├── Menus / Popovers (dropdown layer)
└── Toasts (ephemeral feedback layer)
```

**Z-order (low → high):** Background → Panel → Elevated → Popover → Modal → Toast

---

## 1. Buttons

Four **types** (plus **Compact** modifier for toolbars). All use 14px label ([TYPOGRAPHY.md](./TYPOGRAPHY.md)), medium (500) weight.

### Shared anatomy

| Property | Standard | Compact |
|----------|----------|---------|
| Height | **36px** | **32px** |
| Horizontal padding | **16px** (`space-4`) | **12px** (`space-3`) |
| Border radius | **8px** | **6px** |
| Min width | 64px (labeled) | 32px (icon-only) |
| Gap (icon + label) | **8px** | **6px** |

### Primary

| Aspect | Spec |
|--------|------|
| **Purpose** | Single main action per surface — commits user intent |
| **Hierarchy** | Highest emphasis in button group |
| **Examples** | Open Video, Save Track, Generate, Load track (confirm), Get started |
| **Fill** | `#6D5CE7` |
| **Label** | `#F3F4F6` |

| State | Appearance |
|-------|------------|
| **Default** | Primary fill, no border |
| **Hover** | `#7E70EB` |
| **Pressed** | `#5846D6` |
| **Disabled** | 40% opacity fill; `cursor: not-allowed` |
| **Focus-visible** | 2px ring `#7E70EB`, offset 2px |

**Rule:** Max **one** Primary per dialog footer or hero CTA row.

### Secondary

| Aspect | Spec |
|--------|------|
| **Purpose** | Common supporting actions — not the main commit |
| **Hierarchy** | Second emphasis |
| **Examples** | Load Track, Import Subtitles, Add Mask, View Release |
| **Fill** | Transparent or Panel `#17191E` |
| **Border** | 1px `#2B2F38` |
| **Label** | `#F3F4F6` |

| State | Appearance |
|-------|------------|
| **Default** | Panel fill + border |
| **Hover** | Elevated `#1D2026`, border unchanged |
| **Pressed** | Background `#101114` |
| **Disabled** | Muted label `#6D7480`, 50% border opacity |
| **Focus-visible** | 2px ring brand at 60% opacity |

### Ghost

| Aspect | Spec |
|--------|------|
| **Purpose** | Tertiary / dismissive — low visual weight |
| **Hierarchy** | Lowest button emphasis |
| **Examples** | Cancel, Dismiss, Remind Me Later, Done (optional ghost variant) |
| **Fill** | Transparent |
| **Label** | Secondary `#A0A7B5` → Primary on hover |

| State | Appearance |
|-------|------------|
| **Default** | No border; secondary text |
| **Hover** | Panel tint `#17191E` at 50% |
| **Pressed** | Panel `#17191E` |
| **Disabled** | Muted text only |
| **Focus-visible** | 2px ring |

### Danger

| Aspect | Spec |
|--------|------|
| **Purpose** | Irreversible or destructive actions |
| **Hierarchy** | Competes with Primary only in confirm dialogs — never two Primaries |
| **Examples** | Delete Track, Clear Track, Delete item |
| **Fill** | Transparent default; filled optional for confirm |
| **Label / accent** | `#D95C5C` |
| **Border** (outline variant) | `#D95C5C` at 50% |

| State | Appearance |
|-------|------------|
| **Default** | Danger text or outline |
| **Hover** | Danger fill at 15% opacity background |
| **Pressed** | Danger fill at 25% |
| **Disabled** | 40% opacity |
| **Focus-visible** | Danger ring |

**Destructive confirm pattern:** Ghost Cancel + Danger “Delete” (or Primary Danger fill only in small modals).

### Compact modifier

Applies to Primary / Secondary / Ghost in transport and timeline headers. Same state rules; reduced height/padding per table above.

---

## 2. Track Chip

Persistent **track status** control ([WATCH_MODE.md](./WATCH_MODE.md)). Same component in Watch and Edit modes.

### Purpose

Answer: *Is a track active? Which one? Is it modified?* — without opening editor.

### Size

| Property | Value |
|----------|-------|
| Height | **28–32px** (target **30px**) |
| Horizontal padding | **10–12px** |
| Border radius | **999px** (pill) or **6px** (rounded rect — pick one in D7; pill recommended) |
| Type | **13px** metadata / **14px** if title only |
| Max width | **200px** — truncate with ellipsis |

### Location

| Mode | Position |
|------|----------|
| Watch / Edit | Top bar **right** (left of Done in Edit Mode) |
| Fullscreen | Top-right; fades with transport |

### States

| State | Display | Surface |
|-------|---------|---------|
| **No Track** | `[ No Track ]` | Panel + muted text `#6D7480` |
| **Track Loaded** | `[ Family Safe ]` | Elevated `#1D2026`, Primary text |
| **Track Loaded + Modified** | `[ Family Safe ● ]` | Same + **dirty dot** `#E0A83A` (Warning) before/after label |
| **Track Disabled** | `[ Family Safe — Off ]` or strikethrough | Muted; layers not applied |
| **Track Enabled** | Normal loaded chip | Full opacity; playback applies track |

**Dirty indicator (`●`):**

- 6px circle, Warning `#E0A83A`
- Shown when `isTrackDirty === true`
- Hidden in No Track / Disabled
- Tooltip: “Unsaved changes” (i18n)
- Does **not** block Watch Mode exit

### Menu items

**When track loaded** ([WATCH_MODE.md](./WATCH_MODE.md)):

| Item | Type |
|------|------|
| Enable Track | Toggle (if disabled) |
| Disable Track | Toggle |
| Replace Track… | Action |
| Remove Track… | Danger submenu or confirm |
| Track Info… | Opens dialog |
| — | Divider |
| Share Track | Disabled / “Coming later” |

**When no track:**

| Item |
|------|
| Load Track… |
| Create Track |
| Import Track… |

### Interaction

- Click / Enter / Space → menu
- `aria-haspopup="menu"`
- Menu: see [Menus § Track Chip Menu](#7-menus)

---

## 3. Inspector Panel

Right panel in **Edit Mode** ([EDIT_MODE.md](./EDIT_MODE.md)). Replaces multi-section sidebar.

### Purpose

Single place for **track overview** or **selected item** properties.

### Width

| State | Width |
|-------|-------|
| **Expanded** | **320px** (range 280–360px) |
| **Collapsed** | **0px** (hidden) or **40px** icon rail (optional D7) |

### States

| State | Content |
|-------|-----------|
| **Track Overview** | Name, counts, Save/Export/Duplicate, + Add Action, Track Tools entry |
| **Item Selected** | Type badge, timing, style (mask), Advanced collapsed |
| **Collapsed** | Panel off; video expands; selection retained |

### Collapse behavior

- Toggle: chevron in inspector header or View → Inspector
- Keyboard: optional `]` / `[`
- Persist per session optional
- Reduce-motion: instant width change

### Content priority (top → bottom)

**Track Overview:**

1. Track name (editable)
2. Counts (masks, mutes, skips, groups)
3. Primary actions (Save)
4. Secondary row (Export, Duplicate)
5. + Add Action
6. Track Tools link/menu

**Item Selected:**

1. Type + label
2. Timing (always visible)
3. Style (masks)
4. Advanced `<details>` (fade, notes, lock)

### Surface

- Background: Panel `#17191E`
- Border left: 1px `#2B2F38`
- Padding: `space-4` (16px)
- Section gaps: `space-5` (20px)

---

## 4. Dialogs

Modal layer on Elevated `#1D2026`. Focus trap; Escape closes when safe.

### Shared structure

```
┌─────────────────────────────────────┐
│  HEADER — title 20px, close (ghost) │
├─────────────────────────────────────┤
│  BODY — scrollable, padding 24px      │
├─────────────────────────────────────┤
│  FOOTER — right-aligned buttons     │
└─────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| **Max width** | **480px** (standard), **640px** (wide: Manual Builder, Load Track with mismatch), **360px** (confirm) |
| **Max height** | 85vh body scroll |
| **Border radius** | 12px |
| **Border** | 1px `#2B2F38` |
| **Backdrop** | `#101114` at 60% opacity |

### Header

- Title: **20px** semibold, Primary text
- Close: Ghost icon button 32px, top-right
- No subtitle in header — subtitle in body

### Footer

| Pattern | Buttons |
|---------|---------|
| **Confirm** | Ghost Cancel + Primary action |
| **Destructive** | Ghost Cancel + Danger |
| **Info only** | Ghost Close or Primary OK |
| **Button order** | Cancel left, commit right (LTR) |

### Per-dialog notes

| Dialog | Max width | Primary | Secondary / Ghost |
|--------|-----------|---------|-------------------|
| **Load Track** | 640px | Load track / Load with offset | Cancel |
| **Settings** | 480px | — (instant apply) | Close |
| **Update Available** | 480px | View Release (Secondary) | Remind Me Later (Ghost) |
| **Manual Builder** | 640px | Import / Save file | Cancel, Clear form (Ghost) |
| **Unsaved changes** | 360px | Save (Primary) or Discard | Cancel (Ghost) |
| **About** | 480px | Close | — |

---

## 5. Empty States

Used in Home, inspector sub-views, and lists with no data.

### Structure (required order)

1. **Icon** — 48–64px, muted or brand accent; optional illustration
2. **Title** — 16–20px semibold
3. **Description** — 14px secondary, max 2 lines
4. **Primary action** — one Primary button OR text link for secondary

Padding: `space-8` vertical; center-aligned in container.

### Examples

| Context | Icon | Title | Description | Primary |
|---------|------|-------|-------------|---------|
| **No Video** | VEIL logo 64px | No video loaded | Open a local video to watch with intelligent visibility. | Open Video |
| **No Track** | Track file outline | No track loaded | Add hide, mute, and skip rules in a separate file. | Create Track (Edit) or Load Track |
| **No Subtitles** | CC off | No subtitles | Import an SRT file to enable subtitle modes. | Import Subtitles |
| **No Groups** | Folder | No groups | Organize items into groups from Track Tools. | — (link to Track Tools) |

**No Track** in inspector overview: inline empty block, not full-page.

Secondary actions: Ghost links below Primary — never equal weight.

---

## 6. Timeline Components

Edit Mode only. **LTR always** ([Accessibility](#11-accessibility)).

### Container

| Property | Value |
|----------|-------|
| Total height | **120–160px** (target **140px**) |
| Background | Panel `#17191E` |
| Top border | 1px `#2B2F38` |

### Lanes

| Lane | Label | Lane header height |
|------|-------|-------------------|
| Masks | “Masks” 12px muted | 20px |
| Mutes | “Mutes” | 20px |
| Skips | “Skips” | 20px |

Lane body: **28px** min bar height + **4px** vertical gap.

### Timeline Bar (base)

| Property | Value |
|----------|-------|
| Min height | **24px** |
| Border radius | **4px** |
| Border | 1px darker shade of fill |

### Mask Bar

| Property | Value |
|----------|-------|
| Fill | `#7C6EE6` at 85% opacity |
| Selected | 100% opacity + 2px `#F3F4F6` outline |
| Disabled | 40% opacity |
| Locked | Diagonal hatch overlay (optional) |
| Hover | +10% brightness |
| Label | 12px on bar if width > 80px |

### Mute Bar

| Property | Value |
|----------|-------|
| Fill | `#E8A23A` at 85% |
| States | Same as mask bar |

### Skip Bar

| Property | Value |
|----------|-------|
| Fill | `#79B54A` at 85% |
| States | Same as mask bar |

### Playhead

| Property | Value |
|----------|-------|
| Width | **2px** |
| Color | `#F3F4F6` |
| Handle | 8×12px rounded top (optional) |
| Z-index | Above bars |

### Selection

- Selected bar: white outline + inspector sync
- Multi-select: future — single select v1
- Keyboard: arrows nudge per [EDIT_MODE.md](./EDIT_MODE.md)

### Resize handles

- 6px wide hit targets at bar start/end
- `cursor: ew-resize`
- Hover: handle brightens

---

## 7. Menus

Dropdown on Elevated surface. Padding `space-2`; item height **36px**.

### Shared item anatomy

| Element | Spec |
|---------|------|
| Icon slot | 16px, left, `space-3` from label |
| Label | 14px Primary |
| Shortcut | 12px Muted, right-aligned |
| Divider | 1px `#2B2F38`, margin `space-2` vertical |
| Danger item | Danger text color |

### Track Chip Menu

- Width: min **200px**, max **280px**
- Grouping: toggles → actions → danger → future
- Icons: optional; text-first

### Add Action Menu

- Trigger: `+ Add Action` button (Secondary) or timeline `+`
- Items: Mask, Mute, Skip — with shortcuts M, U, K
- No divider needed (3 items)

### Track Tools Menu

- Trigger: “Track Tools” Secondary or Ghost in inspector
- Grouping:
  - **Authoring:** Subtitles…, Manual track builder…
  - **Organization:** Groups…, Anchors…
  - **Timing:** Offset & shift…, Session bookmarks…

### Context Menus

- Right-click timeline bar, layer row, mask on video
- Items: Edit, Duplicate, Delete, Enable/Disable, Lock
- Max width 240px
- Same spacing as dropdown menus

---

## 8. Toasts

Bottom-right stack (LTR); bottom-left in RTL shell. Max **3** visible.

### Anatomy

| Property | Value |
|----------|-------|
| Min width | 280px |
| Max width | 400px |
| Padding | 12px 16px |
| Radius | 8px |
| Surface | Elevated + left **3px** accent stripe |

### Variants

| Type | Stripe / accent | Icon | Examples |
|------|-----------------|------|----------|
| **Success** | `#79B54A` | Check | Track Saved, Track Loaded, Up to date |
| **Warning** | `#E0A83A` | Alert | Large track warning, mismatch proceed |
| **Error** | `#D95C5C` | X | Import Failed, Load Failed |
| **Info** | `#6D5CE7` | Info | Smart cover hint, Update Available (optional) |

### Behavior

- Auto-dismiss: **5s** (success/info), **8s** (warning/error)
- Pause on hover
- Dismiss: Ghost × 32px
- `aria-live="polite"` (assertive for errors)

---

## 9. Cards

Future-proof for Home, Recents, Community Tracks, Track Browser ([HOME_REDESIGN.md](./HOME_REDESIGN.md)).

### Purpose

Scannable row/tile for **video or track** recall — not editing.

### Size

| Variant | Height | Padding |
|---------|--------|---------|
| **List row** | 44–48px | 12px 16px |
| **Tile** (future) | 120px min | 16px |

### Elevation

- Default: Panel `#17191E`, 1px Border
- Hover: Elevated `#1D2026`
- Selected: 1px Primary border `#6D5CE7`

### Content layout (list row)

```
[ 16px icon ]  Title 14px Primary     [ chevron optional ]
               Meta 13px Muted
```

- **Recent video:** film icon, filename/title, last opened muted
- **Recent track:** track icon, track name, item count muted
- **Community track (future):** + author/source muted

Spacing between cards: `space-2` (8px). Section title above list: 16px semibold + `space-4` margin bottom.

---

## 10. Motion

Respect `reduce motion` — all durations → **0ms** when pref set.

### Duration tokens

| Token | ms | Use |
|-------|-----|-----|
| **Fast** | 150 | Hover fades, toast enter, menu open |
| **Normal** | 200 | Watch ↔ Edit chrome, inspector collapse |
| **Slow** | 250 | Dialog enter, fullscreen transport hide |

### Easing

- Default: `ease-out` enter, `ease-in` exit
- No bounce, no spring

### Allowed

| Type | Use |
|------|-----|
| **Fade** | Toasts, transport idle, tooltips |
| **Slide** | Inspector, timeline show, menus |
| **Scale** | Dialog enter 98%→100% only |

### Avoid

- Complex animations (parallax, blur transitions)
- Looping decorative motion
- Long (>300ms) transitions on video resize

---

## 11. Accessibility

### Focus rings

- All interactive: **2px** ring, offset **2px**
- Color: `#7E70EB` (brand hover) on dark surfaces
- Danger controls: danger ring
- Never `outline: none` without replacement

### Contrast

- Body text Primary on Panel: **≥ 4.5:1**
- Muted text: decorative only — not sole state indicator
- Timeline bars: distinguish type by **pattern + label**, not color alone

### Keyboard navigation

- Tab order: top bar → main → transport → dialogs when open
- Menus: arrows, Enter, Escape
- Timeline: arrows nudge selection; I/O set in/out
- Shortcuts documented in Help; no conflicts in inputs

### RTL rules

- Shell, inspector side, toast corner: **mirror** in Arabic
- **Exception:** timeline, seekbar, time readouts, numeric inputs → **LTR** always (`.ltr-digits`)

### LTR timeline rule

**Normative:** Timeline ruler, playhead, bar drag, and time labels are **always LTR** regardless of `document.dir`. Document in i18n QA checklist.

---

## Appendix: Current → target mapping

| Current component | Target spec |
|-------------------|-------------|
| `.btn` / `.btn-primary` | Primary |
| `.btn-secondary` | Secondary |
| `.btn-ghost` | Ghost |
| (ad hoc red delete) | Danger |
| `TrackSidebar` sections | Inspector + menus |
| `TrackSidebarRail` | Remove (Watch); no rail in Edit |
| `CollapsiblePanel` × N | Inspector sections + dialogs |
| `LayerList` | Timeline + optional drawer |
| `StatusBar` | Track chip + optional setting |

---

## Implementation note

**This document does not authorize code changes.** D7 implements CSS tokens and React components against these specs.
