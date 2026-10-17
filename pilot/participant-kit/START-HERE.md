# Focus Trail installation exercise

Use the attached candidate in **a repository you maintain**, on your own machine. The supplied demonstration and diagnostic tasks help explain the tool; they do not qualify as your independent installation. Share only the summary receipt you review. The report and your application artifacts stay local.

The first useful report target is under ten minutes; it is a target we are measuring. Count dependency/browser downloads, application startup, failed attempts and help in the elapsed time. At fifteen minutes, stop for the session and retain the outcome if setup is incomplete. You can finish later and submit a new confirmed receipt.

## Before starting

Choose a short existing keyboard dialog test in the main document of your application. This candidate supports one Chromium page, with at most 50 real key actions and 50 focus checkpoints, in 30 seconds. Frames, shadow roots and screen-reader behavior are outside this pilot. An app with no eligible test is a recruitment mismatch, not a successful install.

The package requires Node major 24 and exactly Playwright 1.64.1. Node 24.22.0 and Chromium 156.0.8078.4 were qualified locally. Use your normal runtime manager if needed; record this time and any blocker. Do not use dependency-conflict overrides such as `--force` or `--legacy-peer-deps`.

Start a timer when this kit and instructions become available. Record your participant ID, a repository alias and an environment alias. Keep the alias-to-real-name mapping with the facilitator; no private repository name is required in a shared receipt.

## 1. Verify and isolate

From the extracted kit's `candidate` directory on macOS/Linux:

```sh
shasum -a 256 -c SHA256SUMS
```

On Windows PowerShell, run `Get-FileHash .\focus-trail-0.1.0.tgz -Algorithm SHA256` and compare it to `manifest.json`. Stop if it differs. The expected SHA-256 is:

`79bac5b64c1f96e7cb684e4bb746cc37af4bda902f719590bacc3984fb8e67e4`

From a committed copy of your repository, create a worktree (change `p01` to your assigned ID):

```sh
git worktree add -b codex/focus-trail-pilot-p01 ../focus-trail-pilot-p01 HEAD
cd ../focus-trail-pilot-p01
node --version
```

Uncommitted application changes are not copied. Use your project's normal setup in the isolated copy. If worktrees are unavailable, use an isolated clone/branch and record that choice.

Install the actual attached file; replace the absolute path with your extracted kit location:

```sh
npm install --save-dev --save-exact "/absolute/path/to/participant-kit/candidate/focus-trail-0.1.0.tgz" @playwright/test@1.64.1
npx --no-install playwright install chromium
npx --no-install playwright --version
```

Use your repository's package manager if it is not npm; keep the candidate file and peer version exact. Record the equivalent commands and exits. A peer conflict or unavailable runtime is a pilot result.

## 2. Retain your application setup

Copy your existing Playwright config to `playwright.focus-trail.config.ts`. Retain the actual application startup command, `baseURL`, setup/authentication and the chosen Chromium project's fixtures/options. Keep required setup/dependency projects (for example a `setup` project that prepares authentication), and keep one Chromium journey project named `focus-trail-pilot`. Retain its dependency references; selecting the journey project will run those dependencies too. Apply these options in that journey project's `use` so inherited device settings cannot override them:

```ts
use: {
  // Keep your actual baseURL, storageState and other necessary app options.
  browserName: 'chromium',
  channel: 'chromium',
  viewport: { width: 1280, height: 800 },
  locale: 'en-US',
  trace: 'off', screenshot: 'off', video: 'off',
},
```

Use retries `0`, workers `1`, and a dedicated output directory. Configure:

```ts
reporter: [['list'], ['focus-trail/reporter', {
  baselineDir: './focus-trail-baselines',
  outputDir: './focus-trail-reports-pilot-1',
}]],
```

These are edits to your working application config, not a replacement for it. Preserve necessary project dependencies/auth setup. Run a single selected test. Use a fresh reporter directory for each run to prevent stale captures. The reporter never writes baselines.

## 3. Instrument your existing test

For a test that uses the standard Playwright `page` fixture, import `test` from `focus-trail` and keep `expect` from Playwright. Adapt this example to your existing route, keyboard sequence and unique intended targets:

```ts
import { test } from 'focus-trail';
import { expect } from '@playwright/test';

test('existing dialog keyboard contract', async ({ page, journey }, testInfo) => {
  await page.goto('/your-existing-dialog-page'); // uses your application's baseURL
  const trail = journey(page, testInfo, {
    journeyId: 'pilot.dialog', fixtureVersion: 'your-dialog-v1',
    checkpointTimeoutMs: 1000,
    masks: ['a known sensitive literal, if applicable'],
  });
  await trail.press('Tab'); // retain your actual keyboard route, which may need more Tabs
  await trail.expectFocus('opener', page.getByTestId('your-dialog-opener'));
  await trail.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await trail.expectFocus('initial-target', page.getByTestId('your-intended-first-target'));
  await trail.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await trail.expectFocus('closed-target', page.getByTestId('your-dialog-opener'));
  expect((await trail.finish()).status).toBe('passed');
});
```

Use real `trail.press()` keys; do not add `locator.focus()`, browser-evaluated focus changes or clicks to force the test to pass. Application code may naturally manage focus. Retain ordinary assertions for activation, closing and application behavior. The checkpoint locator must identify exactly one intended main-document element. Stable checkpoint IDs describe intent; keep them when a visible label changes.

**Custom test fixtures:** replacing your repository's extended `test` import can remove required fixtures. For this first attempt, choose a self-contained existing `page` test. If that is not possible, record the integration blocker rather than silently dropping fixtures. The advanced `createJourney` helper is available, but its caller owns teardown and failure finalization; a merged custom-fixture recipe has not been qualified in this kit.

Run your authored test (adapt its path):

```sh
npx --no-install playwright test tests/focus-trail-pilot.spec.ts --config=playwright.focus-trail.config.ts --project=focus-trail-pilot --workers=1 --retries=0
```

Open `focus-trail-reports-pilot-1/index.html`, then the journey. Record the first useful result time. Without a baseline, a passing run should show `review-pending`. Confirm runner exit `0`, `testStatus: passed`, `current.status: passed`, and successful report generation/opening. An actual application regression is useful evidence, but it does not qualify as the required passing installation until resolved and rerun.

## 4. Review the baseline separately

A passing capture can still encode a wrongly authored expectation. Review the action sequence, intended unique targets, external assertions and sensitive text before approving it. Focus Trail collects accessible names, tags, roles and test IDs. Literal masks are limited aids; this does not redact arbitrary inherited Playwright traces or all errors. Do not send private artifacts by default.

From your repository root, extract the one journey (helper may remain in the kit):

```sh
node "/absolute/path/to/participant-kit/helpers/extract.mjs" focus-trail-reports-pilot-1 pilot.dialog current-1.json
```

`reports.json` is a manifest; the companion is an envelope. The helper selects exactly one match, uses the installed package validator, preserves failure status and refuses an existing output file. It does not approve a baseline.

Only after your review, create the baseline with this exclusive-write command. It rejects failed records and refuses replacement:

```sh
node --input-type=module - current-1.json <<'NODE'
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseJourney } from 'focus-trail';
const current = parseJourney(await readFile(process.argv[2], 'utf8'));
if (current.status !== 'passed' || current.steps.some(step => step.status !== 'passed')) {
  throw new Error('A reviewed passing journey is required');
}
await mkdir('focus-trail-baselines', { recursive: true });
await writeFile(join('focus-trail-baselines', encodeURIComponent(current.journeyId) + '.json'),
  JSON.stringify(current, null, 2) + '\n', { flag: 'wx' });
NODE
```

The heredoc above uses a POSIX shell. In PowerShell, save the JavaScript between `NODE` markers as `record-baseline.mjs` and run `node record-baseline.mjs current-1.json`.

Write a local review note with reviewer alias, date, test path, fixture version and reason. Change the reporter output directory to `focus-trail-reports-pilot-2`, rerun the same test and inspect `reviewStatus: unchanged`. Do not align metadata by editing captured evidence.

Optionally extract `current-2.json` and run:

```sh
npx --no-install focus-trail compare focus-trail-baselines/pilot.dialog.json current-2.json --out pilot-compare.html
```

CLI exits: `0` unchanged, `1` regression, `2` invalid input/tool error, `3` incompatible metadata. Record this separately from the Playwright runner exit. A failed current record must not become a new baseline.

## 5. Confirm the receipt

Give the facilitator only a reviewed, sanitized summary: participant/repository/environment aliases; candidate hash; Node, Playwright and Chromium versions; relative authored test path; install/browser/runner/CLI exits; test/capture/review statuses; setup and first useful report times; help, failures and your feedback. Browser version is in the raw capture's `browserVersion` field. Do not include absolute paths, private URLs, sensitive accessible names or raw logs. You can confirm a sanitized command excerpt, a local artifact reference and a witnessed run without sharing proprietary source.

An independent installation requires you to execute the work in your own maintained repository/environment, open a useful passing report and confirm the evidence. Facilitator help is recorded. A first passing `review-pending` report can count; approved baseline and day-14 working integration are separate outcomes. The supplied demo, prewired task packets and facilitator-operated commands do not count.
