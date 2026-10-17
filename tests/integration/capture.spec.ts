import { test, expect } from '@playwright/test';
import { captureFocus } from '../../packages/core/src/capture.js';

test('captures Chromium computed accessible role and labelledby name without form values', async ({ page }) => {
  await page.setContent('<span id="label" hidden>Account</span><span id="detail">number</span><input aria-labelledby="label detail" data-testid="account" value="input-secret">');
  await page.keyboard.press('Tab');
  const observed = await captureFocus(page);
  expect(observed).toEqual({ tag: 'input', role: 'textbox', name: 'Account number', testId: 'account' });
  expect(JSON.stringify(observed)).not.toContain('input-secret');
});

test('masks computed names and target evidence using literal strings', async ({ page }) => {
  await page.setContent('<button aria-label="Customer secret.42" data-testid="secret.42">Continue</button>');
  await page.keyboard.press('Tab');
  expect(await captureFocus(page, ['secret.42'])).toEqual({ tag: 'button', role: 'button', name: 'Customer [redacted]', testId: '[redacted]' });
});

test('body focus and unavailable capture remain explicit evidence', async ({ page }) => {
  await page.setContent('<p>Nothing focused</p>');
  expect(await captureFocus(page)).toMatchObject({ tag: 'body', role: null, name: null, testId: null, unavailable: 'No focused element: document body' });
  await page.close();
  expect(await captureFocus(page)).toMatchObject({ tag: null, role: null, name: null, testId: null, unavailable: expect.stringContaining('unavailable') });
});

test('focused shadow content is explicitly unsupported', async ({ page }) => {
  await page.setContent('<div id="host"></div><script>host.attachShadow({mode:"open"}).innerHTML="<button>Shadow</button>"</script>');
  await page.keyboard.press('Tab');
  expect(await captureFocus(page)).toMatchObject({ unavailable: expect.stringContaining('shadow') });
});

test('focused iframe content is explicitly unsupported', async ({ page }) => {
  await page.setContent('<iframe srcdoc="<button>Frame</button>"></iframe>');
  await page.keyboard.press('Tab');
  expect(await captureFocus(page)).toMatchObject({ tag: 'iframe', unavailable: expect.stringContaining('frame') });
});
