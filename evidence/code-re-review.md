# Independent scoped re-review — review fix wave

Reviewed 2026-10-16. Scope was limited to `work/review-fixes.patch`, `work/review-fixes.md`, corresponding current reporter and package-smoke source, new tests, and the retained default/explicit-cache verification records. No source edits, tests, external calls, or broad re-review were performed.

| Finding | Verdict | Basis |
| --- | --- | --- |
| 1. No-baseline reporter false green for passed root with failed step | **ADDRESSED** | `packages/reporter/src/index.ts` normalizes the accepted record to failed before comparison/rendering and also checks step failures in final failure aggregation. New tests cover both unconfigured and missing baselines, actual manifest/HTML/index output, failed `onEnd` override, preserved Playwright status, and no baseline creation. They would fail against the original implementation. |
| 2. Clean consumer overrides the default Playwright cache | **ADDRESSED** | `scripts/test-pack.mjs` now inherits the caller environment without synthesizing a browser-cache path. It records and verifies the installed consumer's actual environment and executable path. Independently inspected `pack-cache-unset-verification.json` and `pack-cache-explicit-verification.json`: both show `status: passed`, 56 checks with no failures, preserved caller cache setting, and the correct distinct resolved browser paths. |
| 3. Reporter output directory can overwrite reviewed baseline files | **ADDRESSED** | The constructor rejects identical resolved directories and existing symlink aliases before any writes. Tests preserve the original bytes of valid `reports.json` and `diagnostics.json` baselines and verify no extra directory entries. A distinct nested output directory remains supported. The new guard does not create or alter baseline paths. |

No material new breakage found in this fix wave. Normalization preserves the original failed step and any run error; pending review is not converted to an invented comparison. The directory guard leaves distinct valid output/baseline layouts usable. Existing filesystem aliases are resolved before equality checking.

The scoped evidence resolves the three findings; the parent's in-progress full verification and rebuilt tarball are still the authority for final source/package qualification. The two retained smoke records establish wrapper/cache behavior and do not, by themselves, prove the final reporter changes are present in the eventual tarball.

Independent human installations, comparative pilot results, inclusive report assessment, and the public-release gate remain pending. This re-review does not change those external requirements.
