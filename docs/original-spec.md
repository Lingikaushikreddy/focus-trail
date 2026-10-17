# Focus Trail implementation plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task by task after the user requests implementation.

**Goal:** Make keyboard journey regressions easy to reproduce and review inside existing Playwright tests.

**Architecture:** A small TypeScript helper records actual browser keyboard actions and expected focus checkpoints. A Playwright reporter compares the resulting journey with an explicitly reviewed baseline and generates a portable report showing the first meaningful divergence. Tests remain normal Playwright tests; the product does not introduce another browser automation engine.

**Tech stack:** TypeScript, Node.js 24, Playwright Test, Vitest, and a static HTML report. Pin the exact Playwright/browser versions together when implementation begins. Use standard npm packaging and a minimal example application.

**Spec:** The user workflow, boundaries, interfaces, and acceptance criteria in this file form the embedded specification. Proposed package names and commands are illustrative contracts, not published software.

**Planning date:** October 16, 2026. **Portfolio rank:** 5 of 5, a reserve candidate. **Estimate:** six weeks at 25–35 focused hours weekly for a TypeScript developer familiar with browser tests. The top three launch priorities are Release Lens, Repro Pack, and Migration Lab. Do not build this concurrently with all three.

## Opportunity and evidence

The target user maintains a component library or web application and already has Playwright tests. Their dialog still opens after a refactor, but closing it sends keyboard focus to the document body. A screenshot of the finished dialog misses the lost focus. Focus Trail makes that behavior a small, reviewable change with a reproducible key sequence.

The problem is behavioral. W3C explains that focus order must preserve meaning and operability; it need not follow one universal visual order. Therefore the tool must compare project-authored expectations rather than label every left-to-right or top-to-bottom deviation an accessibility failure. [W3C focus order explanation](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html).

Playwright already provides keyboard APIs and accessibility test integration. Its guidance says automated testing should be combined with manual assessment and inclusive user testing. Build on that foundation and make no complete accessibility or compliance claim. [Keyboard API](https://playwright.dev/docs/api/class-keyboard), [accessibility testing guidance](https://playwright.dev/docs/accessibility-testing).

A September 16, 2026 research preprint, A11yLTLNav, studies navigation failures across interaction traces. This is evidence that state over time matters, not proof of commercial demand or an adoption forecast. Its exploration and property checking approach is broader research work; Focus Trail's scope is explicit regression checkpoints in developer tests. [A11yLTLNav paper](https://arxiv.org/abs/2609.17959).

## Competition and differentiation

| Existing tool | Verified overlap | What this candidate must add |
| --- | --- | --- |
| [Playwright and axe integration](https://playwright.dev/docs/accessibility-testing) | Accessibility checks, assertions, test attachments, and existing browser reporting infrastructure. | A focused helper and reporter for before/after keyboard journeys; reuse its engine and trace viewer. |
| [keyboard-vibes](https://github.com/stevefaulkner/keyboard-vibes) | Keyboard test harness with focus order tables, screenshots, visualizations, and CI output. | Emphasize authored business journeys and a stable comparison artifact inside an existing test suite. |
| [SpecA11y](https://github.com/OKlueck/SpecA11y) | Interactive checks including keyboard traps and focus indicators, with JSON and SARIF output. | Show the precise changed step in a named workflow rather than competing on the number of automated checks. |
| [A11yLTLNav](https://arxiv.org/abs/2609.17959) | Research on automated detection of navigation failures across action-state traces. | Deliver a small, installable developer workflow and intentionally avoid general exploration/property synthesis. |

No claim is made that those tools cannot implement this behavior. The unproven advantage is a lower setup cost and clearer review experience. Compare that experience against plain Playwright assertions during the pilot. If developers prefer their current tests, contribute the reporter or helper upstream instead of maintaining a weak standalone product.

## Demo and user flow

The zero-key demo contains a good dialog and three controlled regressions: lost return focus, focus escaping the modal, and a keyboard action that no longer activates the intended button. Open the report and step through `Tab -> Enter -> Tab -> Escape`. A before/after panel shows where focus was expected and where it landed.

The reference dialog follows the APG pattern, including the ordinary return-to-invoker behavior and documented exceptions. Expected focus is always supplied by the test author; the tool must not assume the opener remains the right destination after every workflow. [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

A user installs the helper into a Playwright project, adds checkpoints to one important journey, runs it against their local test server, reviews the JSON baseline, and commits it. A later run attaches the first divergence and full journey to the existing Playwright result. First useful result target: under ten minutes for an existing Playwright user, measured in the pilot.

## Scope and global constraints

The MVP records `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`, and arrow keys; it asserts focus by a unique author-supplied Playwright locator. It supports a single page, main document, Chromium, fixed viewport, and one browser version at a time. It captures step labels, stable test IDs or role/name keys, active element metadata, timing, and optional screenshots from synthetic test environments.

- Use `page.keyboard.press()` to navigate; do not call `locator.focus()` or inject DOM key events to make a journey pass.
- Limit each journey to 50 actions and 30 seconds, with a maximum five second checkpoint wait.
- Strict locator matches must resolve to exactly one element; ambiguous targets fail with an explanation.
- Compare only equivalent browser versions, viewport, locale, and application fixture versions.
- A changed baseline is a reviewable change; CI cannot automatically accept it.
- Store results locally; upload nothing by default. Exclude input values, cookies, storage, and full DOM dumps from the default report.

Exclude screen reader emulation, a full WCAG scanner, automatic legal judgments, automatic website repair, Safari/Firefox parity, iframe and shadow DOM support, cross-browser baseline comparison, arbitrary page crawling, and production checkout/login automation. Those are substantial independent projects. Static reports must say “expected journey passed” rather than “website is accessible.”

## Repository and contracts

```text
focus-trail/
  packages/core/src/{types,journey,capture,compare}.ts
  packages/reporter/src/{index,render}.ts
  packages/cli/src/index.ts
  tests/{unit,integration,e2e}/
  examples/dialog/{app,tests}/
  docs/{quickstart,baseline-review,limits}.md
  .github/workflows/{ci,release}.yml
```

`createJourney(page: Page, testInfo: TestInfo, options: JourneyOptions): Journey` returns an object with `press(key: SupportedKey): Promise<void>`, `expectFocus(id: string, target: Locator): Promise<void>`, and `finish(): Promise<JourneyResult>`. Capture evidence even when a checkpoint throws, using a fixture teardown/finalizer. Navigation is caused only by the real keyboard helper; locators are for observation and assertion.

`JourneyResult` has `schemaVersion: 1`, journey ID, browser version, viewport, locale, `fixtureVersion`, informational `appBuild`, run status, and ordered `Step[]`. A step has an action, checkpoint ID if present, author-defined stable expected target key, observed tag/role/name/test ID, elapsed time, and status. Labels and accessible names are potentially sensitive; document this and offer explicit masks and synthetic-data guidance.

`compare(base: JourneyResult, current: JourneyResult): Comparison` returns `unchanged`, `regressed`, or `incomparable`, with the first differing checkpoint. `render(comparison: Comparison): string` produces escaped, self-contained HTML. The CLI provides `focus-trail compare base.json current.json --out report.html`; exit `0` for an unchanged successful journey, `1` for regression, `2` for invalid input/tool error, and `3` for incompatible metadata. Playwright test failures remain failures independently of reporter errors.

Compatibility requires identical schema version, journey ID, browser version, viewport, locale, and test-data `fixtureVersion`. Application build/commit identifiers are evidence only and are expected to differ across a code review. Require a passing baseline; a failed baseline is invalid input. Semantic comparison uses ordered keyboard actions, checkpoint IDs, expected target keys, and checkpoint pass/fail status. Any failed current run is a regression even if its trace resembles another failed run. Timings, screenshots, bounding boxes, observed names/roles, and application build identifiers are explanatory evidence, not equality fields. A changed action/checkpoint contract is reported as a journey change requiring baseline review; do not quietly skip it as incomparable. Role/name locators may be used, but the stable expected key comes from the checkpoint author.

## Review focus

A missing active element is a useful failure, not an exception that loses the report. Intentional modal focus loops must not be classified as traps. Repeated or localized names must not create unstable matches. Failed tests must still attach evidence. Incompatible browser baselines must not create a misleading green comparison.

## Implementation tasks

For each task, write and run the named tests before implementation, complete the interface, rerun to passing, and commit the reviewed result. Setup belongs with the first working journey; do not spend the first week on a generic dashboard.

### Task 1 Establish a real keyboard journey

**Files:** `core/types.ts`, `core/journey.ts`, dialog example, `tests/integration/journey.spec.ts`. **Consumes:** Playwright `Page` and `TestInfo`. **Produces:** `createJourney` and typed `JourneyResult`.

- [ ] Write a test where `Enter` opens the demo dialog and `Escape` returns focus to its opener; a deliberately broken variant must fail the return checkpoint.
- [ ] Run `npx playwright test tests/integration/journey.spec.ts`; observe failure before the helper exists.
- [ ] Implement keyboard actions and unique-locator checkpoints, using Playwright retrying assertions for the checkpoint wait.
- [ ] Rerun with both fixtures; assert the good fixture passes and the regression is reported as expected by the outer test. Commit the package bootstrap and example.

### Task 2 Capture minimal stable evidence

**Files:** `core/capture.ts`, `tests/integration/capture.spec.ts`. **Consumes:** page state after actions. **Produces:** normalized `Step` records and final attachments.

- [ ] Test body focus after a disappearing opener, duplicate names, delayed focus transitions, and report attachment after an assertion fails.
- [ ] Run `npx playwright test tests/integration/capture.spec.ts`; implement capture without input values or full DOM serialization, then rerun.
- [ ] Confirm a test with a synthetic secret in an input value does not include it in default JSON. Commit the passing capture path.

### Task 3 Compare reviewed baselines

**Files:** `core/compare.ts`, `tests/unit/compare.test.ts`. **Consumes:** two versioned results. **Produces:** `Comparison`.

- [ ] Test a first changed checkpoint, unchanged journey, missing/extra checkpoints, failed current run, browser mismatch, locale mismatch, and viewport mismatch.
- [ ] Assert different application builds and elapsed times remain comparable, changed fixture versions return `3`, a failed baseline returns `2`, and a failed current run never returns unchanged.
- [ ] Run `npm run test:unit -- compare`; implement deterministic metadata checks and step comparison, then rerun.
- [ ] Reject incomparable results with status `3`; never overwrite baseline files implicitly. Commit the comparison contract.

### Task 4 Deliver an accessible report

**Files:** `reporter/index.ts`, `reporter/render.ts`, `tests/e2e/report.spec.ts`. **Consumes:** test attachments and comparisons. **Produces:** a Playwright reporter and portable HTML.

- [ ] Test report navigation using only the keyboard, first-divergence highlighting, readable text without screenshots, missing screenshot handling, and HTML escaping of hostile accessible names.
- [ ] Run `npx playwright test tests/e2e/report.spec.ts`; implement the report with actual headings, buttons, visible focus, and text equivalents for before/after imagery.
- [ ] Verify report content opens offline with no remote requests. Commit the reporter after a manual keyboard review.

### Task 5 Add comparison CLI and release integration

**Files:** `cli/index.ts`, release/CI workflows, `tests/e2e/package.spec.ts`. **Consumes:** packed packages and JSON results. **Produces:** installable CLI and example CI recipe.

- [ ] Test every exit status, malformed/version-mismatched JSON, report output paths, and installation into a clean sample Playwright project outside the monorepo.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, and `npm run test:pack`; implement missing wiring and rerun to passing.
- [ ] Publish the example workflow with read-only repository permissions and local artifact output. Keep actual artifact upload as a separate user-configured CI step. Commit the release candidate.

### Task 6 Prove value against plain tests

**Files:** quickstart, limitations, contribution guide, baseline policy, example fixtures. **Consumes:** working release candidate. **Produces:** v0.1 qualification evidence and scope decision.

- [ ] Ask five component/application maintainers to instrument one dialog journey in their own local test app; record setup time and actionable failures with permission.
- [ ] Compare the report with ordinary `toBeFocused()` assertions and Playwright traces. Require users to identify which makes a changed journey quicker to understand.
- [ ] Fix setup failures, document Chromium-only coverage, and run all checks after those fixes. Tag a public release only after three independent installations succeed.

## Milestones and adoption

Week 1 delivers the good and broken dialog journey. Week 2 adds stable capture and failed-test attachments. Week 3 adds baseline comparison and limits. Week 4 ships the reporter and CLI. Week 5 runs external pilots. Week 6 fixes friction and packages v0.1. If time runs short, remove screenshots before removing precise text evidence or comparison checks.

In the first 48 hours of validation, show the focus-loss example to five Playwright maintainers. Continue if three recognize a real recent issue and two agree to add the helper. By day 14 require two independent working integrations and one maintainer who prefers its artifact to a plain trace. Stop or contribute upstream if the helper saves no meaningful setup/review effort. These thresholds are planning choices, not statistical estimates.

Launch with a short before/after dialog demonstration, a copyable 15-line test, and an honest comparison with keyboard-vibes and plain Playwright. Share with component library, Playwright, and accessibility communities under their project-sharing rules. Invite keyboard users to evaluate the report itself; obtain permission and offer compensation if their time becomes substantial. Suggested topics: `playwright`, `accessibility`, `keyboard-navigation`, `testing`, `typescript`, `developer-tools`.

The first 30-day goals after launch are ten independent journey runs and four repeat users. The 90-day goals are ten repositories keeping a journey in CI, two outside fixture contributions, and an aspirational 75 genuine stars. Stars measure interest; they do not establish accessibility quality. Track weekly visitors, net stars, completed integrations, returning projects, and support time separately. No default telemetry is needed: pilot followups, voluntary examples, and opt-in usage reports suffice.

## Maintenance and economics

Use MIT for original code and keep the helper/report complete in the open source distribution. Start with one maintainer and a published Chromium/Playwright compatibility range. Good first contributions are controlled broken component fixtures, clearer failure copy, and report accessibility improvements. Require tests for every claimed journey behavior.

Allocate two maintenance hours weekly initially, then reassess based on browser upgrades and actual usage. No backend, hosted credentials, or paid model APIs are required. A $0–30 monthly optional docs/CI allocation excludes labor and is a planning ceiling, not a live vendor price. Sponsorship or support may fund maintenance later; do not add a subscription gate to the useful artifact.

The largest risks are thin differentiation, baseline churn, browser-specific focus behavior, and overclaiming what automated tests prove. Keep this a reserve until a pilot demonstrates a clear advantage. At day 90, prefer upstreaming the useful parts over maintaining a second test framework.
