# Extracted PyRIT dialog fixture

This is the runnable **extracted and adapted** Remove-dialog source mechanism described in [the evidence README](../README.md). It is not the complete PyRIT application.

From this directory, using Node 24 with the parent Focus Trail repository dependencies and pinned full Chromium installed:

```sh
npm ci --no-audit --no-fund
npm install --no-save --package-lock=false --legacy-peer-deps --no-audit --no-fund ../focus-trail-tested-0.1.0.tgz
node verify.mjs
```

The preserved tarball is the exact package installation tested for these receipts. The verifier imports Playwright 1.64.1 from the repository by absolute path, uses the full Chromium channel, starts an ephemeral Vite server, and closes it after all four scenarios. It saves receipts in the parent evidence folder. Set `FOCUS_TRAIL_RECEIPTS` to another directory to keep the original receipts.

`src.jsx` preserves the pinned upstream controlled-state dialog before and the restore hook/opener ref/post-commit effect after. `upstream/` contains the primary source snapshots and MIT license. Dependency overrides and the fixture lock preserve the shared original upstream graph. Runtime/version checks reject a mismatch before verification.
