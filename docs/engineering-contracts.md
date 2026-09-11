# VEIL engineering contracts

These contracts apply to maintenance, hardening, and feature batches. A frozen surface changes only when the batch explicitly names and approves its unfreeze, expected behavior change, focused regression coverage, and packaged manual QA.

## Frozen surfaces and invariants

| Surface | Invariant |
| --- | --- |
| Timeline geometry, selection, zoom/fit/center | Existing coordinate mapping, selection behavior, viewport operations, and visual placement remain stable. |
| Fullscreen transport behavior | Playback, seek, volume, speed, loop, and enter/exit behavior remain consistent with the windowed player. |
| Fullscreen bookmark activity/editor | Bookmark activity, editing, save/delete, timing, and dismissal behavior remain stable. |
| Fullscreen VEIL rail behavior | Visibility, ordering, filtering, activity, and interaction remain stable. |
| Inspector collapse behavior | Local and YouTube collapse to only the narrow reopen affordance, leave no blank block, and preserve collapse state across source switches. |
| Recents/history | Identity, ordering, metadata, recovery, and reopen behavior remain stable. |
| Source replacement and dirty guard | Replacement decisions preserve unsaved work and use the established confirmation flow. |
| Audio/video seek lifecycle | A seek targets only the active media element; stale elements and deferred callbacks cannot take ownership. |
| YouTube iframe geometry/compliance | Player geometry, visibility, provider controls, attribution, and policy boundaries remain stable. |
| Navigate search/export behavior | Search results, navigation targets, and export contents remain stable. |
| Settings UX/content | Organization, copy, focus, stacking, readability, persistence, and close behavior remain stable. |
| Subtitle behavior | Load, display modes, cue preservation, removal, source-file safety, timing, and generated masks remain stable. |
| Layer deletion behavior | Confirmation removes the requested item and reconciles selection/groups; cancellation preserves state. |

## Batch header

Every batch must declare:

- Risk: Low, Medium, or High.
- Blast radius: Local, Shared, or Cross-cutting.
- Known-good baseline: immutable commit.
- Frozen surfaces: affected or explicitly unchanged surfaces.
- Manual QA contract: required observable behavior and visual checks.

Risk is the likelihood and consequence of regression: Low is isolated and readily reversible, Medium touches shared tooling or established flows, and High affects persistence, security, packaging, playback ownership, or multiple critical surfaces.

Blast radius describes reach:

- Local: one isolated module or outcome.
- Shared: a dependency, component, tool, or contract used by multiple flows.
- Cross-cutting: behavior spanning processes, storage, packaging, or several product surfaces.

## Operating rules

- Explicit unfreeze is required before changing a frozen invariant. Approval must state the intended behavior difference, tests, risk, and packaged QA.
- Automated green is not merge-ready for UI-heavy work. The packaged application must pass visual and interaction QA against the known-good baseline.
- Repeated corrective failures trigger diagnosis and re-specification. Do not continue stacking speculative patches.
- Critical-action tests assert observable final state, including confirmation/cancellation, store state, rendered state, and selection reconciliation where applicable.
- CSS-heavy work requires the parse gate, a baseline visual diff, and selectors scoped to the intended surface. Avoid stylesheet rewrites and broad selector cleanup.
