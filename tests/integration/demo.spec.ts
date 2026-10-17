import { test, expect } from '@playwright/test';

// Independent oracle: these tests import neither the helper nor comparator.
test('demo good fixture opens, wraps and returns focus using real keys', async ({ page }) => {
  await page.goto('http://127.0.0.1:49371/?variant=good');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('opener')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('save')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('cancel')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('save')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('opener')).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('opener');
});

test('demo return mutation reproduces body focus after Escape', async ({ page }) => {
  await page.goto('http://127.0.0.1:49371/?variant=lost-return');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
});

test('demo activation mutation leaves focus unchanged but does not open dialog', async ({ page }) => {
  await page.goto('http://127.0.0.1:49371/?variant=activation');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.getByTestId('opener')).toBeFocused();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('demo escape mutation permits focus outside the open modal', async ({ page }) => {
  await page.goto('http://127.0.0.1:49371/?variant=escape');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('outside')).toBeFocused();
});
