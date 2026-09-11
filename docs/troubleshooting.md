# Troubleshooting

## Track file will not load

- Ensure the file is valid JSON and a supported schema version (`1.0.0` through `1.6.0`).
- Check the error toast for the specific validation message.
- If the track references a different video, load the matching media file first.

## SRT import issues

- Use standard SubRip (`.srt`) format with `HH:MM:SS,mmm --> HH:MM:SS,mmm` timing lines.
- Invalid blocks are skipped; the status line reports how many cues loaded.

## Blur mask preset looks wrong or is slow

- Blur uses GPU `backdrop-filter` and varies by graphics driver.
- Disable blur in **Settings → Playback & motion**, or use **Dim** / **Soft glass** presets instead.
- See [Known limitations](known-limitations.md).

## Playback feels sluggish

- Large numbers of masks with fade enabled increase render work.
- Per-cue subtitle masks (Advanced) create many layers — prefer Smart Cover when possible.
- Try disabling motion effects in Settings.

## Fullscreen stuck or chrome hidden

- Press **Escape** once to hide chrome, again to exit fullscreen (when focused on the player).
- **F** toggles fullscreen.

## VEIL crashed

- Your video files were not modified. Reload the app.
- In development builds, check the console for details.
