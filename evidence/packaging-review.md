# Packaging and documentation

Owned implementation files: `scripts/test-pack.mjs`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `LICENSE`, `README.md`, `docs/quickstart.md`, `docs/baseline-review.md`, `docs/limits.md`, `CONTRIBUTING.md`. No commits, publication, uploads, external messages or additional agents.

## Clean external consumer

`npm run test:pack` requires caller-built `dist/`, invokes `npm pack --ignore-scripts --json`, then installs the produced tarball and exact `@playwright/test@1.64.1` in a fresh `work/focus-trail-consumer-*` project. It checks the installed copy is outside the source checkout. No smoke test imports source files or uses repository-local Playwright.

The consumer exercises ESM public exports and CommonJS resolution, the direct `createJourney` helper, the public `test` fixture, the reporter loaded by Playwright as `focus-trail/reporter`, and real Chromium keyboard interactions. It explicitly reviews a fixed synthetic six-step contract before copying its passing result to a baseline. This approval is engineering fixture evidence only.

Actual browser runs:

- Capture helper and fixture: exit 0; review pending without comparison.
- Reviewed unchanged dialog: exit 0; comparison unchanged.
- Lost return: exit 1; comparison regressed, first checkpoint difference at index 5 (`dialog.return`).
- External activation assertion after `finish()`: exit 1; current failed although all six focus/action steps passed, and comparison has run-failure at index 6.
- 51st action after 50 actions plus 50 checkpoints: exit 1, exactly 100 retained records, budget error preserved.
- 51st checkpoint after 50 actions plus 50 checkpoints: exit 1, exactly 100 retained records, budget error preserved.

The actual installed `.bin/focus-trail` verifies unchanged 0, lost return 1, activation 1, invalid schema 2, incompatible browser version 3, and failed baseline 2. Successful comparisons write HTML. Reviewed baseline bytes remain unchanged.

`verification.json` records stage outcomes, command logs, Node/peer/browser versions, tarball integrity and SHA256. Failures throw through a nonzero script exit and record failed verification. Candidate and companion reports remain under `evidence/package/`. Fresh consumer intermediates remain under the workspace `work/` directory for debugging; no home-directory writes are performed by this script.

## Observed red-to-green evidence

1. Initial smoke failed because the package lacked README and LICENSE. Preserved as `evidence/package/first-red.log` and `verification-red.json`.
2. Clean ESM imports then passed, but Playwright reporter resolution failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`: Playwright uses CommonJS `require.resolve`, while root-owned package exports initially provided only `import`. Root added `default` targets for core and reporter. Preserved as `reporter-wiring-red.log` and `verification-wiring-red.json`.
3. Final owned smoke command passed all checks on Node v24.22.0 and Chromium 156.0.8078.4, using `channel: 'chromium'`, viewport 1280×800, actual locale en-US.

Current candidate at this run: `focus-trail-0.1.0.tgz`, SHA256 `d19578bfc8ff89666860130bdadba1d01a0fd270366a10f7502b1234640eee5e`. Independently confirmed with `shasum -a 256`.

`scripts/test-pack.mjs` ESLint passed. Root coordinates final build and aggregate verification after remaining source/evidence documentation changes; that final run will replace the candidate and update its hash. This report does not claim GitHub-hosted CI ran.

## Documentation and workflows

README and quickstart show the actual public fixture factory signature, pinned peer, full Chromium channel, explicit viewport/locale, stable checkpoint keys, optional literal masks, text-only capture, and ordinary activation assertions. Baseline review extracts raw `current` from a report envelope and explicitly writes a reviewed passing record with exclusive-create semantics. It never automatically accepts or overwrites a baseline.

Limits document 50 actions, 50 checkpoints, 30-second live duration, five-second maximum focus wait, unobserved transition limits, unsupported other pages/frames/shadow content/screen reader behavior, validator bounds, privacy review, and outcome precedence. They distinguish local engineering qualification from the independent pilot gate.

CI and manual candidate workflows pin Node 24.22.0, use npm ci, install Chromium, and run npm run verify. Permissions are contents:read. Work/browser directories use runner.temp. Neither workflow uploads or publishes. The manual candidate workflow explicitly states that npm publication remains gated on three independent maintainer installations plus reviewed pilot evidence.

README links root-owned `docs/pilot.md` and `docs/qualification.md`; root writes the qualification document after its final measurements.
