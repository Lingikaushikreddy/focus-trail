# Quickstart

Use the candidate tarball in an existing Playwright project with Node 24.22, `@playwright/test` 1.64.1, and the Chromium installed by that peer version. The candidate is not published automatically.

```sh
npm install --save-dev /path/to/focus-trail-0.1.0.tgz @playwright/test@1.64.1
npx playwright install chromium
```

Keep the browser, viewport and locale explicit:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: { browserName: 'chromium', channel: 'chromium', viewport: { width: 1280, height: 800 }, locale: 'en-US' },
  reporter: [['list'], ['focus-trail/reporter', {
    baselineDir: './focus-trail-baselines', outputDir: './focus-trail-reports',
  }]],
});
```

Replace the base Playwright `test` import with `test` from `focus-trail`. Continue importing `expect` from `@playwright/test`. Each test receives a `journey(page, testInfo, options)` factory:

```ts
import { expect } from '@playwright/test';
import { test } from 'focus-trail';

test('settings dialog', async ({ page, journey }, testInfo) => {
  await page.goto('http://127.0.0.1:49371/?variant=good');
  const trail = journey(page, testInfo, {
    journeyId: 'settings.dialog', fixtureVersion: 'settings-v1',
    checkpointTimeoutMs: 1000, masks: ['known private label'],
  });
  await trail.press('Tab');
  await trail.expectFocus('dialog.opener', page.getByTestId('opener'));
  await trail.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await trail.expectFocus('dialog.save', page.getByTestId('save'));
  await trail.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await trail.expectFocus('dialog.return', page.getByTestId('opener'));
  const result = await trail.finish();
  expect(result.status).toBe('passed');
});
```

`press()` sends a real Playwright keyboard action. Supported keys are `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, and `ArrowRight`.

`expectFocus(id, locator)` requires exactly one target in the same page's main document, then waits for eventual focus within its bounded timeout. The ID is the stable `expectedTargetKey` recorded in JSON. Keep an ID when the semantic destination is unchanged, even if a visible label or DOM test ID changes. Use application assertions for opening, saving and closing behavior.

`finish()` returns the JSON result and attaches it to the Playwright result. The fixture also finalizes on teardown and refreshes an earlier attachment after a later test failure. A failed checkpoint, keyboard action, or external test assertion cannot become a passing recorded run.

Options:

| Option | Purpose and maximum |
| --- | --- |
| `journeyId` | Required stable journey identity. Use a distinct ID for a distinct authored contract. |
| `fixtureVersion` | Required identity of the tested fixture. A mismatch is incomparable. |
| `appBuild` | Optional explanatory build label; ignored by equality. |
| `checkpointTimeoutMs` | Default and maximum 5,000ms; choose a smaller positive bound when suitable. |
| `maxActions` | Default and maximum 50 keyboard actions. |
| `maxDurationMs` | Default and maximum 30,000ms from journey creation. |
| `masks` | Optional case-sensitive literal strings replaced with `[redacted]` in captured text. |

There are at most 50 checkpoints, independent of the action limit. Calls serialize and steps have contiguous zero-based indices. Default capture has no screenshots. Redaction is an explicit aid: review accessible names and any input screenshot before sharing an artifact.

The advanced `createJourney(page, testInfo, options)` helper is also exported. Its callers own the lifecycle; prefer the `journey` fixture for automatic teardown and preservation of external test failures.

Run `npx playwright test`. Open the generated reporter index and inspect the capture. A `<hash>.json` companion contains `reviewStatus`, `current`, and an optional `comparison`; `reports.json` is the report manifest. Follow [baseline review](baseline-review.md) to establish a baseline. The reporter creates reports and diagnostics locally and does not upload them.

After extracting raw JSON, compare directly with `npx focus-trail compare baseline.json current.json --out report.html`. See [limits](limits.md) for comparison outcomes and coverage boundaries.
