import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createJourney } from '../../packages/core/src/journey.js';
import { compare } from '../../packages/core/src/compare.js';
import { render } from '../../packages/reporter/src/render.js';
import type { JourneyResult } from '../../packages/core/src/types.js';

async function exercise(page: Page, info: TestInfo, variant: string, kind: 'return' | 'containment' | 'alternate') {
  await page.goto('http://127.0.0.1:49371/?variant=' + variant);
  const journey = createJourney(page, info, { journeyId: kind, fixtureVersion: 'dialog-1', appBuild: variant, checkpointTimeoutMs: 400 });
  let failure: unknown;
  try {
    await journey.press('Tab'); await journey.expectFocus('opener', page.getByTestId('opener'));
    await journey.press('Enter');
    await expect(page.getByRole('dialog'), 'Enter must actually open the dialog').toBeVisible();
    await journey.expectFocus('save', page.getByTestId('save'));
    await journey.press('Tab'); await journey.expectFocus('cancel', page.getByTestId('cancel'));
    if (kind === 'containment') { await journey.press('Tab'); await journey.expectFocus('save-wrap', page.getByTestId('save')); }
    else {
      await journey.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await journey.expectFocus(kind === 'alternate' ? 'next-step' : 'return-opener', page.getByTestId(kind === 'alternate' ? 'next' : 'opener'));
    }
  } catch (error) { failure = error; }
  return { result: await journey.finish(), failure };
}
async function evidence(info: TestInfo, name: string, base: JourneyResult, current: JourneyResult) {
  const directory = resolve('evidence/qualification'); await mkdir(directory, { recursive: true });
  const comparison = compare(base, current);
  const suffix = `${name}-${info.repeatEachIndex}`;
  await writeFile(resolve(directory, `${suffix}.json`), JSON.stringify({ base, current, comparison }, null, 2));
  if (info.repeatEachIndex === 0) await writeFile(resolve(directory, `${name}.html`), render(comparison));
  return comparison;
}
test('qualification detects exact lost-return checkpoint against independent body oracle', async ({ page }, info) => {
  const base = await exercise(page, info, 'good', 'return'); expect(base.failure).toBeUndefined();
  const current = await exercise(page, info, 'lost-return', 'return'); expect(current.failure).toBeInstanceOf(Error);
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  const comparison = await evidence(info, 'lost-return', base.result, current.result);
  expect(comparison.status).toBe('regressed');
  expect(comparison.firstDifference).toMatchObject({ index: 7, checkpointId: 'return-opener', kind: 'checkpoint' });
  expect(current.result.steps[7].observed.tag).toBe('body');
});
test('qualification detects escaping modal focus against independent locator oracle', async ({ page }, info) => {
  const base = await exercise(page, info, 'good', 'containment'); expect(base.failure).toBeUndefined();
  const current = await exercise(page, info, 'escape', 'containment'); expect(current.failure).toBeInstanceOf(Error);
  await expect(page.getByTestId('outside')).toBeFocused();
  await expect(page.getByRole('dialog')).toBeVisible();
  const comparison = await evidence(info, 'escape', base.result, current.result);
  expect(comparison.firstDifference).toMatchObject({ index: 7, checkpointId: 'save-wrap', kind: 'checkpoint' });
  expect(current.result.steps[7].observed.testId).toBe('outside');
});
test('qualification accepts delayed focus and changed build without false alarm', async ({ page }, info) => {
  const base = await exercise(page, info, 'good', 'return'); const current = await exercise(page, info, 'delayed', 'return');
  expect(base.failure).toBeUndefined(); expect(current.failure).toBeUndefined();
  await expect(page.getByTestId('opener')).toBeFocused();
  expect((await evidence(info, 'delayed-control', base.result, current.result)).status).toBe('unchanged');
});
test('qualification accepts authored alternate return destination when opener disappears', async ({ page }, info) => {
  const base = await exercise(page, info, 'alternate', 'alternate'); const current = await exercise(page, info, 'alternate', 'alternate');
  expect(base.failure).toBeUndefined(); expect(current.failure).toBeUndefined();
  await expect(page.getByTestId('opener')).toHaveCount(0); await expect(page.getByTestId('next')).toBeFocused();
  expect((await evidence(info, 'alternate-control', base.result, current.result)).status).toBe('unchanged');
});
