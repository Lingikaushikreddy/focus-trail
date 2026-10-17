# Focus Trail

Focus Trail adds reviewable keyboard focus journeys to existing Playwright tests. Record a short sequence of real keyboard actions, assert authored focus targets, and compare the result with a reviewed passing baseline. A portable HTML report points to the first changed checkpoint or failed run.

This is a local MVP candidate. The [pilot release gate](docs/pilot.md) requires three independent maintainer installations and inclusive user feedback; local qualification does not establish adoption or accessibility compliance.

Use Node 24.22 and `@playwright/test` 1.64.1 with its pinned Chromium installation. Install the candidate tarball from `evidence/package/` into your existing Playwright project:

```sh
npm install --save-dev /path/to/focus-trail-0.1.0.tgz @playwright/test@1.64.1
npx playwright install chromium
```

Add the reporter to your Playwright configuration:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: { browserName: 'chromium', channel: 'chromium', viewport: { width: 1280, height: 800 }, locale: 'en-US' },
  reporter: [
    ['list'],
    ['focus-trail/reporter', { baselineDir: './focus-trail-baselines', outputDir: './focus-trail-reports' }],
  ],
});
```

Use the exported `test` fixture so finalization preserves failures from ordinary application assertions:

```ts
import { expect } from '@playwright/test';
import { test } from 'focus-trail';

test('dialog returns focus', async ({ page, journey }, testInfo) => {
  await page.goto('http://127.0.0.1:49371/?variant=good');
  const trail = journey(page, testInfo, {
    journeyId: 'settings.dialog', fixtureVersion: 'settings-v1',
    masks: ['literal private label'],
  });
  await trail.press('Tab');
  await trail.expectFocus('dialog.opener', page.getByTestId('opener'));
  await trail.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await trail.expectFocus('dialog.save', page.getByTestId('save'));
  await trail.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await trail.expectFocus('dialog.return', page.getByTestId('opener'));
  await trail.finish();
});
```

Checkpoint IDs are stable, author-defined expected target keys. Observed names, roles and test IDs help explain a result; they do not define equality. Activation and other application behavior remain ordinary Playwright assertions. A failed test remains a failed recorded journey even when every focus checkpoint passed.

Reports without a reviewed baseline show review pending. Follow [baseline review](docs/baseline-review.md) before copying a passing capture into the baseline directory. The package never accepts or updates baselines automatically.

```sh
npx focus-trail compare baseline.json current.json --out report.html
```

The CLI returns `0` for unchanged, `1` for regressed, `2` for invalid input or a tool failure, and `3` for incompatible comparison metadata. Browser version, viewport, actual locale, journey ID and fixture version must agree.

Capture is text only by default. It records the focused element's tag, accessible role/name and optional test ID; it does not persist DOM, form values, cookies, or a full accessibility tree. Literal masks redact captured text. Optional screenshots supplied as input need a separate privacy review. Reports stay local and self-contained.

- [Quickstart and API](docs/quickstart.md)
- [Reviewed baseline workflow](docs/baseline-review.md)
- [Scope and limits](docs/limits.md)
- [Qualification evidence](docs/qualification.md)
- [Independent pilot kit](docs/pilot.md)
- [Contribution and verification](CONTRIBUTING.md)

Run the local dialog workshop with `npm run demo`, then open [the demo](http://127.0.0.1:49371). After `npm run demo:record`, its report links show the working journey, lost return, escaped focus and activation failure. These are deliberately controlled fixtures.

From a repository checkout, `npm ci`, `npx playwright install chromium`, and `npm run verify` check source, browser flows and the packed installation. The clean consumer test writes the tarball, command logs, reports and `verification.json` to `evidence/package/`. The manual release workflow qualifies a candidate; publishing remains gated on independent pilot evidence. MIT licensed.
