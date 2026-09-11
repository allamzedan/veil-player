# Subtitle workflows

## Show subtitles

Normal subtitle display. No cover applied.

## Smart Cover

Subtitles are hidden during playback until you reveal them:

- **Hold Shift** — peek while held
- **V** — brief reveal pulse
- **R** — smart replay (returns to cue start)

Best for language immersion and reducing on-screen text until you choose to see it.

## Region Cover

A single editable rectangle covers a burned-in subtitle area on the video. Use when subtitles are part of the video image, not a separate SRT layer.

## Advanced: per-cue masks

Legacy power-user option: generates one mask layer per subtitle cue on the timeline. Use only when Smart Cover or Region Cover are not sufficient. Can create hundreds of timeline items and affect performance.

## Track file

Subtitle mode and region cover geometry can be saved in your `.veil.json` track file alongside masks, mutes, and skips.
