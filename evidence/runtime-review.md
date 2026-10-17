# Focus Trail journey and capture implementation report

Owned files: `packages/core/src/journey.ts`, `packages/core/src/capture.ts`, `tests/integration/journey.spec.ts`, `tests/integration/capture.spec.ts`. No package/config/types/index edits; no commits.

## Contract and implementation

- `createJourney(page, testInfo, options)` returns `press`, `expectFocus`, and `finish` with the existing public types. Exported `test` adds the `journey` factory with that same signature and finalizes every factory-created journey during fixture teardown.
- Native input uses only `page.keyboard.press`. Integration coverage checks native dialog activation and trusted keyboard events, plus the denied third input never being delivered.
- Checkpoints use Playwright `expect.poll` retrying assertions. Each sample checks unique locator matches and page/main-document/root ownership. An ElementHandle remains held across focus checks and accessibility capture to avoid treating rerendered targets as the same target.
- Checkpoint IDs are persisted as both `checkpointId` and `expectedTargetKey`; action steps have neither. Step indices are contiguous from zero.
- Chromium is required. Any explicit positive fixed viewport is supported; dimensions, actual `navigator.language`, and actual browser version are recorded. Unsupported browser/null viewport are rejected before construction so invalid metadata never becomes a malformed journey artifact.
- Caps: 50 delivered actions, 50 checkpoints, 30,000ms journey duration, 5,000ms checkpoint retry timeout. Options may reduce action/duration/checkpoint-timeout caps, never increase them. Denied attempts set failed run status without exceeding the 100-record schema cap or serializing an illegal action key.
- First finish validates duration even when the journey was idle; later finishes preserve the original duration decision. Later failed/timed-out/interrupted test status can update an earlier passing result and its attachment. Failed status never turns green in ordinary API use.
- Actions are queued and finalization waits for pending work. Additional operations after finish reject. Finalization serializes its own calls and attaches once, refreshing the actual copied attachment file on later calls.

## Capture fidelity and privacy

- Capture queries Chromium CDP `Accessibility.getPartialAXTree` for only the active element with `fetchRelatives:false`. Its computed role/name, tag and `data-testid` are the only selected evidence. AX values, cookies, storage, DOM dumps and snapshots are not persisted.
- Chromium's accessible-name computation handles hidden `aria-labelledby` referents and multi-reference name contribution in the tested fixture. No guessed role/name fallback is used.
- Body/document-root focus is explicit evidence (`No focused element: document body`). Closed pages/capture errors remain explicit unavailable evidence. Focus changes while the active CDP node is being captured are also explicit and trigger checkpoint retry.
- Frame and open-shadow target/focus observations are explicitly rejected; closed-shadow focus hosts are conservatively rejected. Other-page locators are rejected before evaluation.
- Every recorded name/test ID, ID/build/fixture metadata, and error text is literal-string masked. Longest strings are replaced first, preventing a shorter overlapping mask from leaving a longer supplied secret partly visible. Attachment labels are masked as well.
- Controlled journey errors avoid Playwright's raw locator/DOM diagnostic dumps. External test errors retain only the first nonempty line, strip ANSI and apply masks; subsequent lines that could include DOM/input evidence are excluded. An arbitrary first-line application exception can still contain user-provided sensitive text, so supplied masks remain necessary for such application errors and accessible labels.
- A focus checkpoint may pass when independent exact-node focus checks succeed but accessibility capture is unavailable. The unavailable marker is retained; no role/name is invented. As specified, transitions between checkpoints are outside coverage.

## Tests and evidence

Runtime: Node 24.22.0, `@playwright/test` 1.64.1, pinned Chromium in `work/browsers`.

- Initial executable red run: 20 failures against placeholders, with failures attributable to missing keyboard/checkpoint/capture/finalization behavior. Log: `work/journey-red.log`.
- One first-green test fixture fault was corrected: its delayed blur permitted a legitimate transient native focus return, so the deliberately bad fixture now closes/blurs synchronously and independently asserts body focus. This did not require a runtime change.
- Idle-finish regression was added and observed red (`passed` received instead of `failed`), then fixed. Log: `work/journey-idle-red.log`.
- Final scoped suite: 23 tests covering good/bad return, delayed focus, ambiguity/duplicate labels, computed names, masking vs input values, frame/shadow/other-page targets, unsupported focus observations, closed pages, supported metadata settings, browser guard, action/duration/checkpoint budgets, checkpoint count, and repeated finalization.
- The fixture test runs a real nested Playwright subprocess whose app assertion fails after all checkpoints and after an early passed finish. Its JSON reporter independently confirms final failed status, all passed checkpoints, a single refreshed attachment, and masked/first-line-only external error text.
- TypeScript no-emit check and owned-file ESLint check passed. Logs: `work/journey-typecheck.log`, `work/journey-lint.log`.
- Broad project verification is delegated to root to avoid collisions with concurrent package/report integration. No full-suite success is claimed here.

## Commands

From `outputs/focus-trail`, with Node runtime directory on PATH and `PLAYWRIGHT_BROWSERS_PATH` pointing to parent `work/browsers`:

```sh
node node_modules/@playwright/test/cli.js test --project=integration tests/integration/journey.spec.ts tests/integration/capture.spec.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js packages/core/src/journey.ts packages/core/src/capture.ts tests/integration/journey.spec.ts tests/integration/capture.spec.ts
```

Scope limitations are the agreed Chromium/main-document-only MVP and checkpoint sampling, not general accessibility conformance or complete transient focus history. Filesystem attachment failures still surface as errors; no fake successful attachment is claimed.

## Qualification evidence-loss correction

Root's first 80-case repeat run produced 78 passes and 2 escape-qualification failures. In the reviewed `escape-13.json`, action step 6 correctly captured the outside link while failed checkpoint step 7 ended with null metadata and generic capture unavailable. This was evidence loss at the retry deadline, not incorrect application focus: the independent Playwright outside-focus oracle had passed.

Initial evidence is retained independently of later qualification rewrites:

- `work/evidence-loss/repeat-verification-before-fix.log`
- `work/evidence-loss/escape-13-before-fix.json`

Correction:

- Each checkpoint retains its most recent actual coherent capture, including its elapsed sample time. A later generic capture outage preserves those selected fields and marks them as a historical sample in `observed.unavailable`.
- At timeout, retained metadata is labelled `Last coherent sample at …ms; checkpoint wait ended without a later verified sample`. It is evidence of an earlier sample, not a claim that the node remains focused at the deadline.
- Explicit focus-changed or unsupported-boundary observations invalidate retention. They cannot turn an earlier sample into verified current focus. Passed checkpoint status continues to depend on independent exact-node focus checks around capture.
- This retention is local to a checkpoint. No metadata is copied from a prior action or checkpoint, and no role/name/test ID is invented.
- Environment-initialization timeout now preserves the duration-budget cause instead of replacing it with generic environment-unavailable. The full-Chromium broad-run idle test had previously reported the correct failed status with the wrong error classification; root/reporter retained that broad-run log.

Regression evidence:

- Real busy-renderer deadline test was red in 4/4 runs before the historical-sample marker existed (`work/evidence-loss/red.log`).
- A deterministic protocol-outage test starts with a real Chromium checkpoint capture and then makes subsequent CDP session creation unavailable. It was red with all metadata null (`work/evidence-loss/outage-red.log`), then green with the real outside-button capture retained and explicitly timestamped.
- A real keyboard focus change during the second AX capture, followed by a protocol outage, verifies that earlier retained outside metadata is invalidated.
- Fresh full-Chromium scoped run: **26 passed (8.2s)**, log `work/evidence-loss/scoped-green.log`. Fresh typecheck and owned-file ESLint checks both passed (`work/evidence-loss/typecheck.log`, `work/evidence-loss/lint.log`).
- Root owns the new 80-case repeat qualification run; this report does not claim its outcome in advance.
