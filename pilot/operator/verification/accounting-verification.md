# Receipt scorer verification

Own deliverables: `operator/score.mjs`, `operator/receipt-format.md`, `receipts/template.json` under `outputs/focus-trail-pilot/`.

- Initial blank-record test failed because the CLI did not exist: `red-initial.log`.
- Conservative scaffold passed 2 tests and failed 15 behavior assertions: `red-full.log`.
- Prototype participant lookup regression failed before the own-property fix: `red-boundary.log`.
- Source-aligned reporter status, exact Chromium version, required path/timing, separate benign decisions, answer disclosure and time-bound tests failed before their scoring changes: `red-scoring-boundaries.log` (13 passed, 14 failed).
- Reviewer regression: greedy selection reported 1 instead of 2 for overlapping three receipts and 2 instead of the valid p02/p03/p04 group of 3. Both literal regressions failed on Node 24 before the maximum-cardinality subset fix: `red-maximum-subset-node24.log`.
- Final complete accounting suite: `work/runtime/node_modules/node/bin/node --test work/focus-trail-pilot/accounting/score.test.mjs` — **28 passed, 0 failed**, exit 0. Full output: `green-final-node24.log`.
- `work/runtime/node_modules/node/bin/node --check outputs/focus-trail-pilot/operator/score.mjs` — exit 0.
- Real empty receipt directory: `work/runtime/node_modules/node/bin/node outputs/focus-trail-pilot/operator/score.mjs outputs/focus-trail-pilot/receipts/` — exit 0; installations 0/3; assessments 0/5; all predefined pilot decision gates false; keyboard assessment pending; public release pending; publication not performed. Output: `blank-status-node24.json`.
- Template check: all 63 scalar leaves null. Synthetic fixtures are created and removed under `work/focus-trail-pilot/accounting/`; no test outcomes are stored in `receipts/`.

Final verification runtime was **Node v24.22.0**, using the explicit `work/runtime/node_modules/node/bin/node` path. Earlier development logs used Node v26.8.1. Candidate receipt qualification separately requires recorded Node 24, Playwright 1.64.1 and Chromium 156.0.8078.4. This verification is engineering evidence, never an independent human installation.

Rulings aligned with the operator's source review: actual review status is `review-pending`; keyboard assessment is reported separately from predefined numerical release criteria; benign approval of a reviewed passing capture is not an unsafe regression approval. Counts trust reviewed participant-confirmed claims and cannot authenticate them.
