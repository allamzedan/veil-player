# VEIL Edit Mode Specification

**Phase D5 — documentation only.** Defines the ideal VEIL editing experience. No React, CSS, or implementation in this phase.

**Related:** [WATCH_MODE.md](./WATCH_MODE.md) · [PLAYER_REDESIGN.md](./PLAYER_REDESIGN.md) · [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) · [UX_PRINCIPLES.md](./UX_PRINCIPLES.md)

---

## Purpose

| Mode | Question it answers |
|------|---------------------|
| **Watch Mode** | How do I consume media? |
| **Edit Mode** | How do I create and manage tracks? |

Edit Mode is where users author `.veil.json` instructions — masks, mutes, skips, subtitle behavior, groups, and metadata — while still **watching** the source video for context.

Edit Mode is **not** a separate application screen. It is the same Player workspace with additional chrome, entered from [WATCH_MODE.md](./WATCH_MODE.md).

---

## Core principle

Edit Mode is still a **media application**.

| VEIL Edit Mode is | VEIL Edit Mode is not |
|-------------------|------------------------|
| Track authoring on top of playback | A non-linear video editor |
| Timing + visibility instructions | Premiere, Resolve, or a compositor |
| Video-centered with supporting tools | Timeline-as-hero with tiny preview |

**The video remains the primary focus.** Timeline and inspector support the picture — they do not replace it.

---

## Visual hierarchy

Priority order (highest emphasis first):

| Rank | Region | Role |
|------|--------|------|
| **1** | **Video** | Reference for mask placement, subtitle cover, skip points |
| **2** | **Timeline** | Temporal structure; selection syncs with inspector |
| **3** | **Inspector** | Properties for track or selected item |
| **4** | **Organization tools** | Groups, anchors, offset — contextual, not always visible |

**Rule:** Nothing should visually compete with the video. Timeline height is capped; inspector is a side panel, not a second main column wider than the stage.

---

## Layout

### Wireframe (desktop)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  VEIL Player          Family Safe              [ Family Safe ▾ ]  [ Done ]   │  TOP BAR
├──────────────────────────────────────────────────────────────┬─────────────┤
│                                                              │  INSPECTOR  │
│                                                              │             │
│                         VIDEO                                │  Track or   │
│                    (largest region)                          │  Item       │
│                                                              │  panel      │
│                                                              │             │
│                                                              │  (collapse) │
├──────────────────────────────────────────────────────────────┴─────────────┤
│  TIMELINE — masks · mutes · skips · playhead                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  ▶  ────────●────────────  0:42 / 1:47  🔊  1×  ⛶                          │  TRANSPORT
└──────────────────────────────────────────────────────────────────────────────┘
```

### Top bar

| Position | Element |
|----------|---------|
| **Left** | `VEIL Player` |
| **Center** | **Track name** (editable on click or via inspector) — e.g. `Family Safe` |
| **Right** | **Track chip** (same as Watch Mode) + **Exit Edit** (`Done` / `Watch` — returns to Watch Mode) |

No section rail with five vertical tabs in Edit Mode — navigation is **inspector-driven**.

### Center — video

- Same stage as Watch Mode but **reduced height** to fit timeline + inspector
- Masks draggable/resizable on video in Edit Mode
- Minimum video height target: **≥ 45%** of workspace on 1080p — never postage-stamp preview

### Bottom — timeline

- **Always visible** in Edit Mode (not user-toggled off while editing)
- Sits **above** transport or transport docks to timeline footer — single editing band
- See [Timeline](#timeline) below

### Right — inspector panel

- Fixed width: **280–360px** (document target: **320px**)
- **Collapsible** to icon strip or fully hidden for “wide video” focus — restores on selection
- Two modes: **Track overview** (nothing selected) vs **Item inspector** (item selected)
- Replaces today’s multi-section sidebar

### Transport in Edit Mode

- Watch transport minus **Edit** button (replaced by **Done** in top bar)
- No timeline show/hide toggle — timeline is implicit in Edit Mode
- Play/pause, seek, volume, speed, fullscreen remain for preview while editing

---

## Sidebar philosophy

### Current VEIL problem

Today the sidebar exposes **many independent sections** simultaneously (via rail + expand):

| Current section | Panel IDs (approx.) |
|-----------------|---------------------|
| Track | save/load, file controls |
| Create | add mask/mute/skip |
| Item | selected item editor |
| Subtitles | SRT import, modes |
| Layers | sortable layer list |
| Organization | groups, anchors, bookmarks, offset, motion |
| Track info / metadata | nested under Organization |

**Question:** Should they all exist simultaneously?

**Answer: No.**

Competing sections create “dashboard of panels” energy and split attention from video + timeline.

### Edit Mode exposure model

| Always in Edit Mode | Contextual only |
|---------------------|-----------------|
| **Track** (overview in inspector) | Create → `+ Add Action` |
| **Inspector** (item when selected) | Subtitles → Track tools menu |
| **Timeline** (bottom) | Groups → Track overview |
| | Layers → integrated into timeline |
| | Manual track builder → Track menu |
| | Anchors, offset, bookmarks → Advanced track tools |
| | Motion settings → Settings app-wide |

---

## Inspector

Single right panel. **No** separate “Selected item” sidebar section.

### When nothing selected — track summary

```
┌─────────────────────────┐
│  TRACK OVERVIEW         │
│                         │
│  Family Safe            │
│                         │
│  12 Masks               │
│  5 Mutes                │
│  2 Skips                │
│  3 Groups               │
│                         │
│  [ Save ] [ Export ]    │
│  [ Duplicate ]          │
│                         │
│  + Add Action ▾         │
│  Track Tools ▾          │
└─────────────────────────┘
```

| Field | Source |
|-------|--------|
| Track name | `trackMetadata.title` or filename |
| Counts | Live from store |
| Actions | Primary authoring buttons |

### When item selected — item inspector

| Section | Content |
|---------|---------|
| **Header** | Type badge (Mask / Mute / Skip) + label |
| **Timing** | Start, end, apply — always visible |
| **Style** | Mask color, opacity, presentation — masks only |
| **Advanced** | **Collapsed** `<details>`: fade ms, notes, lock, source |

**Rule:** Advanced collapsed by default — progressive disclosure per [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

Selecting an item on **timeline** or **video** (mask) opens item inspector. Clicking empty timeline/video chrome clears selection → track overview.

---

## Track overview

Dedicated **Track Overview** is the default inspector state (not a separate sidebar accordion).

### Example content

```
Family Safe

12 Masks
5 Mutes
2 Skips
```

### Buttons

| Button | Behavior |
|--------|----------|
| **Save** | Save `.veil.json` (Ctrl+S) |
| **Export** | Future explicit export flow; v1 may alias Save or export dialog |
| **Duplicate** | Save copy with new name / duplicate items to new track session |

### Track Tools menu (secondary)

Aggregates former sidebar silos:

| Menu item | Former home |
|-----------|-------------|
| Subtitles… | Subtitles panel |
| Groups… | Groups panel (lightweight manager) |
| Anchors… | Anchors panel |
| Offset & shift… | Offset panel |
| Session bookmarks… | Bookmarks panel |
| Manual track builder… | Menu dialog |
| Import SRT… | Subtitles |

Opens as **dialog or slide-over** — not a permanent sidebar section.

---

## Create actions

### Current

Dedicated **Create** sidebar section with three large buttons always visible.

### Question

Should create tools always be visible?

### Recommendation: **No**

Replace with **`+ Add Action`** on Track Overview (and optional timeline toolbar icon).

| Menu item | Shortcut | Behavior |
|-----------|----------|----------|
| **Mask** | `M` | Add at playhead |
| **Mute** | `U` | Add interval at playhead |
| **Skip** | `K` | Add interval at playhead |

Keeps inspector calm; creation is one click from overview, zero clicks when using shortcuts ([WATCH_MODE.md](./WATCH_MODE.md) auto-enters Edit).

---

## Timeline

### Visibility

**Always on** in Edit Mode. Hidden in Watch Mode.

### Expected size

| Metric | Recommendation |
|--------|----------------|
| **Height** | **120–160px** total chrome (lanes + ruler); **less than current VEIL** |
| **vs today** | Reduce vertical footprint ~25–35% vs full expanded timeline |
| **Lanes** | 3 fixed lanes (mask / mute / skip) or 2+1 collapse |
| **Min height** | Never below 100px — still usable for drag |

### Expected prominence

- **Secondary** to video — thinner than video block
- Strong playhead and selection; muted grid
- Semantic lane colors per [COLOR_SYSTEM.md](./COLOR_SYSTEM.md)
- **LTR always** — even in Arabic UI

### Expected controls

| Control | Placement |
|---------|-----------|
| Zoom in/out, fit, center playhead | Timeline header strip (compact) |
| Snap, snap to subtitles | Toggle chips in header |
| Set start/end at playhead (I/O) | Header or shortcuts only |
| Add at playhead | `+` dropdown or duplicate Add Action menu |

**Not in timeline header:** save track, subtitle import, groups manager — those live in Track Overview / Track Tools.

---

## Layer management

### Current

Separate **Layers** sidebar panel — sortable list duplicate of timeline information.

### Question

Can layers be integrated into timeline?

### Recommendation: **Yes**

| Approach | Detail |
|----------|--------|
| **Primary** | Timeline bars **are** the layer list for timing edits |
| **List UI** | Optional **compact list drawer** from timeline header (“List”) for label edit, enable, lock, delete — not a permanent sidebar |
| **Selection** | Click bar or list row → same inspector |

Eliminates parallel Layers + Timeline mental model. Layer list drawer is **optional overlay**, width ~240px, slides over inspector or from timeline edge.

---

## Groups

### Current

Dedicated **Groups** section under Organization.

### Question

Can Groups become Track Overview functionality?

### Recommendation: **Yes — summary in overview, detail in dialog**

| Surface | Groups UX |
|---------|-----------|
| **Track Overview** | Line count: `3 Groups` — click opens Groups dialog |
| **Groups dialog** | Create, assign, solo, colors — full current `TrackGroupsPanel` behavior |
| **Timeline** | Optional group tint on bars; filter by group in timeline header |

No permanent Groups sidebar section.

---

## Manual track builder

### Recommendation: **Track menu**, not persistent UI

| Entry | Location |
|-------|----------|
| File → Manual Track Builder | Menu (unchanged) |
| Track Tools → Manual track builder | Inspector menu |
| Home / no video | Allowed without video |

Never a pinned sidebar panel. Dialog-only workflow.

---

## Subtitles

### Recommendation: **Track Tools**, not permanent sidebar

| Entry | Location |
|-------|----------|
| Track Tools → Subtitles… | Opens subtitle dialog/sheet |
| Content | Mode (show / smart cover / region), import SRT, appearance link to Settings |
| Watch Mode | Subtitle toggle on transport only; full tools in Edit |

Subtitle **appearance** (font scale, opacity) stays in **Settings** — not duplicated in subtitle sheet.

---

## Mode transition

### Watch → Edit

| Aspect | Spec |
|--------|------|
| **Trigger** | Edit Track, `E`, `M`/`U`/`K`, Track chip → Create |
| **Animation** | 200ms max height/width ease; **instant** if reduce-motion |
| **Chrome in** | Timeline slides up; inspector slides in from right |
| **Video** | Shrinks smoothly — no playback interrupt |
| **State** | Preserve playhead, selection (if any), dirty flag |

### Edit → Watch

| Aspect | Spec |
|--------|------|
| **Trigger** | Done / Watch, `E`, Escape (no modal) |
| **Animation** | Reverse of enter |
| **Chrome out** | Timeline + inspector hidden |
| **Persistence** | Selection retained in memory but inspector closed; unsaved stays dirty |
| **Restoration** | Next `E` restores inspector to last state (overview vs same item selected) |

See [WATCH_MODE.md](./WATCH_MODE.md) for unsaved-on-exit policy.

---

## Power user workflow

### Ideal path

```
Open Video
    → Watch Mode (default)
Press E
    → Edit Mode
Add Mask (M or + Add Action)
    → Item selected; inspector shows timing
Adjust timing (drag timeline or inspector fields)
Save Track (Ctrl+S or Save in overview)
Exit Edit (Done or E)
    → Watch Mode
```

### Ideal click budget (from Edit entry)

| Step | Clicks / keys |
|------|----------------|
| Enter Edit | `E` (0 clicks) |
| Add mask | `M` (0 clicks) |
| Adjust timing | Drag (1 gesture) |
| Save | `Ctrl+S` (0 clicks) |
| Exit | `E` (0 clicks) |

**Target:** core loop ≤ **2 clicks** if not using keyboard (Edit → Add Action → Mask → Save → Done = 4 clicks max).

---

## Comparison: current VEIL vs proposed Edit Mode

| Area | Current VEIL | Proposed Edit Mode | Gain | Tradeoff |
|------|--------------|-------------------|------|----------|
| **Navigation** | 5-rail sections + nested org | Inspector + Track Tools menus | Less vertical scanning | Learn new menu locations |
| **Create** | Always-visible sidebar | `+ Add Action` | Calmer inspector | One extra click if no shortcut |
| **Layers** | Duplicate of timeline | Timeline-primary | Single source of truth | List lovers use drawer |
| **Groups** | Sidebar section | Overview + dialog | Cleaner default | Groups one click deeper |
| **Subtitles** | Permanent section | Track Tools dialog | More video space | Subtitle work is modal |
| **Timeline height** | Large | 120–160px | More video | Less lane detail visible |
| **Inspector** | “Selected item” only | Overview + item unified | Track context always | Panel must switch states well |
| **Video share** | ~50–60% with sidebar+timeline | Target ≥45% with inspector | Still media-first | Less than Watch Mode |
| **Mental model** | Multi-panel DAW | Player + track sheet | Not Premiere | Migration for existing users |

---

## Success criteria

A user can:

1. **Create a track** — open video, enter Edit, add mask/mute/skip, see it on timeline and video.
2. **Edit a track** — select item, change timing/style in inspector, drag on timeline.
3. **Save a track** — Save from overview or Ctrl+S, understand file is separate from video.

**Without feeling overwhelmed** — no wall of simultaneous sections; advanced tools behind Track Tools and collapsed Advanced.

### Qualitative test

- New user can name the **three item types** after 5 minutes in Edit Mode.
- User does not need to open more than **two surfaces** (inspector + timeline) for basic mask edit.
- User describes VEIL as “player where I can set up rules” — not “video editor.”

---

## Recommended final sidebar structure

**Edit Mode has no multi-section sidebar.** Replace with:

| Surface | Contents |
|---------|----------|
| **Inspector (right)** | Track Overview *or* Item inspector |
| **Timeline (bottom)** | Lanes, bars, playhead, compact header tools |
| **Track Tools (menu)** | Subtitles, Groups, Anchors, Offset, Bookmarks, Manual builder |
| **+ Add Action (menu)** | Mask, Mute, Skip |
| **Top bar** | Track name, chip, Done |
| **Optional: Layer list drawer** | From timeline — not default open |

**Watch Mode:** none of the above except chip + transport ([WATCH_MODE.md](./WATCH_MODE.md)).

### Mapping from current sections

| Current section | D5 home |
|-----------------|---------|
| Track (file controls) | Track Overview buttons + File menu |
| Create | `+ Add Action` |
| Selected item | Item inspector |
| Subtitles | Track Tools → Subtitles |
| Layers | Timeline (+ optional drawer) |
| Groups | Track Overview count + Track Tools |
| Track info / metadata | Track Overview (name, metadata fields) |
| Anchors, offset, bookmarks | Track Tools |
| Motion | Settings (global) |

---

## Open design questions

| # | Question |
|---|----------|
| 1 | Inspector left vs right for RTL? |
| 2 | Layer list drawer default open for power users? |
| 3 | Export vs Save distinction in v1? |
| 4 | Groups dialog vs slide-over sheet? |
| 5 | Timeline above or below transport? |
| 6 | Duplicate track behavior — new file or in-session copy? |
| 7 | Edit Mode remember inspector collapsed state? |

---

## Implementation note

**This document does not authorize code changes.** D6+ implements inspector panel, timeline resize, section removal, and Track Tools menus per this spec.
