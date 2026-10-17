import { chromium } from '../../node_modules/playwright/index.mjs';
import { expect } from '../../node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = new URL('../../', import.meta.url);
const evidence = new URL('evidence/frontend/', repo);
const images = new URL('docs/images/', repo);
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, locale: 'en-US' });
const page = await context.newPage();
const errors = [];
const externalRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:49371/')) externalRequests.push(request.url()); });
const checks = [];
async function check(name, operation) { await operation(); checks.push({ name, result: 'passed' }); }
const screenshots = [];
async function shot(name, description, options = {}) {
  const path = fileURLToPath(new URL(name, images));
  await page.screenshot({ path, ...options });
  screenshots.push({ path: 'docs/images/' + name, description, bytes: (await stat(path)).size, sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
}
const goto = variant => page.goto('http://127.0.0.1:49371/' + (variant ? '?variant=' + variant : ''), { waitUntil: 'networkidle' });
const focused = () => page.evaluate(() => document.activeElement.id || document.activeElement.tagName);

await goto();
const viewports = [];
await check('No horizontal overflow from 320px phone to 1920px desktop', async () => {
  for (const width of [320, 375, 390, 430, 650, 768, 1000, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const measurement = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.equal(measurement.width, measurement.scrollWidth);
    viewports.push(measurement);
  }
});
const headlineMeasurements = [];
await check('Hero headline stays on two readable lines across layout breakpoints', async () => {
  for (const width of [320, 390, 430, 431, 450, 480, 700, 701, 768, 800, 801, 860, 900, 901, 1020, 1150, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const measurement = await page.locator('h1').evaluate(el => {
      const range = document.createRange();
      range.selectNodeContents(el.firstChild);
      const first = [...range.getClientRects()].filter(r => r.width > 1);
      range.setStart(el.lastChild, 1); range.setEnd(el.lastChild, el.lastChild.length);
      const last = [...range.getClientRects()].filter(r => r.width > 1);
      const key = el.querySelector('kbd').getBoundingClientRect();
      return { width: innerWidth, firstLineRects: first.length, finalWordRects: last.length, keyAlignedWithFinalWord: Math.abs(key.top - last[0].top) < parseFloat(getComputedStyle(el).fontSize) * .8 };
    });
    assert.equal(measurement.firstLineRects, 1, JSON.stringify(measurement));
    assert.equal(measurement.finalWordRects, 1, JSON.stringify(measurement));
    assert(measurement.keyAlignedWithFinalWord, JSON.stringify(measurement));
    headlineMeasurements.push(measurement);
  }
});
await page.setViewportSize({ width: 1440, height: 1000 });
await goto();
await shot('frontend-desktop.png', 'Actual landing page with its dimensional key illustration and the beginning of the live workshop.');
await check('First real Tab reaches opener, shows a visible focus ring and updates inspector', async () => {
  await page.keyboard.press('Tab');
  assert.equal(await focused(), 'opener');
  await expect(page.locator('#focus')).toHaveText('Open settings');
  await expect(page.locator('[data-path="opener"]')).toHaveClass(/is-active/);
  const ring = await page.locator('#opener').evaluate(el => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
  assert.deepEqual(ring, { style: 'solid', width: '3px' });
});
await check('Illustration and key echo respond to the actual keyboard event', async () => {
  await expect(page.locator('#last-key')).toHaveText('Tab');
  await expect(page.locator('[data-art-key="Tab"]')).toHaveClass(/is-active/);
  await expect(page.locator('#hero-focus-label')).toHaveText('Focus → Open settings');
});
await check('Good dialog opens, traps both Tab directions, saves and returns focus', async () => {
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  assert.equal(await focused(), 'save');
  await expect(page.locator('[data-art-key="Enter"]')).toHaveClass(/is-active/);
  const unguarded = await page.locator('a, button').evaluateAll(elements => elements.filter(el => !el.closest('#modal') && !el.closest('[inert]')).length);
  assert.equal(unguarded, 0);
  await page.keyboard.press('Shift+Tab'); assert.equal(await focused(), 'cancel');
  await page.keyboard.press('Tab'); assert.equal(await focused(), 'save');
  await page.keyboard.press('Tab'); assert.equal(await focused(), 'cancel');
  await shot('demo-keyboard-dialog.png', 'Real keyboard navigation: Tab, Enter, Tab; Cancel is visibly focused in the redesigned dialog.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  assert.equal(await focused(), 'opener');
  await expect(page.locator('[data-art-key="Escape"]')).toHaveClass(/is-active/);
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  await expect(page.locator('#saved')).toHaveText('Your settings have been saved.');
  assert.equal(await focused(), 'opener');
});
await check('Keyboard traversal to report preview uses concise aria-label in focus readout', async () => {
  let reached = false;
  for (let index = 0; index < 14; index++) {
    await page.keyboard.press('Tab');
    reached = await page.locator('.report-preview').evaluate(el => el === document.activeElement);
    if (reached) break;
  }
  assert(reached);
  await expect(page.locator('#focus')).toHaveText('Open the full lost return focus report');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/reports/lost-return.html');
  await expect(page.locator('header .status')).toHaveText('Regressed');
  await expect(page.locator('[aria-current="step"]')).toHaveAttribute('data-step', '7');
});
await check('Lost-return fixture still reproduces document-body focus', async () => {
  await goto('lost-return');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
  assert.equal(await focused(), 'BODY');
  await expect(page.locator('#focus')).toHaveText('Document body');
  await expect(page.locator('#fixture-tag')).toHaveText('Deliberate fault');
});
await check('Escape fixture instructions expose the containment fault, then Escape closes', async () => {
  await goto('escape');
  await expect(page.locator('#journey-final-key')).toHaveText('Tab');
  await expect(page.locator('#journey-exit-hint')).toBeVisible();
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(page.getByTestId('outside')).toBeFocused();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  assert.equal(await focused(), 'opener');
});
await check('Activation fault still leaves the dialog closed', async () => {
  await goto('activation');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();
  assert.equal(await focused(), 'opener');
});
await check('Delayed and alternate destination controls retain their behavior', async () => {
  await goto('delayed');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.getByTestId('save')).toBeFocused();
  await page.keyboard.press('Escape'); assert.equal(await focused(), 'opener');
  await goto('alternate');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.getByTestId('opener')).toHaveCount(0);
  await page.keyboard.press('Escape'); assert.equal(await focused(), 'next');
});
const reportResponses = [];
await check('All four recorded HTML reports are served successfully', async () => {
  for (const name of ['good', 'lost-return', 'escape', 'activation']) {
    const response = await context.request.get('http://127.0.0.1:49371/reports/' + name + '.html');
    assert.equal(response.status(), 200);
    assert.match(await response.text(), /Focus Trail/);
    reportResponses.push({ name, status: response.status() });
  }
});
await goto('good');
await check('Fixture selection links navigate and identify the active fixture', async () => {
  for (const variant of ['lost-return', 'escape', 'activation', 'good']) {
    await page.locator('a[href="?variant=' + variant + '"]').click();
    await page.waitForURL('**/?variant=' + variant);
    await expect(page.locator('a[aria-current="page"]')).toHaveAttribute('href', '?variant=' + variant);
  }
});
await page.setViewportSize({ width: 390, height: 844 });
await goto();
await check('Mobile headings retain spaces at hidden line breaks', async () => {
  assert.equal((await page.locator('#fixtures-title').innerText()).replace(/\s+/g, ' '), 'Same dialog. Different destinations.');
  assert.equal((await page.locator('#reports-title').innerText()).replace(/\s+/g, ' '), 'Find the first wrong turn.');
});
await shot('frontend-mobile.png', 'The actual responsive landing page at 390px, including stacked report evidence.', { fullPage: true });
await check('Dialog controls remain reachable on small phone and landscape viewports', async () => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport); await goto();
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    await expect(page.getByTestId('save')).toBeFocused();
    const box = await page.getByTestId('save').boundingBox();
    assert(box && box.y >= 0 && box.y + box.height <= viewport.height);
    await page.keyboard.press('Tab'); await page.keyboard.press('Escape');
    await expect(page.getByTestId('opener')).toBeFocused();
  }
});
await check('Reduced-motion preference removes decorative transitions', async () => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#opener').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
});
await check('No browser script errors or external asset requests', async () => { assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []); });
const files = {};
for (const name of ['examples/dialog/app/index.html', 'examples/dialog/app/style.css', 'examples/dialog/app/app.js']) files[name] = createHash('sha256').update(await readFile(new URL(name, repo))).digest('hex');
const receipt = { verifiedAt: new Date().toISOString(), browser: await browser.version(), channel: 'chromium', deviceScaleFactor: 2, sourceSha256: files, checks, viewports, headlineMeasurements, reportResponses, browserErrors: errors, externalRequests, screenshots, limitation: 'Automated browser and visual review; does not count as a human pilot installation or assistive-technology assessment.' };
await writeFile(new URL('browser-verification.json', evidence), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ checks: checks.length, screenshots, browserErrors: errors, externalRequests }, null, 2));
await browser.close();
