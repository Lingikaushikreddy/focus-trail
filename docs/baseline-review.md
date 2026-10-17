# Review and record a baseline

A passing capture becomes a baseline only after an author reviews the intended journey. Focus Trail never writes or updates a baseline directory. With no baseline, the report stays review pending.

1. Run the authored test against the intended working application or fixture. Keep the pinned Chromium version, explicit viewport and locale consistent.
2. Open the HTML report and inspect the exact action order, checkpoint IDs, observed targets and ordinary application assertions. Verify that each checkpoint locator identifies the intended unique main-document target. A pass can still reflect a wrongly authored locator.
3. Review any sensitive labels, literal masks, errors and optional images. Record who approved the journey and why. Retain the source test and fixture version with the review.
4. Extract the raw `current` result from its `<hash>.json` reporter companion. Reporter envelopes and `reports.json` are not raw journey baselines.

```sh
node --input-type=module - focus-trail-reports/HASH.json current.json <<'NODE'
import { readFile, writeFile } from 'node:fs/promises';
import { parseJourney } from 'focus-trail';
const report = JSON.parse(await readFile(process.argv[2], 'utf8'));
const current = parseJourney(report.current);
await writeFile(process.argv[3], JSON.stringify(current, null, 2) + '\n', { flag: 'wx' });
NODE
```

After approving that extracted result, explicitly copy a passing journey to the baseline directory. This command rejects failed records and an existing baseline, so changes require another review decision:

```sh
node --input-type=module - current.json <<'NODE'
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseJourney } from 'focus-trail';
const current = parseJourney(await readFile(process.argv[2], 'utf8'));
if (current.status !== 'passed' || current.steps.some(step => step.status !== 'passed')) {
  throw new Error('Only a reviewed passing journey can be a baseline');
}
await mkdir('focus-trail-baselines', { recursive: true });
const target = join('focus-trail-baselines', encodeURIComponent(current.journeyId) + '.json');
await writeFile(target, JSON.stringify(current, null, 2) + '\n', { flag: 'wx' });
console.log('Recorded reviewed baseline:', target);
NODE
```

Commit the baseline and its review note through your project's normal review process. The reporter resolves `<encodeURIComponent(journeyId)>.json` in `baselineDir`; keep the encoded filename within 200 characters. For `settings.dialog`, the filename is `settings.dialog.json`.

Rerun the same journey and inspect its comparison. Added or removed actions/checkpoints, changed action keys, checkpoint IDs or expected target keys produce a journey-change regression and require baseline review. A semantic change to the journey should be reflected in source and reviewed together with its new baseline.

Browser version, viewport, actual locale, journey ID or fixture version differences are incomparable. Align the environments or review a new baseline for the new environment. Timings, optional screenshots, observed tag/name/role/test ID, and application build labels are explanatory evidence and do not change equality.

The CLI refuses output paths that overwrite either input. It returns `2` for a failed baseline, `3` for incompatible metadata, `1` for a regression, and `0` for a successful unchanged journey. A failed current run remains regressed even if every recorded focus checkpoint passed.

The package smoke test explicitly approves its deterministic synthetic fixture for engineering verification. That local fixture review does not approve application baselines or count toward the independent pilot gate.
