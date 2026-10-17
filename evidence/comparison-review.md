# Task 3: schema validation and comparison

Owned deliverables: `packages/core/src/compare.ts`, `tests/unit/compare.test.ts`, `tests/unit/fixtures.ts`. No commits or other implementation edits.

## Implemented

- `InvalidJourneyError`, `parseJourney(unknown): JourneyResult`, and `compare(JourneyResult, JourneyResult): Comparison` are exported.
- Parser accepts JSON strings and plain objects, validates exact schema version 1, required nonempty metadata, positive finite viewport, supported keys, run and step statuses, observed nullable text, zero-based contiguous indices, and separate action/checkpoint fields. Checkpoints require an author-supplied expected target key.
- Limits: 100 steps, 10 MiB JSON input, individual explanatory strings 65,536 characters, 60,000ms step timing, and 4 MiB decoded screenshot bytes. Object serialization stops when accumulated content exceeds the JSON size limit. Sparse arrays are rejected.
- Screenshot evidence accepts canonical base64 raster data URLs for PNG/JPEG/WebP with matching binary signatures. Remote paths, URLs, SVG and HTML data URLs are rejected. This is format validation, not a full image decode or pixel-dimension check.
- Parser constructs a detached graph containing only defined schema fields. Unknown cookie, input value and HTML fields are stripped at every retained level.
- Failed baselines (root or any step) throw. Metadata mismatches are incomparable. Contract changes require baseline review. First checkpoint/action/contract difference is reported at its real index. External run failure after passed steps is reported at `steps.length` and can never be unchanged.
- Equality ignores timing, screenshot, observed descriptive metadata, and application build.

## Verification

- Initial assertion red run against scaffold: 70 failed / 10 passed. `compare-red.log`.
- Additional sparse-array regression test failed before changing `.map` to `Array.from`. `compare-sparse-red.log` includes other concurrent suites because the unit script had not yet been corrected to filter arguments.
- Final `npm run test:unit -- compare`: 88 passed. `compare-green.log`.
- Owned-file ESLint: exit 0.
- Repository `npm run typecheck`: exit 0 at this point in construction.
- Full `npm test` was attempted before the root requested waiting for stable modules. Unit phase: 95 passed / 11 failed; integration and e2e did not run. This is not an aggregate green claim. `compare-full-suite.log`.

Those concurrent failures were:

1. `cli.test.ts`: returns0 and writes a portable report for passing unchanged.
2. `cli.test.ts`: returns1 for failed current even when all focus steps passed.
3. `render.test.ts`: includes key and both target descriptions at the first differing checkpoint.
4. `render.test.ts`: reports a captured run without inventing a reviewed passing baseline.
5. `render.test.ts`: keeps hostile evidence inert in markup and embedded state.
6. `render.test.ts`: embeds only PNG or JPEG data URLs and supplies text without screenshots.
7. `render.test.ts`: consumes body and path attachments with collision-safe reports without changing baselines.
8. `render.test.ts`: leaves absent baselines review pending and does not create any.
9. `render.test.ts`: surfaces invalid baseline diagnostics and fails the tool separately from the test.
10. `render.test.ts`: fails regressions while preserving an already failed or interrupted test run.
11. `render.test.ts`: ignores unrelated attachments but exposes malformed Focus Trail JSON.

## Integration details

- The reporter knows `run-failure` at `steps.length` needs a dedicated run-outcome item.
- Metadata incompatibility is checked before current outcomes, so a failed current with incompatible metadata is incomparable. Otherwise any current failure is regressed. Invalid baseline has priority over both.
- Parser intentionally validates shape separately from semantic root/step outcome consistency: contradictory passed root/failed checkpoint still cannot be green, and cannot be a valid baseline.
