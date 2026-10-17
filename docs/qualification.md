# Focus Trail v0.1 qualification

This is a locally qualified, installable release candidate. Public release and developer-value claims remain gated on the independent pilot. All examples use synthetic data. See `evidence/summary.json` for the final run counts, environment, candidate hash, and outstanding gates.

## Evidence chain

| Claim | Independent expectation and check | Retained evidence |
| --- | --- | --- |
| Actual keyboard input drives the journey | Browser event trust checks and ordinary Playwright focus/application assertions | `tests/integration/journey.spec.ts`, `demo.spec.ts` |
| Lost return focus is detected at the correct checkpoint | Separate `document.activeElement` observation proves `BODY` after Escape; authored opener expectation fails | `evidence/demo/lost-return.json`, `.html` |
| A real source mechanism agrees with the tool | Extracted React/Fluent dialog with upstream-pinned focus dependencies yields body focus before its fix and opener focus after; ordinary assertions and installed helper agree | `evidence/upstream/result.json`, runnable fixture and comparison |
| Escaping modal focus is detected | Ordinary locator assertion confirms focus on the outside link while the dialog remains visible | `evidence/qualification/escape-0.json`, `escape.html` |
| Activation failure survives passing focus steps | Installed consumer has an uncaught ordinary application assertion fail; every recorded focus step passes, but the run and comparison fail | `evidence/package/activation.report.json`, `.html` |
| Valid behavior does not become a false alarm | Delayed focus, modal wrapping, authored alternative return target, and benign evidence/build changes | `evidence/qualification/*control-0.json`, unit comparison tests |
| Failures keep useful focus evidence | Real busy-renderer and capture-outage regressions prove historical samples are retained and explicitly qualified | `tests/integration/journey.spec.ts`, `evidence/investigation/` |
| Defaults exclude sensitive state | Synthetic input secret absent from JSON; computed accessible labels and errors masked; untrusted unknown fields discarded | Capture and parser tests; `evidence/verification.log` |
| Scope boundaries are enforced | Other pages, frame and shadow targets are rejected; unavailable focus is evidence rather than an exception that loses the report | Runtime tests |
| Baseline decisions are deterministic | Passing baseline required; authored contract changes need review; environment mismatches are incomparable; failed current runs never become unchanged | Comparison tests and CLI logs |
| Reports remain useful offline and without images | Actual keyboard selection, hostile-text checks, zero remote requests, missing images, and real browser text/reflow inspection | Report E2E tests; `evidence/preview-report*.jpg` |
| Package works outside its repository | A fresh consumer installs the tarball and exercises its public helper, fixture, reporter, and actual CLI executable | `evidence/package/verification.json` and command logs |

## Reproduce qualification

Use the pinned Node version and install dependencies and Chromium. `npm run verify` runs lint, typecheck, build, all unit/integration/report tests, and the external package consumer. `npm run demo:record` creates three reviewed synthetic baselines and verifies three intentionally failing browser runs. `npm run evidence:repeat` repeats each of the four qualification cases twenty times with zero retries. Deliberately failing subprocesses must return the specified failure exit code; their enclosing verification passes only when that failure and its evidence are correct.

The current pinned browser is Chromium 156.0.8078.4, revision 1248, under Playwright 1.64.1. Qualification uses `channel: 'chromium'`. The separately bundled headless shell suppressed animation frames locally; the full pinned browser provided working rendering, pointer input, and screenshots. [Playwright documents this headless mode](https://playwright.dev/docs/browsers#chromium-new-headless-mode). Browser channel and runner environment should remain fixed when recording and comparing real baselines.

## Failures found and corrected

The first eighty-repeat run had 78 passes and two failures: a near-deadline capture replaced earlier focus evidence with an unavailable sample. The detector still reported the correct failed checkpoint, but lost its destination. A regression test reproduced the loss; capture now retains the last real coherent sample with an explicit timestamp qualification. Detected focus changes invalidate retained evidence. The corrected repeated run passed all eighty cases. Original failure receipts are retained in `evidence/investigation/`.

Clean installation exposed a reporter exports-map resolution failure, fixed by providing the default export condition required by Playwright's loader. Independent review then found and required correction of no-baseline failure aggregation for inconsistent records and browser-cache inheritance in the packaging check. Review findings and disposition are retained with the verification evidence.

## What this does and does not establish

The checks establish the recorded journey and packaging contracts for the pinned local Chromium environment. A checkpoint proves eventual focus within its bounded wait; it does not prove uninterrupted containment or observe every intervening focus change. Optional PNG/JPEG screenshots can be displayed, while other optional image inputs fall back to text. Actual computed accessible names can still contain sensitive author-provided text; use synthetic data and explicit literal masks.

The in-app browser keyboard walkthrough and screenshots are agent reviews, not independent keyboard-user validation. The plain DOM demo is an adapted behavioral reproduction. A separate extracted fixture also reproduces the upstream React/Fluent mechanism using pinned source dependencies; the complete PyRIT application was not executed. See [provenance](provenance.md).

No external participant outcomes, independent maintainer installations, comparative diagnosis measurements, adoption claims, or complete accessibility/compliance conclusions are established. The [pilot kit](pilot.md) and blank results sheet preserve the original three-independent-installation public-release gate.
