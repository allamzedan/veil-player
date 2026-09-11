# Performance notes (Phase 15)

Profile before optimizing. Tools: Chromium Performance panel in Electron dev, React Profiler.

## Hot paths

| Area | Trigger | Mitigation |
|------|---------|------------|
| Mask fade rAF | Any mask with `fadeInMs`/`fadeOutMs` > 0 | Scoped tick in VideoPlayer only; throttle to ~30fps |
| Subtitle layer rAF | Active SRT cues | Runs while subtitles enabled |
| Reconciler | Playback loop | Updates active set on ID change only |
| backdrop-filter | Blur/frosted mask preset | Advanced only; user can disable blur in settings |

## Stress targets

- 500+ subtitle cues: subtitle index lookup per frame
- 1000+ masks: timeline render cost; avoid per-cue SRT masks
- Fullscreen + scrub: playhead transition disabled while scrubbing

## Not planned

- Canvas compositor rewrite
- `currentTime` in Zustand
- List virtualization unless profiling proves timeline unusable
