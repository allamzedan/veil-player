# UI Refresh — Manual QA Checklist

**Feature flag:** `veil:uiRefreshV1` (Settings → Interface → **Use refreshed interface**, or `localStorage.setItem('veil:uiRefreshV1', '1')`)

Run this checklist before enabling the refreshed interface by default.

---

## Setup

| Step | Action |
|------|--------|
| 1 | Enable refreshed interface in Settings (reload when prompted) |
| 2 | Use a sample video + `.veil.json` track for full coverage |
| 3 | Repeat critical paths with **Arabic** UI for RTL |
| 4 | Run `npm run qa` |

---

## No video

| # | Check | Pass |
|---|--------|------|
| 1 | Home lobby appears (not classic empty state + sidebar) | ☐ |
| 2 | **Open Video** opens file picker / loads video | ☐ |
| 3 | **Load Track** opens track JSON picker | ☐ |
| 4 | **Learn More** opens first-run / help overlay | ☐ |
| 5 | No sidebar or timeline visible | ☐ |

---

## Watch mode

| # | Check | Pass |
|---|--------|------|
| 1 | Opening a video lands in **Watch** (not Edit) | ☐ |
| 2 | Track chip visible in header | ☐ |
| 3 | **Edit Track** enters Edit mode | ☐ |
| 4 | Transport controls on one row (play, seek, time, volume, rate, fullscreen) | ☐ |
| 5 | Volume mute + slider work | ☐ |
| 6 | Fullscreen enters and exits cleanly | ☐ |
| 7 | **E** toggles to Edit mode | ☐ |
| 8 | Timeline hidden in Watch | ☐ |
| 9 | Inspector hidden in Watch | ☐ |
| 10 | Sidebar / rail hidden in Watch | ☐ |

---

## Edit mode

| # | Check | Pass |
|---|--------|------|
| 1 | Inspector visible (Track Overview or item editor) | ☐ |
| 2 | Refreshed timeline visible | ☐ |
| 3 | **+ Add Action** → Mask creates mask | ☐ |
| 4 | **+ Add Action** → Mute creates mute | ☐ |
| 5 | **+ Add Action** → Skip creates skip | ☐ |
| 6 | Created item selected; inspector shows item editor | ☐ |
| 7 | Select item on timeline → inspector edits timing/style | ☐ |
| 8 | Track Tools menu opens dialogs (Subtitles, Groups, **Layers**, etc.) | ☐ |
| 9 | **Done** returns to Watch mode | ☐ |
| 10 | **E** toggles back to Watch | ☐ |

---

## Track file workflows

| # | Check | Pass |
|---|--------|------|
| 1 | Save track (menu, chip, inspector) | ☐ |
| 2 | **Save Track As** opens save dialog; **Save** reuses last path | ☐ |
| 3 | Load track | ☐ |
| 4 | Replace track | ☐ |
| 5 | Clear track (same confirm everywhere) | ☐ |
| 6 | Mobile-exported track loads | ☐ |
| 7 | Metadata mismatch shows warning; load proceeds after confirm | ☐ |
| 8 | Unsaved guard on close video / load replace | ☐ |

---

## Subtitles

| # | Check | Pass |
|---|--------|------|
| 1 | Import SRT (Track Tools → Subtitles) | ☐ |
| 2 | Subtitles display during playback | ☐ |
| 3 | Smart Cover generates / applies | ☐ |
| 4 | Region Cover mode works | ☐ |
| 5 | Reveal (hold / momentary) works | ☐ |
| 6 | Replay / cue navigation works | ☐ |

---

## RTL (Arabic)

| # | Check | Pass |
|---|--------|------|
| 1 | Settings → Language → Arabic; UI mirrors correctly | ☐ |
| 2 | Timeline remains LTR | ☐ |
| 3 | Playhead aligns with bars | ☐ |
| 4 | Time readouts remain LTR | ☐ |
| 5 | Home / header / inspector usable in RTL | ☐ |

---

## Fullscreen

| # | Check | Pass |
|---|--------|------|
| 1 | Play / pause in fullscreen | ☐ |
| 2 | Reveal / mask behavior correct | ☐ |
| 3 | Track items apply during fullscreen playback | ☐ |
| 4 | Exit fullscreen restores Watch/Edit chrome | ☐ |

---

## Advanced Sidebar fallback

| # | Check | Pass |
|---|--------|------|
| 1 | Classic sidebar does **not** appear in normal Home/Watch/Edit flow | ☐ |
| 2 | **Advanced Sidebar** (Inspector footer) opens legacy sidebar explicitly | ☐ |
| 3 | No menu/chip action opens sidebar unexpectedly | ☐ |
| 4 | **Done** or **E** → Watch closes fallback | ☐ |
| 5 | Fallback sidebar expanded and usable when opened | ☐ |

---

## Settings & flag

| # | Check | Pass |
|---|--------|------|
| 1 | Settings → **Use refreshed interface** toggles flag | ☐ |
| 2 | Reload applies change | ☐ |
| 3 | Setting persists across restart | ☐ |
| 4 | Disabling returns classic layout after reload | ☐ |
| 5 | Preview notice visible in Settings | ☐ |

---

## Regression — flag off

| # | Check | Pass |
|---|--------|------|
| 1 | Disable refreshed interface; reload | ☐ |
| 2 | No-video shows classic empty state + sidebar | ☐ |
| 3 | Video open shows classic sidebar + timeline toggle | ☐ |
| 4 | View menu shows Show/Hide Sidebar & Timeline (not Watch/Edit) | ☐ |
| 5 | No inspector panel | ☐ |
| 6 | `npm run qa` passes | ☐ |

---

## Sign-off

| Field | Value |
|-------|--------|
| Tester | |
| Date | |
| Build / version | |
| Critical issues | |
| Ready for default? | ☐ Yes ☐ No |
