# Task 4 reporter evidence

Implemented only `packages/reporter/src/index.ts`, `packages/reporter/src/render.ts`, `tests/unit/render.test.ts`, and `tests/e2e/report.spec.ts`. No commits, uploads, or baseline writes. Root additionally requested the visual evidence JPEGs.

## Behavior

- Exports `render(Comparison): string`, `renderRun(JourneyResult): string`, and default Playwright reporter; accepts `baselineDir` and `outputDir` (default `focus-trail-report`).
- Consumes `focus-trail:` JSON attachments from buffer or local path, validates with `parseJourney`, and compares only existing reviewed passing baselines named `encodeURIComponent(journeyId) + '.json'`. Encoded baseline identifiers over 200 characters surface a diagnostic.
- Writes collision-safe SHA-256 report names incorporating test ID, journey ID, retry, and duplicate occurrence. Each HTML has adjacent JSON `{ testId, testTitle, testStatus, retry, journeyId, reviewStatus, html, json, current, comparison? }`; `reports.json`, `diagnostics.json`, and `index.html` summarize the run locally.
- Missing baselines remain review pending. Invalid attachments/baselines and incomparable or regressed runs fail the tool. Existing failed/interrupted/timed-out runner status is preserved. Late Playwright failures after early passing attachments update the captured run to failed without changing the Playwright result.
- Self-contained HTML has native buttons, keyboard selection, ordered actual journey steps, the exact initial difference, expected/observed keys and targets, before/after focus evidence, and separate finalization outcomes. Action failures stay on the actual failed action. Matching reports say “Expected journey passed.”
- All hostile evidence is escaped in markup. Evidence never enters JavaScript; rendered HTML templates are cloned by a static script. Content Security Policy denies remote assets and connections. Screenshots display only bounded PNG/JPEG data URLs per the initial task contract; optional WebP retained by the core parser is intentionally text-only in this renderer. Absent or undecodable images retain readable text.
- Observed-target summaries preserve retained tagged focus evidence and explicitly qualify capture unavailability; they do not imply the retained sample is current live focus. Empty/body focus remains explicit.

## Tests first

1. Authored unit and E2E tests before implementation. Initial skeleton run: **9 unit failures** for missing report content, outputs, diagnostics, and regression status. Initial browser run: **5 failures** because controls/evidence did not exist.
2. Review cases added before fixes: **3 unit failures** for missing passing-contract message, wrongly relocated action failures, and green early attachments after later test failure. All passed after minimal fixes.
3. Added undecodable raster test before CSS fix. It failed because `[hidden]` was overridden by the screenshot display rule. Explicit hidden semantics fixed the cause.
4. Added retained-observation browser test before the summary fix. It failed because the observed-target summary hid the last coherent target. The summary now includes that target and its unavailable/sample qualifier.

## Final scoped verification

Node 24.22.0; Playwright 1.64.1; full installed Chromium 156.0.8078.4 via `channel: 'chromium'`.

- `node node_modules/vitest/vitest.mjs run tests/unit/render.test.ts`: **12 passed**, exit 0.
- `node node_modules/@playwright/test/cli.js test --project=e2e tests/e2e/report.spec.ts --output ../../work/reporter-e2e-results`: **8 passed**, exit 0. Covers real Tab/Enter/Space/arrow/Home/End controls, exact action/checkpoint selection, separate run outcomes, retained focus qualification, hostile strings, offline `file:` viewing with zero remote requests, absent/undecodable/disabled images, reduced motion and 640px width at 200% text size without horizontal overflow.
- Scoped ESLint: exit 0; full project TypeScript check: exit 0.
- Desktop and 200% text-size screenshots inspected. Real pointer activation separately verified using full Chromium.

## Broader suite and browser findings

Before the final raster fix, all **109 unit tests** passed. A broader integration/E2E run passed **36/37**; the unrelated `idle journeys fail their duration budget at first finish` runtime test expected `/duration.*budget/i` but received `Journey environment capture unavailable`. Shared exact evidence with the runtime owner and root. Root owns final whole-package verification after that runtime correction.

The default macOS headless-shell binary did not produce `requestAnimationFrame` or paint, even with a standalone plain button page. Timers, DOM and keyboard events worked; normal pointer clicks stalled in Playwright's frame stability check. An additional shared-output run lost trace files to a concurrent run. Isolated outputs removed trace interference. Full installed Chromium produced frames, pointer clicks and screenshots immediately; root changed the configs accordingly. Tests retain real keyboard activation because it is the requested report interaction.

Very tall full-page 200% text screenshots tiled repeated viewport content in this browser. Replaced that capture with two actual viewport captures; layout DOM overflow checks and inspected text remain valid.

## Visual evidence

- `outputs/focus-trail/evidence/preview-report.jpg`: desktop actual lost-return demo report.
- `outputs/focus-trail/evidence/preview-report-zoom.jpg`: 640px viewport, 200% text, report summary.
- `outputs/focus-trail/evidence/preview-report-zoom-detail.jpg`: same viewport and text size, current focus evidence.
