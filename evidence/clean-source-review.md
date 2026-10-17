# Clean-source setup qualification

A fresh local Git clone had no ignored `dist/` output. After `npm ci`, the original typecheck-before-build sequence failed with TS2307 on the demo public-package import, plus downstream implicit-any errors. The red receipt is `evidence/investigation/clean-source-before-fix.log`.

The verification script now runs lint, build, typecheck, the full test suite, and package smoke in that order. From this clean checkout, `CI=true npm run verify` passed 114 unit tests, 34 integration tests, 8 report tests, and 56 installed-consumer checks. Playwright used its default cache, and the application test server bootstrapped without a pre-existing server. The green receipt is `evidence/clean-source-verification.log`. This is local macOS verification in CI mode, not execution on GitHub's Linux runners.

The delivered tarball was produced and installed by that clean checkout, then copied unchanged to `evidence/package/focus-trail-0.1.0.tgz`. Its qualification receipt and command logs were copied alongside it. This additional engineering installation does not count as an independent human pilot installation.
