import { test, expect, chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { Comparison, JourneyResult } from '../../packages/core/src/types.js';
import { render, renderRun } from '../../packages/reporter/src/render.js';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1QAAAAASUVORK5CYII=';
function run(): JourneyResult {
  return { schemaVersion: 1, journeyId: 'dialog keyboard', browserVersion: 'chromium-1', viewport: { width: 1280, height: 800 }, locale: 'en-US', fixtureVersion: 'v1', status: 'passed', steps: [
    { index: 0, action: 'Tab', elapsedMs: 10, status: 'passed', observed: { tag: 'button', role: 'button', name: 'Open dialog', testId: 'open' } },
    { index: 1, action: 'Enter', elapsedMs: 15, status: 'passed', observed: { tag: 'button', role: 'button', name: 'Close dialog', testId: 'close' } },
    { index: 2, action: null, checkpointId: 'dialog.close', expectedTargetKey: 'dialog.close', elapsedMs: 22, status: 'passed', observed: { tag: 'button', role: 'button', name: 'Close dialog', testId: 'close' } },
    { index: 3, action: 'Escape', elapsedMs: 31, status: 'passed', observed: { tag: 'button', role: 'button', name: 'Open dialog', testId: 'open' } },
  ] };
}
function regression(): Comparison {
  const base = run();
  const current = run();
  current.status = 'failed';
  current.steps[2] = { ...current.steps[2], status: 'failed', observed: { tag: 'button', role: 'button', name: 'Delete account', testId: 'delete' }, error: 'Focus assertion failed: expected Close dialog; observed Delete account' };
  return { status: 'regressed', base, current, firstDifference: { index: 2, checkpointId: 'dialog.close', kind: 'checkpoint', reason: 'Focus assertion failed at dialog.close' } };
}

test('selects the exact first difference and supports real keyboard step controls', async ({ page }) => {
  await page.setContent(render(regression()));
  const steps = page.getByRole('navigation', { name: 'Journey steps' }).getByRole('button');
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(2)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('heading', { name: 'First difference' })).toBeVisible();
  await expect(page.getByTestId('step-detail')).toContainText('dialog.close');
  await expect(page.getByTestId('baseline-evidence')).toContainText('Close dialog');
  await expect(page.getByTestId('current-evidence')).toContainText('Delete account');
  await page.keyboard.press('Tab');
  await expect(steps.nth(0)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('step-detail')).toContainText('Tab');
  await page.keyboard.press('ArrowDown');
  await expect(steps.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
  await page.keyboard.press('End');
  await expect(steps.nth(3)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(steps.nth(0)).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('step-detail')).toContainText('Escape');
});

test('shows a run failure separately when the recorded checkpoints passed', async ({ page }) => {
  const base = run();
  const current = { ...run(), status: 'failed' as const, error: 'Dialog did not open after activation' };
  await page.setContent(render({ status: 'regressed', base, current, firstDifference: { index: 4, kind: 'run-failure', reason: current.error } }));
  await expect(page.getByRole('navigation', { name: 'Journey steps' }).getByRole('button', { name: /Run outcome/ })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('current-evidence')).toContainText('Dialog did not open after activation');
});

test('highlights the actual failed key action rather than a later run outcome', async ({ page }) => {
  const base = run();
  const current = run();
  current.status = 'failed';
  current.steps[1] = { ...current.steps[1], status: 'failed', error: 'Enter key could not be delivered' };
  await page.setContent(render({ status: 'regressed', base, current, firstDifference: { index: 1, kind: 'run-failure', reason: current.steps[1].error! } }));
  const steps = page.getByRole('navigation', { name: 'Journey steps' }).getByRole('button');
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('step-detail')).toContainText('Enter key could not be delivered');
});

test('qualifies retained focus evidence in the observed-target summary when a later capture is unavailable', async ({ page }) => {
  const comparison = regression();
  comparison.current.steps[2].observed = {
    tag: 'button', role: 'button', name: 'Save changes', testId: 'save',
    unavailable: 'Latest capture unavailable; last coherent observation at 32 ms',
  };
  await page.setContent(render(comparison));
  const summary = page.getByRole('region', { name: 'Comparison summary' });
  await expect(summary).toContainText('Save changes');
  await expect(summary).toContainText('Latest capture unavailable; last coherent observation at 32 ms');
});

test('hostile names, roles, ids, builds and errors remain literal text', async ({ page }) => {
  const payload = '</script><img src="https://bad.invalid/leak" onerror="globalThis.pwned=1">';
  const current = run();
  current.journeyId = payload;
  current.appBuild = payload;
  current.error = payload;
  current.steps[0] = { ...current.steps[0], checkpointId: payload, expectedTargetKey: payload, error: payload, observed: { tag: payload, role: payload, name: payload, testId: payload } };
  const requests: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.setContent(renderRun(current));
  await expect(page.locator('body')).toContainText(payload);
  expect(await page.evaluate(() => 'pwned' in globalThis)).toBe(false);
  await expect(page.locator('img')).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.getByRole('navigation', { name: 'Journey steps' }).getByRole('button').nth(1).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('current-evidence')).toContainText('Close dialog');
});

test('opens a portable report offline with no remote requests and missing-image text', async ({ page, context }, testInfo) => {
  const current = run();
  current.steps[0].screenshot = 'https://bad.invalid/leak.png';
  const reportPath = testInfo.outputPath('offline-report.html');
  await writeFile(reportPath, renderRun(current));
  const remoteRequests: string[] = [];
  page.on('request', request => { if (/^(?:https?|wss?):/.test(request.url())) remoteRequests.push(request.url()); });
  await context.setOffline(true);
  await page.goto(pathToFileURL(reportPath).href);
  await expect(page.getByTestId('current-evidence')).toContainText('Open dialog');
  await expect(page.getByTestId('current-evidence')).toContainText('No screenshot captured');
  await page.getByRole('button', { name: /Step 4/ }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('step-detail')).toContainText('Escape');
  expect(remoteRequests).toEqual([]);
});

test('a raster image that cannot decode falls back to readable focus evidence', async ({ page }) => {
  const current = run();
  current.steps[0].screenshot = 'data:image/png;base64,iVBORw0KGgo=';
  await page.setContent(renderRun(current));
  await expect(page.getByTestId('current-evidence')).toContainText('Open dialog');
  await expect(page.getByTestId('current-evidence').getByText('Screenshot unavailable. Text evidence is available above.')).toBeVisible();
  await expect(page.getByTestId('current-evidence').locator('img')).toBeHidden();
});

test('focus evidence works with images disabled, at narrow width and 200% text zoom', async () => {
  const browser = await chromium.launch({ channel: 'chromium', args: ['--blink-settings=imagesEnabled=false'] });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 800 }, reducedMotion: 'reduce' });
    const current = run();
    current.steps[0].screenshot = png;
    await page.setContent(renderRun(current));
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expect(page.getByTestId('current-evidence')).toContainText('Open dialog');
    await expect(page.getByTestId('current-evidence')).toContainText('Text evidence');
    const step = page.getByRole('button', { name: /Step 3/ });
    await step.focus();
    await page.keyboard.press('Space');
    await expect(step).toHaveAttribute('aria-current', 'step');
    await expect(page.getByTestId('current-evidence')).toContainText('Close dialog');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally { await browser.close(); }
});
