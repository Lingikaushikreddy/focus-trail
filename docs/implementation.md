# Focus Trail execution record

Source specification: `05_focus_trail.md`, October 16, 2026. The user authorized implementation of the deeper prompt with the original MVP scope.

## Decisions

- One npm package exposes the core, reporter, and CLI; source remains in the proposed three package directories. This removes release ordering without changing the contracts.
- Checkpoint IDs are author-defined stable expected-target keys. Accessible labels remain explanatory evidence.
- A checkpoint asserts eventual focus within its bounded wait. Unobserved transitions between checkpoints are outside coverage.
- Application activation remains an ordinary Playwright state assertion. A fixture finalizer captures external test failures as failed journeys.
- Explicitly reject other pages, frames, and shadow targets. No support is added for them.
- Screenshots are optional input evidence for the renderer; default journey capture is text only.
- Local engineering qualification cannot stand in for independent maintainer installations or inclusive user testing. The public release gate remains pending until real pilot evidence exists.

## Task and interface preflight

| Tasks | Producer and consumer | Finding |
| --- | --- | --- |
| 1 / 2 | Journey writes typed steps; capture observes main document | Failure capture must not throw away the original error |
| 1 / 3 | JourneyResult to comparison | Stable checkpoint ID doubles as expected key |
| 2 / 4 | Minimal evidence to reporter | Labels must be masked and escaped; no default DOM/value serialization |
| 3 / 4 | Comparison to render | Distinguish journey changes, checkpoint failure, and incomparable metadata |
| 3 / 5 | Comparison to CLI exit code | Invalid input 2, incompatible metadata 3, regression 1, passing unchanged 0 |
| 4 / 5 | Rendered HTML to package | Self-contained report and reporter are included in tarball |
| 5 / 6 | Packed candidate to pilot | Local installation is engineering evidence, not independent adoption |
| 1 | Real keyboard journey | Good and single-fault demo fixtures agree with independent assertions |
| 2 | Evidence capture | Delays, ambiguity, unsupported boundaries, redaction and teardown need tests |
| 3 | Reviewed baseline comparison | Passing baseline required; benign evidence fields do not affect equality |
| 4 | Accessible report | Keyboard navigation, missing images, hostile names, offline requests tested |
| 5 | CLI and packaging | Clean install exercises public imports and actual bin, not source imports |
| 6 | Qualification and value | Prepare counterbalanced pilot; record missing human evidence honestly |

## Progress

- [x] Isolated repository, fixed interfaces, package/bootstrap configuration.
- [x] Real journey and failure-safe evidence.
- [x] Schema validation and baseline comparison.
- [x] Portable report and Playwright reporter.
- [x] CLI, clean-package installation and CI.
- [x] Demo, qualification corpus and repeat runs (80/80 after evidence-loss fix).
- [x] Documentation and pilot kit.
- [x] Final code-review fixes, scoped re-review and refreshed aggregate verification (114 unit tests, 42 browser tests, clean packed consumer).
- [ ] External pilot and three independent installations; public release pending.
