# Five-maintainer qualification pilot

Status: prepared; **no participant results or independent installations collected**. Local package smoke tests are engineering evidence and do not satisfy external gates.

Use five maintainers who already run Playwright. Obtain permission before recording their work. Ask them to install the candidate in a fresh copy of a local test application and instrument one existing dialog journey. Record installation failures as well as successes; do not discard troubleshooting time. Record first useful result time separately from report review time; original target is under ten minutes.

## Paired review tasks

Give each participant two unseen, equivalent focus-return failures with different labels. Compare ordinary Playwright assertions plus traces (A) with the same artifacts plus Focus Trail (B). Three participants receive A then B; two receive B then A. Rotate which failure appears under which condition. Include a benign change so accepting a changed baseline is a real decision.

Start the clock when artifacts open. Stop when the reviewer correctly identifies the first changed checkpoint, expected/observed destinations, and reproducible key sequence. Record incorrect diagnoses, wrong baseline approvals, assistance, elapsed time, preference, and why. Use task ground truth established independently before the session. Ask a keyboard user to assess the report itself; record that assessment separately from developer preference and offer compensation for substantial time.

## Decision criteria, set before recruitment

- Original 48-hour gate: five assessments, three recognizing a recent real issue and two agreeing to integrate.
- Original day-14 gate: two independent working integrations and one maintainer preferring the artifact to a plain trace.
- Public release gate: three independent successful installations.
- Added diagnostic gate: at least three of five correctly diagnose faster with B, and B introduces no additional wrong baseline approvals. This is a product decision threshold, not a statistical claim.

Report individual outcomes, medians, order effects, failures, and uncertainty. If the tool saves no meaningful setup/review effort or increases mistaken approvals, preserve the upstream-or-stop option. Leave public release pending until its gate is met.

Results sheet: `evidence/pilot-results.csv`. Blank cells are pending evidence, not zero outcomes.
