# Pilot engineering evidence

All files here describe local synthetic engineering checks. They are excluded from the human receipt directory and never count as independent maintainer installations.

The frozen candidate is unchanged: SHA-256 `79bac5b64c1f96e7cb684e4bb746cc37af4bda902f719590bacc3984fb8e67e4`.

- `combined-tests.log`: 37 checks passed on Node 24.22.0 (9 extraction and 28 receipt/scoring checks). Extraction checks use the actual consumer-installed candidate.
- `ordinary-ground-truth.json`: all six ordinary Playwright assertion runs and active-element observations, sealed before any Focus Trail run. Compare its hash with `../task-key.json`.
- `task-process-receipts.json`: actual process exits, including the expected failing regression runs. Expected failures are preserved.
- `task-browser-inspection.json`: six traces opened in the Playwright 1.64.1 viewer; four Focus Trail HTML comparisons opened offline with no page errors or remote requests.
- `../task-verification.json`: environment, primary-evidence hashes, trace authenticity and paired artifact byte hashes.
- `../participant-archive-verification.json` and `../task-archive-verification.json`: final ZIP contents, source equality and checksums.
- `../review.md`: independent findings, fixes and limits.
- `accounting-red-maximum-subset-node24.log`: the count defect reproduced before its fix; `accounting-green-final-node24.log` shows the corrected suite.
- `test-portability-*-before-fix.log`: caught failures in relocated verification tests; see the review note. They are not hidden or counted as passing checks.

To rerun the shipped script checks, use Node 24. Install the attached candidate and exact Playwright peer in a separate test consumer repository, then run from the pilot directory:

```sh
FOCUS_TRAIL_TEST_REPOSITORY="/absolute/path/to/consumer-repository" node --test operator/verification/tests/*.test.mjs
node operator/score.mjs receipts/
```

For PowerShell, set `$env:FOCUS_TRAIL_TEST_REPOSITORY` before the Node command. The test fixtures are temporary, explicitly synthetic, and removed; no human receipts are created.

The diagnostic traces begin after application loading, retain real keyboard actions/screenshots/DOM snapshots and are unedited. They omit executable application source by starting recording after it loads. Ordinary API/assertion outcomes and the authored contract remain available in the task packets. This deliberately narrower trace does not measure navigation/startup diagnosis; both A and B have identical ordinary artifacts.

Focus Trail's BODY observation carries its missing-focus/historical-sample qualification. It must not be described as a fresh unqualified checkpoint measurement. The independent ordinary browser evidence confirms the destination for these fixtures.

The current human status is separately recomputed in `../status.json`: no enrolled/confirmed participants, 0/5 assessments, 0/3 installations, release pending. No statistical superiority or real-world adoption conclusion follows from these engineering checks.
