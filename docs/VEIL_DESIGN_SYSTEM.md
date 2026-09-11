# VEIL Design System
Version: 1.0 Draft
Status: Living Document

---

# Purpose

This document defines the visual language of VEIL.

Every screen, dialog, button, panel, icon, animation, and interaction should follow these rules.

Consistency is more important than novelty.

---

# Design Goals

VEIL should feel:

• Professional
• Calm
• Fast
• Dense without clutter
• Predictable
• Native
• Modern

Reference applications:

- Visual Studio Code
- DaVinci Resolve
- Figma
- Affinity Photo
- Obsidian

Not:

- Browser dashboards
- Material Design admin panels
- Mobile-first layouts

---

# Visual Personality

Theme

Professional Dark

Primary accent

Blue / Violet

Secondary accents

Teal
Amber
Green

Danger

Muted Red

Success

Muted Green

Warning

Amber

Information

Blue

---

# Layout Philosophy

Every screen has four layers.

Window

↓

Navigation

↓

Workspace

↓

Inspector

Never mix responsibilities.

---

# Density

VEIL is a desktop application.

Use high-density layouts.

Avoid oversized cards.

Avoid excessive padding.

Information should be visible.

Scrolling should be minimized.

---

# Spacing Scale

Use only:

4

8

12

16

24

32

48

No arbitrary spacing.

---

# Corner Radius

Buttons

6px

Panels

8px

Dialogs

10px

Large overlays

12px

No pill buttons.

---

# Shadows

Subtle.

Used only for:

Dialogs

Floating menus

Tooltips

Never for primary layout.

---

# Typography

Primary

Inter

Fallback

Segoe UI

Font hierarchy

Application title

22

Section title

18

Panel title

16

Body

14

Metadata

12

Caption

11

Never use more than six font sizes.

---

# Color Hierarchy

Primary text

High contrast

Secondary text

Medium contrast

Metadata

Low contrast

Disabled

Muted

Never use accent colors for normal text.

Accent colors indicate interaction only.

---

# Buttons

Primary

Filled

Used only for:

Apply

Save

Open

Load

Secondary

Outlined

Used for:

Cancel

Back

Close Panel

Danger

Outlined

Red border

Transparent fill

Only for destructive actions.

Examples:

Delete Bookmark

Delete Mask

Delete VEIL

Never use filled red buttons.

---

# Icons

Use one icon family only.

Stroke width must remain consistent.

Icon sizes

16

18

20

24

Toolbar icons

20

Sidebar icons

18

Timeline icons

16

---

# Toolbar

Toolbar height

44px

Items centered vertically.

Equal spacing.

No wrapped rows.

Overflow handled gracefully.

---

# Sidebar

Default width

280px

Compact rail

64px

Icons always remain aligned.

---

# Inspector

Order

Header

↓

Properties

↓

Advanced

↓

Actions

Actions always visible without scrolling whenever possible.

Apply

Cancel

Delete

Never separate these from the edited content.

---

# Timeline

Playhead

Most visually dominant.

Bookmarks

Diamond

Cyan

Masks

Purple

Mutes

Amber

Skips

Green

Subtitles

Blue

Never reuse colors.

---

# Empty States

Every empty state should educate.

Never simply say:

"No items."

Instead:

Explain.

Offer next action.

Example

"No bookmarks yet.

Create your first bookmark at the current playback position."

---

# Dialogs

Maximum width

560px

Buttons aligned right.

Primary action rightmost.

Destructive confirmation always required.

---

# Motion

Animations

150ms

Ease-out

Only animate:

Dialogs

Menus

Inspector

Sidebar

Never animate layout continuously.

---

# Fullscreen

Hide chrome after 2 seconds.

Hide cursor.

Workspace only.

Minimal HUD.

---

# Keyboard

Every important action must have:

Shortcut

Tooltip

Menu entry

Mouse path

No hidden functionality.

---

# Accessibility

Minimum hit target

28px

Contrast

WCAG AA minimum

Focus visible

Always.

---

# Performance

Visual effects must never reduce playback smoothness.

If an effect affects FPS, remove it.

Playback has priority over decoration.

---

# Consistency Rules

Before adding a UI element ask:

Can an existing component be reused?

Does this duplicate another action?

Does it belong somewhere else?

Will users find it naturally?

If not, redesign.

---

# Review Checklist

Before merging UI work:

✓ Spacing follows scale

✓ Typography follows hierarchy

✓ Colors follow meaning

✓ Buttons use correct hierarchy

✓ Inspector order correct

✓ Timeline colors correct

✓ Empty states useful

✓ Keyboard shortcuts documented

✓ No duplicated actions

✓ Fullscreen remains clean

Only then may the feature be accepted.