import { test } from '../../../dist/index.js';
import { expect } from '@playwright/test';

for (const kind of ['return-focus', 'modal-containment', 'activation']) {
  test(kind, async ({ page, journey }, info) => {
    const variant = process.env.FOCUS_TRAIL_VARIANT ?? 'good';
    await page.goto('http://127.0.0.1:49371/?variant=' + variant);
    const trail = journey(page, info, { journeyId: kind, fixtureVersion: 'dialog-1', appBuild: variant, checkpointTimeoutMs: 500 });
    await trail.press('Tab'); await trail.expectFocus('opener', page.getByTestId('opener'));
    await trail.press('Enter');
    await expect(page.getByRole('dialog'), 'Enter should open the settings dialog').toBeVisible();
    if (kind !== 'activation') {
      await trail.expectFocus('save', page.getByTestId('save'));
      await trail.press('Tab'); await trail.expectFocus('cancel', page.getByTestId('cancel'));
      if (kind === 'modal-containment') { await trail.press('Tab'); await trail.expectFocus('save-wrap', page.getByTestId('save')); }
      else { await trail.press('Escape'); await trail.expectFocus('return-opener', page.getByTestId('opener')); }
    }
    await trail.finish();
  });
}
