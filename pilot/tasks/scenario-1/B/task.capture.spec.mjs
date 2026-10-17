import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('authored dialog keyboard contract', async ({ page, browser, context }, testInfo) => {
  const scenario = 'scenario-1';
  await page.goto('http://127.0.0.1:49282/' + scenario + '/task.capture');
  // Record the keyboard review after application scripts finish loading.
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const observed = () => page.evaluate(() => {
    const element = document.activeElement;
    return { tag: element?.tagName ?? null, role: element?.getAttribute('role') ?? (element?.tagName === 'BUTTON' ? 'button' : null), name: element?.tagName === 'BODY' ? null : element?.textContent?.trim() ?? null, testId: element?.getAttribute('data-testid') ?? null };
  });
  const oracle = { scenario, browserVersion: browser.version(), viewport: page.viewportSize(), locale: await page.evaluate(() => navigator.language), retries: testInfo.retry, channel: 'chromium', status: 'passed', steps: [] };
  const press = async key => {
    await page.keyboard.press(key);
    oracle.steps.push({ index: oracle.steps.length, action: key, observed: await observed(), status: 'passed' });
  };
  const checkpoint = async (key, testId) => {
    const target = page.getByTestId(testId);
    const step = { index: oracle.steps.length, action: null, checkpointId: key, expectedTargetKey: key, expected: { tag: 'BUTTON', testId }, observed: await observed(), status: 'passed' };
    oracle.steps.push(step);
    try { await expect(target, key).toBeFocused(); }
    catch (error) { step.status = 'failed'; oracle.status = 'failed'; throw error; }
  };
  try {
    await press('Tab'); await checkpoint('dialog.opener', 'opener');
    await press('Enter'); await expect(page.getByRole('dialog')).toBeVisible(); await checkpoint('dialog.save', 'save');
    await press('Tab'); await checkpoint('dialog.cancel', 'cancel');
    await press('Shift+Tab'); await checkpoint('dialog.save-again', 'save');
    await press('Escape'); await expect(page.getByRole('dialog')).toBeHidden(); await checkpoint('dialog.return', 'opener');
  } finally {
    await writeFile(testInfo.outputPath('ordinary-oracle.json'), JSON.stringify(oracle, null, 2));
    await context.tracing.stop({ path: testInfo.outputPath('trace.zip') });
  }
});
