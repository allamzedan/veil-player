# VEIL Watch Mode Specification

**Phase D4 — documentation only.** Defines the exact experience of watching a video in VEIL. No React, CSS, or implementation in this phase.

**Related:** [PLAYER_REDESIGN.md](./PLAYER_REDESIGN.md) · [HOME_REDESIGN.md](./HOME_REDESIGN.md) · [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) · [UX_PRINCIPLES.md](./UX_PRINCIPLES.md)

---

## Problem

Current VEIL still exposes too much **editor chrome** when the user only wants to watch.

| Today | User perception |
|-------|-----------------|
| Collapsed sidebar rail (5 sections) | Editor is always one click away |
| Timeline toggle in transport | Timeline is a peer of play/pause |
| View menu: show sidebar / timeline | Chrome is opt-out, not opt-in |
| Status bar (layer count, dirty state) | Utility app, not cinema |
| Fullscreen overlay with edit drawer | Editing vocabulary in immersion |

VEIL should feel like a **premium media player**, not a **video editor**.

---

## Definition

| Term | Meaning |
|------|---------|
| **Watch Mode** | Default state whenever a video is open and playback is the primary intent. |
| **Edit Mode** | Explicit opt-in for timing, layers, timeline, and track authoring. |

**Rule:** Opening a video **always** lands in Watch Mode. The user enters Edit Mode **intentionally** — never by accident from a default layout.

Watch Mode is the contract for “what VEIL feels like” to a viewer, parent, or language learner who may never edit.

---

## Core principle

When watching, the user should **mostly** see:

1. **Video**
2. **Playback controls**
3. **Track status** (compact chip)

**Nothing else** in the main workspace.

Menus (File, Help) may exist globally but must not compete with the picture. Tier 3 tools (timeline, layers, properties) are **absent**, not merely collapsed.

---

## Layout

### Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  VEIL Player                              [ Family Safe      ▾ ]   │  TOP BAR
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│                            VIDEO                                 │
│                     (maximum viewport)                           │
│                                                                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  ▶  ────────●────────────────  0:42 / 1:47  🔊  1×  CC?  ⛶  ✎  │  BOTTOM
└──────────────────────────────────────────────────────────────────┘
```

Global **menu bar** (File · Playback · View · Help) may sit above top bar per platform — unchanged in scope, but View items that show timeline/sidebar should be **disabled or Edit-gated** in Watch Mode.

---

### Top bar

| Position | Element | Spec |
|----------|---------|------|
| **Left** | `VEIL Player` | Text or small wordmark; 14–16px; Secondary color acceptable |
| **Right** | **Track chip** | Always visible when video is loaded |

#### Track chip — always on

| Requirement | Detail |
|-------------|--------|
| **Visibility** | Always shown in Watch Mode (video open) |
| **Size** | Small, non-intrusive — target height 28–32px |
| **Content** | Human-readable track name or `No Track` |
| **Style** | Elevated/Panel surface, rounded, no MASK/MUTE lane colors |
| **Interaction** | Click / Enter opens track menu (see Track Chip Menu) |

**Examples:**

- `[ Family Safe ]`
- `[ Language Learning ]`
- `[ No Track ]`

Filename stem is fallback when `trackMetadata.title` is empty (e.g. `Family Safe` from `Family Safe.veil.json`).

#### Track presence (feel)

Tracks must feel **important but not distracting**:

- Chip is the **only** persistent track affordance in Watch Mode
- Active track applies masks/mutes/skips/subtitle cover **silently** during playback
- Unsaved state: subtle dot or “unsaved” in chip metadata — not a banner
- User always knows **whether a track is active** without reading the sidebar

---

### Video area

| Rule | Detail |
|------|--------|
| **Maximum space** | Video uses all area between top bar and bottom controls |
| **No sidebar** | Zero width — no collapsed rail, no expand tab |
| **No timeline** | No lanes, ruler, or playhead chrome |
| **No layer panels** | No layer list, no selected-item inspector |
| **No track editor** | No Create / Offset / Groups in workspace |

**Overlays on video (allowed):**

- Mask rectangles (playback-time)
- Subtitle cover / smart cover behavior
- Brief playback HUD (Peek, Reveal, Replay) — ephemeral, not panels
- Optional: auto-hiding cursor in fullscreen

Letterbox/pillarbox: Background `#101114` ([COLOR_SYSTEM.md](./COLOR_SYSTEM.md)).

---

### Bottom controls

Single **transport strip** — calm, cinematic, one row on desktop.

#### Required (visible)

| Control | Behavior |
|---------|----------|
| **Play / Pause** | Primary transport; Space toggles |
| **Seekbar** | Scrub playhead; click/drag on track |
| **Current time** | Elapsed; LTR digits |
| **Duration** | Total; format `current / duration` or adjacent |
| **Volume** | Mute toggle + slider (or popover); system volume not replaced |
| **Playback speed** | Compact selector (e.g. 0.75×–2×); menu or stepped control |
| **Fullscreen** | Enter/exit in-app fullscreen |

#### Optional (visible or on overflow menu)

| Control | Notes |
|---------|-------|
| **Subtitle toggle** | Show/hide subtitle text layer when cues exist; does not open full Subtitles panel |
| **Edit Track** | Enters Edit Mode (`E`); ghost or icon+label at strip end |

#### Not in Watch Mode transport

- Timeline show/hide button (removed — timeline is Edit Mode only)
- Add mask/mute/skip buttons (Edit Mode or shortcuts only)
- Undo/redo

#### Overflow (`⋯`) on narrow widths

Priority drop order: playback speed → subtitle toggle → keep play/seek/time/volume/fullscreen.

---

## Track chip menu

**Trigger:** click chip or keyboard shortcut (future: `T` for track menu — open question).

| Action | Behavior |
|--------|----------|
| **Enable Track** | Re-apply disabled track layers to playback |
| **Disable Track** | Temporarily turn off all track items; video keeps playing |
| **Replace Track** | Open load flow; on success swap active track |
| **Remove Track** | Clear track from session; confirm if dirty |
| **Track Info** | Lightweight dialog: title, item counts, schema version, source app — not full editor |

**Future (document only):** Share Track — menu row reserved, disabled or hidden until product exists.

**Not in chip menu (Watch Mode):** Save Track — remains File → Save Track and Ctrl+S (authors in Edit Mode).

---

## No track state

When video is open but **no** `.veil.json` is loaded:

| UI | Value |
|----|-------|
| Chip label | `[ No Track ]` |
| Chip style | Muted text; same size as loaded state |

### Chip menu (no track)

| Action | Behavior |
|--------|----------|
| **Load Track** | Native/file picker load flow |
| **Create Track** | Enter Edit Mode + focus Create (or start empty track in session) |
| **Import Track** | Same as Load Track for v1; alias for clarity in menu copy |

Playback works normally without a track — no masks/skips until user loads or creates.

---

## Entering Edit Mode

### Explicit methods

| Method | UX |
|--------|-----|
| **Edit Track button** | In bottom transport (or top bar overflow); label “Edit track” |
| **Keyboard `E`** | Toggle Watch ↔ Edit |
| **Menu** | View → Edit Track (enters Edit Mode) |

### Track-creation shortcuts

| Shortcut | Current app | D4 recommendation |
|----------|-------------|-------------------|
| `M` add mask | Works globally | **Auto-enter Edit Mode**, then add mask at playhead |
| `U` add mute | Same | **Auto-enter Edit Mode**, then add mute |
| `K` add skip | Same | **Auto-enter Edit Mode**, then add skip |

**Rationale:** Power users keep one-keystroke create; Watch Mode stays clean because chrome appears **after** intent is clear. Alternative (not recommended): block shortcuts in Watch Mode and show toast “Press E to edit” — adds friction.

### Side effects of entering Edit Mode

- Timeline becomes visible (default height per [PLAYER_REDESIGN.md](./PLAYER_REDESIGN.md))
- Sidebar becomes visible (expanded or rail per D5 layout spec)
- Video area shrinks — animation optional, instant if reduce-motion
- Playback **continues**; playhead unchanged
- Focus moves to sensible target (timeline or last sidebar section)

---

## Exiting Edit Mode

### Methods

| Method | Behavior |
|--------|----------|
| **Done / Watch** button | Same region as Edit Track; returns to Watch |
| **Keyboard `E`** | Toggle |
| **Escape** | Exit Edit Mode if no modal/popover focused; does not exit fullscreen alone |

### Restore clean interface

- Hide timeline and sidebar completely (not collapsed rail in Watch Mode)
- Expand video to reclaimed space
- Transport returns to Watch set (no timeline toggle)
- Selection and dirty state **persist** in session — only chrome hides

### Unsaved changes

| Scenario | Behavior |
|----------|----------|
| Exit Edit Mode with **clean** track | Immediate return to Watch |
| Exit Edit Mode with **dirty** track | **Allow exit** — Watch Mode does not block; chip shows unsaved indicator |
| Close video / app with dirty track | Existing `beforeunload` / unsaved guard unchanged |
| Remove track / Replace with dirty | Confirm dialog (existing patterns) |

**Recommendation:** Do **not** modal-block exiting Edit Mode for unsaved work — watching should stay low-friction; chip + File → Save remain sufficient. Optional: one-time toast “Track has unsaved changes” on first exit per session.

---

## Fullscreen

### Default: Watch Mode in fullscreen

| Rule | Detail |
|------|--------|
| Enter fullscreen | User stays in Watch Mode |
| Editor UI | **Not** shown automatically — no timeline, no sidebar drawer by default |
| Video | Fills screen; masks/subtitle cover still apply |

### Controls in fullscreen

| Pattern | Recommendation |
|---------|----------------|
| **Idle hide** | Transport fades after 3s idle; mouse move shows |
| **Temporary on hover** | Bottom gradient + transport (premium player pattern) |
| **Track chip** | Top-right, same menu; fades with transport |
| **Peek / Reveal / Replay** | Unchanged — Shift, V, R |

### Fullscreen + Edit

| Approach | Recommendation |
|----------|----------------|
| Edit in fullscreen | Optional **overlay drawer** (existing `FullscreenEditOverlay` direction) — only when user presses `E` in fullscreen |
| Do not | Auto-open edit drawer on fullscreen enter |

---

## Status bar

### Recommendation: **hidden by default** in Watch Mode

| Rationale | Detail |
|-----------|--------|
| Redundancy | Track chip covers “what track”; transport covers time |
| Calm | Status bar reads as IDE/utility |
| Settings | User may enable via Settings → Show status bar (global pref) |

When enabled globally, status bar may show in Watch Mode — but **factory default** for new installs: **off** during watch.

Edit Mode: status bar optional; layer count / dirty still secondary to timeline.

---

## Visual tone

### Should feel

| Quality | Expression |
|---------|------------|
| **Calm** | Dark surround, minimal chrome, no competing accents |
| **Cinematic** | Large picture, fading controls, restrained type |
| **Focused** | One job: watch with VEIL intelligence applied |

### Avoid

| Anti-pattern |
|--------------|
| Dashboards (widgets, stats rows) |
| Inspector panels beside video |
| Dense toolbars (many equal-weight buttons) |
| Always-visible timeline |
| Technical labels (MASK, schema) in Watch chrome |

Tokens: [COLOR_SYSTEM.md](./COLOR_SYSTEM.md), [TYPOGRAPHY.md](./TYPOGRAPHY.md).

---

## Comparison: current VEIL vs proposed Watch Mode

| Area | Current VEIL | Proposed Watch Mode | Gain | Tradeoff |
|------|--------------|---------------------|------|----------|
| **Default layout** | Video + rail and/or sidebar + optional timeline | Video + top chip + bottom transport only | Premium player feel | Authors need `E` for depth |
| **Sidebar** | Collapsed rail always visible | Hidden entirely | Maximum video width | No one-click section jump while watching |
| **Timeline** | User-toggled; button in transport | Edit Mode only | No accidental editor | Scrub intervals need Edit or shortcuts |
| **Track status** | Status bar + sidebar Track panel | Track chip only | Always visible, minimal | Less detail without opening menu/info |
| **Transport** | Play, seek, time, timeline btn, fullscreen | Full transport + volume + speed | Complete media controls | More controls to fit in one row |
| **Empty / Home** | Sidebar on no-video | Home only ([HOME_REDESIGN.md](./HOME_REDESIGN.md)) | Clear lobby | Separate implementation effort |
| **Fullscreen** | Overlay with edit affordances | Watch-first; edit on demand | Immersion | Edit in fullscreen needs drawer |
| **First-time user** | Sees editor vocabulary early | Sees player vocabulary only | Faster comprehension | Must discover Edit |

---

## Success criteria

A **first-time user** can:

1. **Open video** — from Home, lands in Watch Mode.
2. **Press play** — transport is obvious; no timeline required.
3. **Understand a track exists** — chip shows `No Track` or loaded name; menu explains load/create.
4. **Watch content comfortably** — masks/skips/subtitle cover work without opening sidebar.

**Without** learning editing features (timeline, layers, groups, anchors).

### Measurable signals (future UX test)

- User does not mention “timeline” or “layers” when asked to describe first 60 seconds
- User correctly states whether a track is active (chip quiz)
- Time-to-first-play &lt; 5s after video open

---

## State machine (reference)

```
[ Home — no video ]
        │ Open Video
        ▼
[ Watch Mode ] ◄────────────────────────────┐
        │ E / Edit Track / M,U,K (auto)      │ Done / E
        ▼                                    │
[ Edit Mode ] ──────────────────────────────┘
        │
        │ Close Video
        ▼
[ Home ]
```

Mode is **orthogonal** to fullscreen: `watch + fullscreen` and `edit + fullscreen` are valid; fullscreen does not imply edit.

---

## Relationship to other design docs

| Doc | Watch Mode relationship |
|-----|-------------------------|
| [PLAYER_REDESIGN.md](./PLAYER_REDESIGN.md) | D2 vision; D4 is normative spec |
| [HOME_REDESIGN.md](./HOME_REDESIGN.md) | Entry before Watch |
| [LAYOUTS.md](./LAYOUTS.md) | Player layout = Watch default |
| [COMPONENTS.md](./COMPONENTS.md) | Track chip to be specified in D5 |

---

## Open design questions

| # | Question | Options |
|---|----------|---------|
| 1 | Track chip keyboard access? | Dedicated shortcut vs menu bar only |
| 2 | Volume: inline slider vs popover? | Cinematic minimal vs always-visible slider |
| 3 | Subtitle toggle in Watch? | Always visible vs only when cues loaded |
| 4 | Edit button label | “Edit track” vs icon pencil only |
| 5 | M/U/K auto-edit | Recommended yes — confirm with power users |
| 6 | Unsaved toast on exit Edit? | Once per session vs never |
| 7 | Remember Edit Mode on relaunch? | Default Watch vs restore last mode |
| 8 | Chip show `.veil` extension? | `Family Safe` vs `Family Safe.veil` |
| 9 | Multiple tracks future? | Single chip vs chip stack |
| 10 | Menu bar in Watch fullscreen? | Auto-hide menu vs always show |

---

## Implementation note

**This document does not authorize code changes.** D5+ implements `playerMode`, layout visibility, track chip component, and transport refactor per this spec.
