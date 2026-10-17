# Independent final review — Focus Trail MVP

Reviewed 2026-10-16. Scope: staged review patch and current core public API, capture/runtime, schema/comparison, renderer/reporter, CLI, package/verification scripts, CI, demo, qualification tests, original specification and user-facing documentation. No source edits, external calls, or broad test reruns were performed. Findings below are based on directly inspected control flow and concrete reproducible inputs, not an assertion that the full verification run has finished.

## Actionable findings

### [P2] Treat failed steps as failures before a baseline exists

**Location:** `packages/reporter/src/index.ts:98–111` (particularly line 100); associated display normalization at lines 57–61.

`parseJourney()` accepts a record whose root `status` is `passed` but whose step has `status: failed`. This is intentional enough that `tests/unit/compare.test.ts` explicitly tests that `compare()` cannot return green for this input. The reporter only calls comparison when a baseline exists. Without one, its `toolFailed` aggregation checks the root status but never the steps. A malformed or independently supplied attachment can therefore show a failed checkpoint while the index says `Captured run: passed`, `Tool completed`, and `onEnd({status: 'passed'})` returns `undefined`, preserving success.

**Reproduction:** Construct the normal passing test attachment fixture, set `current.steps[1].status = 'failed'`, retain `current.status = 'passed'`, give it a `focus-trail:...` JSON attachment name, and pass it to a reporter without a baseline directory (or one lacking that journey's baseline). Feed a passing Playwright TestResult and FullResult. The report remains review-pending and the process receives no reporter failure override. The corresponding comparison with a valid baseline correctly regresses, demonstrating inconsistent handling between entry points.

**Fix:** Include any failed recorded step in reporter failure aggregation; preferably normalize root/display status to failed or reject inconsistent status records at the shared validation boundary. Add a no-baseline reporter regression test and assert both `onEnd()` failure and truthful captured-run display. Current reporter tests cover malformed JSON and late failed Playwright results but do not exercise this semantically inconsistent accepted input.

### [P2] Preserve the default Playwright browser cache in the clean-consumer check

**Location:** `scripts/test-pack.mjs:12–13`.

The documented source setup is `npm ci`, `npx playwright install chromium`, `npm run verify`. With `PLAYWRIGHT_BROWSERS_PATH` unset, the install command uses Playwright's default cache. The main integration/E2E configuration uses that same default. However, `test-pack.mjs` changes the consumer environment to a different, normally empty `../../work/browsers` directory. The package smoke test never installs Chromium there. The documented fresh-checkout verification therefore fails when the packed consumer launches its browser even though the user installed the requested pinned browser and the earlier browser tests passed. Explicit CI/current-session browser-cache configuration conceals this defect.

**Reproduction:** In a fresh checkout/environment with `PLAYWRIGHT_BROWSERS_PATH` unset and no neighboring `work/browsers`, follow the README/CONTRIBUTING three-command setup. The clean consumer launch searches the injected work-directory cache rather than the populated default cache and reports a missing browser executable.

**Fix:** Leave `PLAYWRIGHT_BROWSERS_PATH` unset for the child when the caller has not set it, allowing the normal installed browser to resolve. Alternatively explicitly install into the selected custom cache as part of the check and document that behavior. A narrow configuration regression test should check the unset and explicitly configured cases. The existing fresh consumer is a real installed package, but its inherited explicit-cache environment does not test the documented default path.

## Quality and specification assessment

The architecture and primary MVP contracts are substantially implemented: actual keyboard actions; author-defined stable expected keys; bounded actions/checkpoints/duration; explicit unsupported frame/shadow/other-page failure; passing-baseline requirement; compatible environment checks; comparison of authored contract and outcomes rather than descriptive labels; distinct CLI outcomes; portable escaped reports; fixture finalization for later ordinary test failures; independently observed controlled faults; and actual clean tarball consumer execution.

Tests are meaningfully layered. The qualification cases independently observe body focus, outside-modal focus, delayed correct focus, and alternate authored return. Installed-package activation checks preserve a failed ordinary assertion when every focus checkpoint passed. Schema and report tests cover hostile evidence and unsupported images, and report E2E exercises actual keyboard behavior and offline loading. These are stronger than tests that merely mirror implementation fields.

No obvious P0/P1 defect was found in the inspected source. The two P2 findings should be resolved before claiming the documented installation/verification workflow and false-green handling are complete. No source verification outcome is inferred from previous passing counts; the parent run remains authoritative.

The current design still deliberately checks eventual focus at authored checkpoints, not every transition. Retained evidence is labeled with its sampling time and uncertainty. Screenshots remain optional, and masking is explicitly described as assistance rather than a complete privacy guarantee. Error/observation strings produced by runtime are not universally bounded before serialization, so unusually large author IDs or accessible labels can become rejected artifacts; this is a lower-probability hardening opportunity beyond the two primary findings.

Independent maintainer installations, measured improvement over ordinary Playwright assertions/traces, inclusive human report assessment, and public release gates remain pending. The local qualification corpus and fresh consumer do not satisfy those gates. Documentation correctly labels fixture provenance as an adapted behavioral reproduction rather than an upstream application rerun. No publication or outreach is warranted by the present evidence.
