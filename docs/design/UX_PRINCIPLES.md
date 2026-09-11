# VEIL UX Principles

Product and interaction principles for VEIL Player. Use these to evaluate any screen, flow, or feature — before visual design (D2) and after.

**Status:** Foundation (Phase D1) — documentation only.

---

## 1. Video First

**The video is the hero.**

- The largest, clearest, most stable region on screen is always the picture.
- Overlays (masks, subtitle cover, playback HUD) serve the video — they do not replace it.
- When in doubt, hide chrome rather than shrink the video.
- Fullscreen and immersion modes minimize everything except transport and essential peek/reveal hints.

**Anti-patterns:** Sidebars wider than the video on common aspect ratios; modal dialogs that obscure the entire stage during routine edits; animated chrome that draws the eye away from content.

---

## 2. Tracks Are Assets

**Tracks are valuable reusable objects.**

- Save / Load track are first-class actions — equal dignity to opening a video.
- Copy and UI should reinforce: `.veil.json` is portable, shareable, and independent of the video file.
- Import flows respect track authorship (metadata, groups, anchors) as optional richness, not clutter.
- Mobile-created tracks and desktop-created tracks are peers — mismatch warns, valid schema loads.

**Anti-patterns:** Treating tracks as “session prefs”; implying tracks are tied to one machine; hiding load/save behind deep menus.

---

## 3. Non-Destructive Always

**Never imply video modification.**

- Language: “mask,” “cover,” “skip interval” — not “edit,” “cut,” “export video.”
- Save track ≠ save video. Export (future) must be explicit about output type.
- Destructive actions apply to **track items** or **session state**, never the source file.
- About, first-run, and empty state should state clearly: original media is untouched.

**Anti-patterns:** “Save” on the same row as video without qualifier; trash icon on the video thumbnail; render/export language in the default save path.

---

## 4. Progressive Disclosure

**Advanced controls should not overwhelm beginners.**

- Default surfaces show: open, play, add mask/mute/skip, save/load, subtitle mode.
- Advanced: fades, presentation presets, offset/shift, anchors, groups, manual builder.
- Use collapsible sections, details/summary, and dedicated dialogs — not one endless scroll of equal-weight controls.
- Settings consolidate motion, appearance, and interface — not scattered duplicates.

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) § Progressive Disclosure.

---

## 5. Fast Access

**Common actions must always be easy to find.**

| Action | Expected reach |
|--------|----------------|
| Open video | Menu, header, empty state, startup |
| Save track | Menu, sidebar Track, shortcut (Ctrl+S) |
| Load track | Menu, sidebar Track, empty state |
| Add mask / mute / skip | Sidebar Create, menu, timeline shortcuts (M / U / K) |

**Rule:** A user who completed first-run once should never hunt for save or load on the second session.

---

## 6. Calm Interface

**Avoid visual noise.**

- Restrained color: dark surfaces, semantic accents only where meaningful.
- Motion supports comprehension (fade, peek) — not decoration.
- Reduce motion and blur respect user settings.
- Toasts are brief; dialogs are purposeful; no banner stacks.
- Timeline is information-dense but not chaotic — consistent lane colors, clear playhead.

**Anti-patterns:** Pulsing buttons, multiple competing accent colors, always-visible debug text, notification badges on every panel.

---

## 7. Keyboard Friendly

**Power users should remain productive.**

- Playback, timeline nudge, add/delete, undo/redo, and subtitle navigation have shortcuts.
- Shortcuts are documented in Help and discoverable in menus.
- Focus order is logical; focus-visible rings are always present.
- Editable fields swallow typing keys; global shortcuts do not fire while typing in inputs.

**Rule:** A keyboard-only user can open video, add a mask, adjust timing, save, and load — without mouse dependency for core loops.

---

## Evaluation checklist

Before shipping a feature or redesign:

- [ ] Does video remain the visual focus?
- [ ] Are track save/load obvious and correctly labeled?
- [ ] Is non-destructive messaging clear?
- [ ] Are advanced controls tucked away?
- [ ] Are top-four actions within one or two clicks?
- [ ] Is the screen calm at rest?
- [ ] Are shortcuts updated and documented?

---

## Related documents

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [LAYOUTS.md](./LAYOUTS.md)
- [COMPONENTS.md](./COMPONENTS.md)
- [../track-format.md](../track-format.md) — track asset contract
