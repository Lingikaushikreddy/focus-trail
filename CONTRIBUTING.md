# Contributing

Use Node 24.22 and the exact dependencies in `package-lock.json`. Keep the MVP's single-page main-document scope and author-defined target contract explicit. Discuss broader browser, frame, shadow or screen reader support before changing that contract.

```sh
npm ci
npx playwright install chromium
npm run verify
```

`verify` runs lint, type checking, build, unit tests, actual Chromium integration/e2e tests, and a clean packed-package installation. `test:pack` requires caller-built `dist/`; it packs with lifecycle scripts disabled, installs into a fresh project, and exercises installed public imports, the browser fixture, reporter and actual CLI binary. It retains the candidate, command logs and verification record under `evidence/package/`.

The browser tests use controlled fixtures and independent Playwright behavior assertions. When fixing comparison or lifecycle behavior, add a regression test and observe its failure before implementation. Preserve failed journeys and checkpoint evidence through teardown. Include security and redaction tests when changing stored metadata or report rendering.

For local isolated browser storage, set `PLAYWRIGHT_BROWSERS_PATH` before both installation and verification. `FOCUS_TRAIL_WORK_DIR` selects where clean consumer intermediates are created; the default is the neighboring workspace `work/` directory. Do not commit `node_modules`, browser binaries, temporary consumers or incidental screenshots.

Run `npm run demo` for the dialog workshop. `npm run demo:record` regenerates locally controlled example reports. Keep changes to fixture identity and reviewed baseline contracts explicit; do not add baseline auto-accept or upload behavior.

Changes should state the user-visible behavior, the validation run, and coverage limits. Update [qualification evidence](docs/qualification.md) with measured results. Independent installations, inclusive user feedback and report usability belong in the [pilot record](docs/pilot.md); passing local tests cannot substitute for them.

CI has read-only repository permissions and retains no artifacts by default. The manual release workflow qualifies and packs a candidate only. Public npm publication is outside that workflow and stays blocked until the three independent maintainer installations and other pilot requirements are documented and approved.
