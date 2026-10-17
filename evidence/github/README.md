# GitHub delivery verification

This directory records qualification of the repository prepared for GitHub on **2026-10-16, America/Los_Angeles**. These are engineering checks, not human pilot outcomes.

## Final results

- Node 24.22.0; Playwright 1.64.1; full Chromium channel.
- Lint, build and type checking passed.
- 114 unit tests, 34 browser integration tests and 8 report tests passed: 156 total.
- 56 clean packed-consumer checks passed, including actual CLI exits and expected browser failures.
- 37 relocated pilot companion checks passed against the installed frozen candidate.
- Dependency audit reported zero vulnerabilities for the final lockfile.
- All four copies of the frozen installer retain SHA-256 `79bac5b64c1f96e7cb684e4bb746cc37af4bda902f719590bacc3984fb8e67e4`.

[Machine-readable summary](verification.json) · [Full source log](source-verify-final.log) · [Package receipt](source-package-verification.json) · [Pilot log](pilot-verify-final.log) · [Final audit](npm-audit-final.json)

## Packaging and portability

Scratch outputs now remain under the checkout's ignored `work/` directory by default. The clean-consumer isolation check verifies a real installation within that fresh consumer's own `node_modules`, so a consumer under repository-local scratch is valid. The earlier overly broad parent-prefix assertion failed after this relocation; its [failed log](source-verify-before-pack-check-fix.log) is preserved.

The complete `npm run verify` was run in a fresh dependency installation in an isolated copy, retaining the original source-tree evidence and frozen candidate. The new source pack has different bytes because the checkout includes new documentation/pictures and development dependencies. It does not replace the original human-pilot archive. The main README's frozen package receipt remains the historical qualification for that exact hash.

The pilot was copied into `pilot/`; its extraction check now resolves the repository from the test file's URL. Historical logs retain original creator paths as provenance. Their raw whitespace is preserved by a log-specific Git attribute. Runtime caches, `node_modules` and browser binaries are excluded from Git.

## Development-tool update

The initial audit found issues in the old test tooling ([initial audit](npm-audit-before.json)). The UI-server issue is described by the [Vitest advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp); the mocker path-traversal issue is described by the [mocker advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9); the worker-options issue is described by the [Tinypool advisory](https://github.com/advisories/GHSA-85c8-ppgw-ccpr).

The current source pins Vitest 5.0.5 and its supported Vite 6.4.4 peer. A Vitest 4 dependency resolution failed inside npm's peer-tree loader ([log](dependency-clean-resolution.log)); the first Vitest 5 resolution selected Vite 8, whose optional native binding was unavailable here ([startup log](source-verify-vite8-startup.log)). Pinning the supported Vite 6 peer produced a clean install, zero audit findings and the complete passing suite. These failures remain visible rather than being counted as passes.

These are development dependencies. Product capture/comparison behavior, the Playwright peer pin and the frozen pilot bytes remain unchanged. The original qualified source ZIP intentionally preserves its historical dependency lock; the current GitHub checkout contains the updated tooling.

## Pictures and reports

README pictures were captured from the real local keyboard demo and checked-in report, then visually inspected. [Screenshot hashes](screenshots.json) identify the files. The report retains its qualification when a fresh focus sample is unavailable. Reports and primary data remain available under `evidence/demo/` and the pilot's private operator evidence.

Human status remains **0/5 assessments and 0/3 independent installations**. Repository availability does not satisfy the public npm release gate.

## Remote CI follow-up

The first push exposed an invalid `runner.temp` expression at job-level `env`. Both workflows now use `github.workspace`, a supported context at that location; see [GitHub's context-availability reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#context-availability).

The next Linux run exposed four overly tight test deadlines ([original log](github-ci-linux-before-tests.log)). The test-specific 50–220 ms bounds could expire before the intended browser samples or injected outages occurred. A controlled probe adding 25 ms per real CDP send reproduced three failures ([before](ci-timing-slow-before.log)).

Only integration tests changed: redaction and evidence checks now allow real captures to complete, assert that the intended outage/focus-change milestones actually occurred, and synchronize a busy browser task after the first coherent sample. The dedicated short-timeout test and production timeout maximum remain intact. No product code, original contract assertion or frozen candidate changed.

The revised suite passed all [156 source tests](ci-timing-npm-test-after.log), [five targeted cases](ci-timing-targeted-after.log), and [ten slowed-CDP repeat cases](ci-timing-slow-after-repeat.log), with no retries. Independent static review found no weakened assertions. The remote workflow is rerun on the pushed commit.
