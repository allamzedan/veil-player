# VEIL Player Experience Redesign

**Phase D2 — documentation only.** Defines the ideal playback experience on paper. No React, CSS, or screen implementation in this phase.

**Related:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) · [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) · [LAYOUTS.md](./LAYOUTS.md)

---

## Purpose

Define the ideal VEIL **playback** experience.

### Central question

**What should the user see while WATCHING?**

Not while editing. Not while building a track. Not while configuring groups.

Watching means: the picture is primary, controls are minimal, and visibility layers (masks, subtitle cover, skips) do their job without the user thinking about timelines or layer lists.

---

## Current problem

Today VEIL often feels like:

| Current perception | Why |
|------------------|-----|
| **Timeline editor** | Timeline and lane chrome are one toggle away from always-on; editing affordances sit beside transport. |
| **Track editor** | Expanded sidebar exposes Create, Selected item, Layers, Subtitles, Organization — even when the user only wants to watch. |
| **Utility application** | Dense panels, status bar, menu depth, and technical copy dominate before the emotional “I’m watching something” moment. |

### Target perception

VEIL should feel like:

| Target perception | Why |
|-------------------|-----|
| **Premium media player** | Calm stage, confident transport, subtle branding — comparable to a focused streaming or local player. |
| **With optional editing powers** | Depth exists for authors; it is invited, not imposed. |

**Player first. Editor second.**

---

## Design principle: Watch Mode by default

### Default experience = **Watch Mode**

Editing tools **disappear until requested**.

| Mode | User intent | Chrome |
|------|-------------|--------|
| **Watch Mode** | Consume media with VEIL visibility rules applied | Video + minimal transport + track chip |
| **Edit Mode** | Adjust timing, layers, subtitles, groups | Video + timeline + sidebar + inspector |

Watch Mode is the **landing state** after opening a video. Edit Mode is an **explicit opt-in** — never the accidental default.

This aligns with [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) § Video First and [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) § Progressive Disclosure, but goes further: Tier 3 controls are **mode-gated**, not merely collapsed.

---

## Screen layout (Watch Mode)

Ideal layout when a video is loaded and the user is watching.

```
┌─────────────────────────────────────────────────────────────────┐
│  VEIL Player                              [ Family Safe.veil ▾ ] │  ← Top bar (compact)
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│                         VIDEO                                   │
│                    (maximum area)                               │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ▶   ─────────●────────────────────────────   🔊   ⛶   [ E ]   │  ← Bottom transport
│       seek                         time      vol  full  edit    │
└─────────────────────────────────────────────────────────────────┘
```

### Top

| Element | Role |
|---------|------|
| **Product mark** | “VEIL Player” — small, left; brand recognition without marketing hero |
| **Track indicator** | Compact chip on the right (see Track Indicator below) |

No menu clutter in the top bar during Watch Mode if menu bar can stay one row globally; track chip is the **session status** affordance.

### Center

**VIDEO** — sole hero. Letterboxing on `#101114` Background ([COLOR_SYSTEM.md](./COLOR_SYSTEM.md)). Masks and subtitle cover render on the picture; no adjacent editing panels.

### Bottom

**Playback controls** — single horizontal strip.

| Control | Required in Watch Mode |
|---------|------------------------|
| Play / Pause | Yes |
| Seek | Yes (scrub + optional time readout) |
| Volume | Yes |
| Fullscreen | Yes |

**Optional in strip (Tier 2):** subtitle peek hint, playback speed (compact), **Edit** entry (button or `E`).

### What is NOT visible in Watch Mode

- Timeline (lanes, playhead ruler, zoom tools)
- Sidebar (Create, Layers, Selected item, Groups, Anchors)
- Layer list, property editors, offset/shift panels
- Status bar (optional — hide by default in Watch Mode or reduce to zero)

### Optional: secondary track chips

If multiple tracks could be loaded in future, chips might show active track only; multi-track is out of scope for first implementation — document as:

- `Family Safe.veil`
- `Subtitle Learning.veil`

For v1 redesign: **one active track chip**; “Replace” opens load flow.

---

## Track indicator

### Concept: compact **track chip**

Always visible in Watch Mode (when video is loaded). Very small. Communicates **what visibility recipe is active**, not editor state.

| Example chip | Meaning |
|--------------|---------|
| `[ Family Safe ]` | Track loaded; title from `trackMetadata.title` or filename stem |
| `[ Language Learning ]` | Descriptive track name |
| `[ No Track ]` | Video open; no `.veil.json` applied (playback without VEIL layers) |

### Visual spec (documentation level)

- Height: ~28–32px (compact; 12–13px caption/metadata type per [TYPOGRAPHY.md](./TYPOGRAPHY.md))
- Surface: Elevated or Panel with Border
- No lane colors or MASK/MUTE badges on the chip — those are Edit Mode vocabulary

### Interaction: click chip → track actions menu

| Action | Behavior |
|--------|----------|
| **Enable** | Apply loaded track to playback (if disabled) |
| **Disable** | Temporarily turn off track layers; video keeps playing |
| **Replace** | Open load track flow; on success, swap active track |
| **Remove** | Clear track from session; confirm if dirty |

Save track remains in **File menu** and Edit Mode — not required on the chip for Watch Mode calmness. Power users: Ctrl+S unchanged.

### States

| State | Chip display |
|-------|----------------|
| No track | `No Track` — muted style |
| Track loaded, clean | Title or filename |
| Track loaded, unsaved | Title + subtle dot or “unsaved” metadata (avoid alarm unless dirty) |
| Track disabled | Strikethrough or “Off” suffix |

---

## Timeline visibility

### Proposal

| Mode | Timeline |
|------|----------|
| **Watch Mode** | **Hidden** |
| **Edit Mode** | **Visible** (below video or docked; LTR always) |

User should **not** see the editor all the time.

### Pros

- Immediate “player not editor” feel
- More vertical space for video on laptops
- Reduces accidental scrub on timeline bars vs seek bar
- Clear mental model: timeline = editing time

### Cons

- Users who today live in timeline must learn mode switch
- Jump-to-interval without timeline requires shortcuts or layer list in Edit Mode
- Regression risk if mode forgets timeline visibility preference per session

### Mitigation

- Remember last mode per session (optional)
- Edit Mode restores previous timeline zoom/scroll
- Keyboard: `E` toggles mode; timeline-only shortcut (`T`?) only in Edit Mode
- Menu: View → Show Timeline only enabled in Edit Mode (or forces Edit Mode)

### Relation to current app

Today: timeline visibility is an **independent toggle** (`timelineVisible`), often on while watching. Redesign: timeline visibility is **coupled to Edit Mode** by default, with optional “pin timeline in Watch Mode” as advanced setting (off by default).

---

## Sidebar visibility

### Proposal

| Mode | Sidebar |
|------|---------|
| **Watch Mode** | **Hidden** (no rail required for watching; optional minimal rail is a D3 decision) |
| **Edit Mode** | **Visible** (expanded or collapsed rail per current patterns) |

### Entering Edit Mode

| Affordance | Notes |
|------------|-------|
| **Edit Track** button | In bottom transport (Tier 2/3 boundary); label clear: “Edit track” not “Sidebar” |
| **`E` shortcut** | Toggles Watch ↔ Edit; documented in Help |
| **Menu** | View → Edit Track (enters Edit Mode + sidebar) |

### Exiting Edit Mode

| Affordance | Notes |
|------------|-------|
| **Done** / **Watch** button | Same region as Edit — returns to Watch Mode |
| **`E` shortcut** | Toggle |
| **Escape** | If no modal open, exit Edit Mode (not fullscreen — separate) |

### Pros

- Maximum video width in Watch Mode
- Sidebar sections (Create, Layers, etc.) read as “studio” tools
- Collapsed rail in Watch Mode can be removed entirely — fewer vertical segments

### Cons

- Quick “add mask at playhead” needs Edit Mode or global shortcut (`M`) that **enters Edit Mode** then adds
- Users may not discover Edit entry
- RTL sidebar behavior must be re-tested when mode-gated

### Mitigation

- First-run or one-time coach mark: “Press E to edit your track”
- Global shortcuts for add mask/mute/skip **implicitly enter Edit Mode** and focus timeline/sidebar section

---

## Mode transition

### Flow (same window, same screen)

```
Watch Mode
    │
    │  User clicks "Edit Track" or presses E
    │  (optional: brief layout animation, 200ms max)
    ▼
Edit Mode
    │  Timeline animates in (height ~180–240px min)
    │  Sidebar animates in (width per design system)
    │
    │  User clicks "Done" / "Watch" or presses E
    ▼
Watch Mode
    │  Timeline + sidebar hide
    │  Video expands to reclaimed space
    ▼
(continue watching)
```

### Rules

- **No new window** — not a separate “Studio app”
- **No route change required** — mode is UI state on Player layout ([LAYOUTS.md](./LAYOUTS.md) Player)
- **Playback continues** — playhead does not reset; audio/video uninterrupted
- **Selection persists** — selected item in Edit Mode still selected when returning (but inspector hidden in Watch)
- **Fullscreen** — Watch Mode fullscreen stays minimal; Edit in fullscreen uses overlay drawer pattern (existing fullscreen overlay is a reference, not spec)

### Animation

- Respect `reduce motion` — instant toggle when pref set
- Calm: opacity + height, not flashy transitions

---

## Control hierarchy

Three tiers. **Tier 3 only in Edit Mode** (or Edit-triggering shortcuts).

### Tier 1 — Always (Watch + Edit)

| Control | Placement |
|---------|-----------|
| Play / Pause | Bottom transport |
| Seek | Bottom transport |
| Volume | Bottom transport |
| Fullscreen | Bottom transport |

### Tier 2 — Watch Mode visible; expanded in Edit

| Control | Placement |
|---------|-----------|
| **Track chip** | Top right |
| **Subtitles** | Menu + optional compact toggle (mode, peek hint) |
| **Playback speed** | Transport menu or compact control |

### Tier 3 — Edit Mode only

| Control | Placement |
|---------|-----------|
| **Timeline** | Below video |
| **Layers** | Sidebar section |
| **Properties** | Sidebar Selected item |
| **Groups** | Sidebar Organization |
| Anchors, offset/shift, manual builder | Sidebar / dialogs |

### Menu bar (global)

File, Edit, Playback, View, Help remain — but **View** defaults should not expose timeline/sidebar in Watch Mode as “on.”

---

## Empty state

### Current gap

Empty state today includes technical body copy and **Load Track** beside Open Video — appropriate for authors, heavy for first-time viewers.

### Desired: **No Video Loaded**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                      [ VEIL logo ]                              │
│                                                                 │
│                   No video loaded                               │
│                                                                 │
│     Open a local video to watch with intelligent               │
│     visibility — subtitles, masks, and skips when you           │
│     need them. Your file is never modified.                     │
│                                                                 │
│                    [ Open Video ]                               │
│                                                                 │
│              Load track · Settings · Help  (text links)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Requirements

| Requirement | Detail |
|-------------|--------|
| **Large logo** | Hero mark from `src/assets/veil-logo.png` — emotional entry |
| **Simple explanation** | One short paragraph; non-destructive promise |
| **Primary CTA** | **Open Video** only as filled button |
| **No technical controls** | No timeline, sidebar, transport, seek, or layer UI |
| **Secondary actions** | Load track, settings, help as links or ghost buttons — not equal weight to Open |

Sidebar on empty workspace today should **not** render** in redesign — empty = lobby only.

Startup screen (2.5s) may remain; should match empty state tone.

---

## Goals (reader outcomes)

After reading this document, someone should understand:

1. **What VEIL feels like** — premium local player with invisible-until-needed intelligence.
2. **What Watch Mode feels like** — video, transport, track chip; no editor chrome.
3. **What Edit Mode feels like** — same video, timeline + sidebar + properties for authors.
4. **Why VEIL is player-first** — default mode optimizes watching; editing is explicit, reversible, and spatially separated.

---

## Mapping to design system

| D1 principle | D2 player redesign |
|--------------|-------------------|
| Video first | Watch Mode maximizes stage |
| Progressive disclosure | Tier 3 mode-gated |
| Tracks are assets | Track chip surfaces active asset without editor |
| Non-destructive | Empty state + chip copy reinforce separate track file |
| Calm interface | Hidden timeline/sidebar in Watch Mode |

---

## Open questions (for D3)

| Question | Options |
|----------|---------|
| Collapsed rail in Watch Mode? | None vs ultra-thin “E” tab |
| Status bar in Watch Mode? | Hidden vs minimal (time only) |
| Subtitle controls in Watch Mode? | Menu-only vs peek hint chip |
| Enter Edit on add-mask shortcut? | Auto-enter vs prompt |
| Unsaved on exit Edit? | Same guard as today |

---

## Implementation note

**This document does not authorize code changes.** D3+ may implement mode state, layout CSS, and component visibility per this spec.
