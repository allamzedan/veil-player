# VEIL Home & Empty State Redesign

**Phase D3 — documentation only.** Defines the first-launch and no-video experience on paper. No React, CSS, or implementation in this phase.

**Related:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) · [UX_PRINCIPLES.md](./UX_PRINCIPLES.md) · [LAYOUTS.md](./LAYOUTS.md) · [PLAYER_REDESIGN.md](./PLAYER_REDESIGN.md)

---

## Purpose

Define what a **new or returning user** sees before any video is open.

### Primary teaching goals (under 10 seconds)

A new user should understand:

1. **VEIL never modifies videos.** The original file stays untouched on disk.
2. **Tracks contain playback instructions.** A separate `.veil.json` tells VEIL what to hide, mute, skip, and how to handle subtitles — applied at watch time, not baked into the media.

Everything on Home serves those two ideas. Controls come **after** comprehension.

---

## Problem

### Current empty state gaps

| Issue | Today |
|-------|--------|
| **Concept unclear** | Copy leads with “playback-layer filters” — accurate but technical. |
| **Track undefined** | “Load Track” appears without explaining what a track *is*. |
| **Why VEIL exists** | Non-destructive note is one line; not the hero message. |
| **Editor before lobby** | Full **TrackSidebar** renders beside empty state (Track, Create, Layers, etc.). |
| **Equal CTAs** | Open Video and Load Track share button weight — implies equal first step. |
| **No recents** | No path back to familiar videos or saved tracks. |
| **Startup vs Home split** | 2.5s splash shows logo + tagline, then drops into a different empty layout. |

Users see **controls before understanding** what VEIL does.

### Target

Home feels like a **premium media application lobby** — calm, centered, instructive — not an editor waiting for a timeline.

---

## Home screen concept

Large **centered layout**. Single scroll region on small viewports; no sidebar column.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  [ Menu bar — minimal: File · Help ]              (optional)    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    [ VEIL Player logo ]                         │
│                                                                 │
│     Control what you see and hear — without modifying           │
│                        the video.                               │
│                                                                 │
│     VEIL uses lightweight tracks to hide, mute, skip, and       │
│     customize playback while keeping your original video        │
│     untouched.                                                  │
│                                                                 │
│                    [ Open Video ]                               │
│                                                                 │
│              Load Track    ·    Learn More                      │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Video  +  Track  =  VEIL Experience                          │
│  (concept strip — see Track Explanation)                        │
│                                                                 │
│  Quick start: 1 Open · 2 Create · 3 Save · 4 Reuse              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Recent Videos          │  Recent Tracks                        │
│  Planet Earth           │  Family Safe                          │
│  Japanese Lesson        │  Language Learning                    │
│  Movie Night            │  Subtitle Trainer                     │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [ Future: Community Tracks — reserved ]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Top — brand

| Element | Spec |
|---------|------|
| **Logo** | Large `veil-logo` — visual anchor ([TYPOGRAPHY.md](./TYPOGRAPHY.md) hero 24–32px title below or beside) |
| **Product name** | “VEIL Player” — semibold, calm |

No video transport, no timeline, no layer list in this zone.

### Middle — message + CTA

| Element | Copy (English reference) |
|---------|--------------------------|
| **Headline** | Control what you see and hear — without modifying the video. |
| **Short description** | VEIL uses lightweight tracks to hide, mute, skip, and customize playback while keeping your original video untouched. |
| **Primary CTA** | **[ Open Video ]** — single Primary button ([COLOR_SYSTEM.md](./COLOR_SYSTEM.md) brand) |
| **Secondary** | **Load Track** · **Learn More** — text links or ghost buttons; lower emphasis |

**Learn More** opens: first-run overlay, About, or short in-app help — not external docs required for v1.

### Information hierarchy

1. Non-destructive promise (headline)
2. Track concept (description)
3. Action (Open Video)
4. Secondary paths (load existing track, learn)
5. Recents (habitual return)
6. Future (community — reserved)

---

## Recent content

Below hero and teaching sections. **Simple lists** — not a data grid or dashboard.

### Recent Videos

| Example | Behavior (future impl.) |
|---------|-------------------------|
| Planet Earth | Click → open that video path (restore last track if paired) |
| Japanese Lesson | |
| Movie Night | |

- Max **5–8** items; “Show all” optional later
- Show **friendly title** or filename stem; no file paths in primary line
- Empty: “No recent videos” — muted, no shame copy

### Recent Tracks

| Example | Behavior (future impl.) |
|---------|-------------------------|
| Family Safe | Click → load track; prompt for video if none open |
| Language Learning | |
| Subtitle Trainer | |

- Same visual weight as Recent Videos — two columns on wide screens, stacked on narrow
- Pairing video + track in recents is a **future enhancement**; v1 may list independently

### Visual treatment

- Surface: Panel on Background ([COLOR_SYSTEM.md](./COLOR_SYSTEM.md))
- Row height: comfortable click target (40–44px)
- No thumbnails required in v1 — text rows with optional small icon (film / track file)
- No KPIs, counts, or sync status — **not a dashboard**

---

## No video loaded workspace

### Desired state

When `videoSrc === null`, the workspace is **Home only**.

| Hide | Show |
|------|------|
| Timeline | Hero (logo, headline, description) |
| Editor chrome (transport, seek) | Open Video CTA |
| Sidebar editing panels (Track, Create, Layers, …) | Recent Videos / Recent Tracks |
| Status bar (optional) | Quick start + track explanation strip |
| Collapsed sidebar rail | Menu bar (File, Help) — global shell only |

### Current vs desired

| Today | Desired |
|-------|---------|
| `EmptyState` + full `TrackSidebar` in `workspace-no-video` | **Full-width Home** — no sidebar |
| Status bar may show “No video loaded” | Hidden or minimal on Home |
| Technical body paragraph | Plain-language teaching blocks |

### Goal

Feel like opening **Apple TV, VLC, or Plex** before a file is chosen — not like Premiere with empty bins.

### After Open Video

Transition to [PLAYER_REDESIGN.md](./PLAYER_REDESIGN.md) **Watch Mode** — not Edit Mode. Home does not persist beside video.

---

## Track explanation

Simple **conceptual section** — not a schema doc. Placed between hero CTAs and recents (or directly under secondary links).

### Visual metaphor

```
   ┌─────────┐     ┌─────────┐     ┌──────────────────┐
   │  Video  │  +  │  Track  │  =  │ VEIL Experience │
   └─────────┘     └─────────┘     └──────────────────┘
```

### Plain language

| Term | User-facing explanation |
|------|-------------------------|
| **Video** | Your file — never edited by VEIL. |
| **Track** | A small sidecar file (`.veil.json`) with instructions for this watch session. |
| **VEIL Experience** | What you see and hear when both are combined. |

### What tracks can do (three verbs)

| Action | Plain language |
|--------|----------------|
| **Hide** | Cover part of the screen (subtitles, logos, sensitive scenes). |
| **Mute** | Silence audio for a time range. |
| **Skip** | Jump past a section during playback. |

Avoid: “mask item,” “interval,” “globalOffset,” “schema 1.4.0” on Home.

Optional one-liner: *Tracks are reusable — save once, use with the same or a different video.*

---

## Quick start

Onboarding **card** or horizontal step strip — concise, scannable.

| Step | Label |
|------|-------|
| 1 | **Open a video** |
| 2 | **Create a track** (add hide, mute, or skip as you watch) |
| 3 | **Save the track** |
| 4 | **Reuse it anytime** |

### Rules

- Four steps max on Home; detail lives in First Run / Help
- No checkbox wizard — static guidance
- Dismissible after first visit (coordinate with existing `FirstRunOverlay` — merge or defer in D4)

### Relationship to First Run

| Surface | When |
|---------|------|
| **Startup splash** | Brief brand moment (≤2s) or eliminated if Home teaches |
| **Home Quick start** | Persistent reference on no-video workspace |
| **First-run overlay** | Optional modal on first launch only — can duplicate steps; D4 should unify |

---

## Visual tone

### Must feel

| Quality | Expression |
|---------|------------|
| **Calm** | Generous whitespace, dark Background, no dense panels |
| **Premium** | Centered hero, quality logo, restrained typography |
| **Media-focused** | Film/track metaphors, not IDE or spreadsheet |

### Avoid

| Anti-pattern | Why |
|--------------|-----|
| Technical jargon | “Playback-layer filters,” “metadata-bound,” “deserialize” |
| Developer language | JSON, schema version, fingerprint on Home |
| Dashboard appearance | Widgets, stats, multi-column admin layout |
| Editor chrome | Sidebars, timelines, layer badges before video |

Tokens: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) · [COLOR_SYSTEM.md](./COLOR_SYSTEM.md) · [TYPOGRAPHY.md](./TYPOGRAPHY.md).

---

## Future space: Community Tracks

**Reserve only — do not design the feature.**

### Location

Bottom of Home, below Recent Tracks, separated by a subtle divider or section label.

```
┌─────────────────────────────────────────┐
│  Community Tracks                       │
│  (Coming later)                         │
│                                         │
│  [ reserved area — no UI spec ]         │
└─────────────────────────────────────────┘
```

### Intent (documentation)

- Future discovery/sharing of public or curated `.veil.json` tracks
- Not in scope for D3/D4 implementation
- Layout must not collapse when empty — placeholder copy optional: “Share and discover tracks — coming later”

---

## Startup screen relationship

| Option | Recommendation |
|--------|----------------|
| **A. Keep splash** | ≤2s logo + headline, then fade to Home (same copy family) |
| **B. Remove splash** | App opens directly to Home; faster time-to-teaching |
| **D4 decision** | Prefer **B** or **A with matched copy** — avoid three different messages (splash, first-run, empty state) |

Splash today: logo, tagline, “Starting workspace…” — does not teach tracks. Home replaces that pedagogical job.

---

## Accessibility & i18n

- Headline and description fully translatable (8 locales)
- Recent lists: `aria-label` per section
- Open Video: primary focus on load
- RTL: centered hero mirrors; recent columns stack logically
- Learn More: keyboard reachable

---

## Success criteria

After implementation (future phase), a usability test participant should within **10 seconds** state:

1. VEIL does not change my video file.
2. A track is a separate file with hide/mute/skip instructions.

---

## Open questions (for D4)

| Question | Notes |
|----------|-------|
| Unify FirstRunOverlay with Home Quick start? | Reduce duplication |
| Recent videos data source? | Session restore vs persisted recents |
| Load Track from Home without video? | Allowed — then prompt open video or unbound preview |
| Menu bar on Home? | Keep File/Help; hide View timeline/sidebar items |
| Status bar on Home? | Default hidden |

---

## Implementation note

**This document does not authorize code changes.** D4+ may replace `EmptyState`, remove no-video `TrackSidebar`, and add recents per this spec.
