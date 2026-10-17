import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repo = new URL('../', import.meta.url);
const out = new URL('social/', repo);
await mkdir(out, { recursive: true });
const base = process.env.FOCUS_TRAIL_DEMO_URL ?? 'http://127.0.0.1:49371';
const recorded = JSON.parse(await readFile(new URL('evidence/demo/lost-return.json', repo), 'utf8'));
assert.equal(recorded.comparison.firstDifference.index, 7);
assert.equal(recorded.comparison.firstDifference.checkpointId, 'return-opener');
assert.equal(recorded.current.steps[7].status, 'failed');

const browser = await chromium.launch({ channel: 'chromium', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1, locale: 'en-US' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const images = [];
  for (const [slide, name] of [['cover', '01-focus-trail-cover.png'], ['product', '02-focus-trail-evidence.png']]) {
    await page.goto(base + '/social.html?slide=' + slide, { waitUntil: 'networkidle' });
    await page.waitForSelector('body[data-ready="true"]');
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.locator('#canvas').boundingBox();
    assert.equal(dimensions.width, 1080);
    assert.equal(dimensions.height, 1350);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1080);
    if (slide === 'product') {
      assert.equal(await page.locator('.step-number').innerText(), '08');
      assert.equal(await page.locator('.difference-heading strong').innerText(), 'return-opener');
      assert.match(await page.locator('.sample-note').innerText(), /fresh endpoint sample was unavailable/);
    }
    const path = fileURLToPath(new URL(name, out));
    await page.screenshot({ path });
    const pixels = await readFile(path);
    assert.equal(pixels.readUInt32BE(16), 1080);
    assert.equal(pixels.readUInt32BE(20), 1350);
    images.push({ file: name, width: 1080, height: 1350, bytes: pixels.length, sha256: createHash('sha256').update(pixels).digest('hex') });
  }
  assert.deepEqual(errors, []);
  const files = {};
  for (const name of ['examples/dialog/app/index.html', 'examples/dialog/app/style.css', 'examples/dialog/app/social.html', 'examples/dialog/app/social.css', 'examples/dialog/app/social.js', 'evidence/demo/lost-return.json']) {
    files[name] = createHash('sha256').update(await readFile(new URL(name, repo))).digest('hex');
  }
  const manifest = { exportedAt: new Date().toISOString(), browser: await browser.version(), images, sourceSha256: files, browserErrors: errors, note: 'Static portrait artwork rendered from the same key illustration and report preview as the working demo. The failure is a controlled fixture, not a customer incident.' };
  await writeFile(new URL('export-manifest.json', out), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await browser.close();
}
