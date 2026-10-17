import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { test as base, expect, type TestInfo, type Page } from '@playwright/test';
import { createJourney, test } from '../../packages/core/src/journey.js';
import type { JourneyResult, SupportedKey } from '../../packages/core/src/types.js';

const options = { journeyId: 'dialog', fixtureVersion: '1' };
const exec = promisify(execFile);
async function attachment(info: TestInfo): Promise<JourneyResult> {
  const found = info.attachments.find(a => a.name.startsWith('focus-trail:'));
  expect(found, 'journey JSON attachment').toBeTruthy();
  expect(found!.contentType).toBe('application/json');
  return JSON.parse(found!.body?.toString('utf8') ?? await readFile(found!.path!, 'utf8')) as JourneyResult;
}
async function dialog(page: Page, broken = false) {
  await page.setContent(`<button id="open" data-testid="open">Open dialog</button><dialog><button id="first">First</button><button id="last">Last</button></dialog><script>
    const modal = document.querySelector('dialog');
    document.querySelector('#open').onclick = () => { modal.showModal(); document.querySelector('#first').focus(); };
    ${broken ? "modal.addEventListener('cancel', event => { event.preventDefault(); modal.close(); document.activeElement.blur(); });" : ''}
  </script>`);
}

test('real keyboard journey opens a dialog, navigates, and restores focus', async ({ page, journey }, info) => {
  await dialog(page);
  const run = journey(page, info, options);
  await run.press('Tab');
  await run.expectFocus('opener', page.getByRole('button', { name: 'Open dialog' }));
  await run.press('Enter');
  await expect(page.locator('dialog')).toBeVisible();
  await run.expectFocus('first', page.getByRole('button', { name: 'First', exact: true }));
  await run.press('Tab');
  await run.expectFocus('last', page.getByRole('button', { name: 'Last', exact: true }));
  await run.press('Shift+Tab');
  await run.expectFocus('first-again', page.getByRole('button', { name: 'First', exact: true }));
  await run.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await run.expectFocus('return', page.locator('#open'));
  await expect(page.locator('#open')).toBeFocused();
  const result = await run.finish();
  expect(result.status).toBe('passed');
  expect(result.steps.map(s => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(result.steps.at(-1)).toMatchObject({ action: null, checkpointId: 'return', expectedTargetKey: 'return', observed: { tag: 'button', role: 'button', name: 'Open dialog' } });
  expect(result.browserVersion).toBe(page.context().browser()!.version());
  expect(result.viewport).toEqual({ width: 1280, height: 800 });
  expect(result.locale).toBe('en-US');
  expect(await attachment(info)).toEqual(result);
  expect(await run.finish()).toEqual(result);
  expect(info.attachments.filter(a => a.name.startsWith('focus-trail:'))).toHaveLength(1);
});

test('caught checkpoint failure still attaches a failed return result', async ({ page, journey }, info) => {
  await dialog(page, true);
  const run = journey(page, info, { ...options, checkpointTimeoutMs: 100 });
  await run.press('Tab');
  await run.press('Enter');
  await run.press('Escape');
  await expect(page.locator('body')).toBeFocused();
  await expect(run.expectFocus('return', page.locator('#open'))).rejects.toThrow(/focus/i);
  const result = await run.finish();
  expect(result.status).toBe('failed');
  expect(result.steps.at(-1)).toMatchObject({ checkpointId: 'return', status: 'failed', observed: { tag: 'body' } });
  expect((await attachment(info)).status).toBe('failed');
  expect((await run.finish()).status).toBe('failed');
});

test('checkpoint retries until delayed application focus is observed', async ({ page }, info) => {
  await page.setContent('<button id="start">Start</button><button id="later">Later</button><script>start.onclick=()=>setTimeout(()=>later.focus(),120)</script>');
  const run = createJourney(page, info, { ...options, checkpointTimeoutMs: 700 });
  await run.press('Tab');
  await run.press('Enter');
  await run.expectFocus('later', page.locator('#later'));
  expect((await run.finish()).status).toBe('passed');
});

test('duplicate targets fail strictly while duplicate names permit stable keyed locators', async ({ page }, info) => {
  await page.setContent('<button id="one">Same</button><button id="two">Same</button>');
  const run = createJourney(page, info, options);
  await run.press('Tab');
  await run.expectFocus('one', page.locator('#one'));
  await expect(run.expectFocus('ambiguous', page.getByRole('button', { name: 'Same' }))).rejects.toThrow(/unique|2|ambiguous/i);
  expect((await run.finish()).steps.at(-1)).toMatchObject({ checkpointId: 'ambiguous', status: 'failed' });
});

test('names, IDs, and errors are masked while input values are never captured', async ({ page }, info) => {
  await page.setContent('<input aria-label="secret.42 account" data-testid="secret.42" value="input-only-secret"><button>Other</button>');
  // This checks redaction, so allow real browser captures to finish on slower CI.
  const run = createJourney(page, info, { ...options, journeyId: 'secret.42 journey', masks: ['secret.42'], checkpointTimeoutMs: 2000 });
  await run.press('Tab');
  await run.expectFocus('secret.42-input', page.getByRole('textbox'));
  await expect(run.expectFocus('secret.42-failure', page.getByRole('button'))).rejects.toThrow();
  const serialized = JSON.stringify(await run.finish());
  expect(serialized).not.toContain('secret.42');
  expect(serialized).not.toContain('input-only-secret');
  expect(serialized).toContain('[redacted]');
  expect(info.attachments.find(a => a.name.startsWith('focus-trail:'))!.name).not.toContain('secret.42');
});

for (const boundary of ['frame', 'shadow', 'other page'] as const) {
  test(`rejects ${boundary} checkpoint targets explicitly`, async ({ page, context }, info) => {
    await page.setContent('<button>Main</button><iframe srcdoc="<button>Frame</button>"></iframe><div id="host"></div><script>host.attachShadow({mode:"open"}).innerHTML="<button>Shadow</button>"</script>');
    const other = boundary === 'other page' ? await context.newPage() : null;
    if (other) await other.setContent('<button>Other</button>');
    const target = boundary === 'frame' ? page.frameLocator('iframe').getByRole('button') : boundary === 'shadow' ? page.locator('#host').getByRole('button') : other!.getByRole('button');
    const run = createJourney(page, info, options);
    await expect(run.expectFocus('unsupported', target)).rejects.toThrow(/frame|shadow|page/i);
    expect((await run.finish()).status).toBe('failed');
    await other?.close();
  });
}

test('unsupported focused observations fail keyboard records explicitly', async ({ page }, info) => {
  await page.setContent('<div id="host"></div><script>host.attachShadow({mode:"open"}).innerHTML="<button>Shadow</button>"</script>');
  const run = createJourney(page, info, options);
  await expect(run.press('Tab')).rejects.toThrow(/shadow/i);
  expect((await run.finish()).steps[0]).toMatchObject({ action: 'Tab', status: 'failed', observed: { unavailable: expect.stringContaining('shadow') } });
});

test('closed-page failures retain unavailable evidence and attach JSON', async ({ page }, info) => {
  const run = createJourney(page, info, options);
  await page.close();
  await expect(run.press('Tab')).rejects.toThrow();
  expect((await run.finish()).status).toBe('failed');
  expect((await attachment(info)).steps[0].observed.unavailable).toContain('unavailable');
});

test('fixed viewport and actual locale are recorded; null viewport is rejected', async ({ browser }, info) => {
  const fixed = await browser.newContext({ viewport: { width: 640, height: 480 }, locale: 'fr-FR' });
  const page = await fixed.newPage();
  await page.setContent('<button>Bonjour</button>');
  const run = createJourney(page, info, options);
  await run.press('Tab');
  expect(await run.finish()).toMatchObject({ status: 'passed', viewport: { width: 640, height: 480 }, locale: 'fr-FR' });
  await fixed.close();
  const fluid = await browser.newContext({ viewport: null });
  const fluidPage = await fluid.newPage();
  expect(() => createJourney(fluidPage, info, { ...options, journeyId: 'fluid' })).toThrow(/viewport/i);
  await fluid.close();
});

test('action and duration budgets reject input before delivering extra keys', async ({ page }, info) => {
  await page.setContent('<button>Target</button><script>window.keys=[];document.addEventListener("keydown",e=>keys.push({key:e.key,trusted:e.isTrusted}))</script>');
  const run = createJourney(page, info, { ...options, maxActions: 2 });
  await run.press('Tab');
  await run.press('Space');
  await expect(run.press('Enter')).rejects.toThrow(/action.*budget/i);
  expect(await page.evaluate(() => (window as unknown as { keys: { key: string; trusted: boolean }[] }).keys)).toEqual([{ key: 'Tab', trusted: true }, { key: ' ', trusted: true }]);
  expect((await run.finish()).status).toBe('failed');
  const timed = createJourney(page, info, { ...options, journeyId: 'timed', maxDurationMs: 60 });
  await page.waitForTimeout(90);
  await expect(timed.press('Tab')).rejects.toThrow(/duration.*budget/i);
  expect((await timed.finish()).status).toBe('failed');
});

test('checkpoint timeout remains bounded and illegal budget/key extensions are rejected', async ({ page }, info) => {
  await page.setContent('<button>Unfocused</button>');
  const run = createJourney(page, info, { ...options, checkpointTimeoutMs: 70 });
  const started = Date.now();
  await expect(run.expectFocus('target', page.getByRole('button'))).rejects.toThrow(/focus/i);
  expect(Date.now() - started).toBeLessThan(600);
  expect((await run.finish()).status).toBe('failed');
  for (const extension of [{ maxActions: 51 }, { maxDurationMs: 30001 }, { checkpointTimeoutMs: 5001 }, { maxActions: 0 }]) {
    expect(() => createJourney(page, info, { ...options, ...extension })).toThrow(/budget|between|maximum/i);
  }
  const invalid = createJourney(page, info, { ...options, journeyId: 'invalid-key' });
  await expect(invalid.press('F1' as SupportedKey)).rejects.toThrow(/key/i);
  expect((await invalid.finish()).status).toBe('failed');
});

test('checkpoint count is bounded and finalized journeys reject additional actions', async ({ page }, info) => {
  await page.setContent('<button>Target</button>');
  const run = createJourney(page, info, options);
  await run.press('Tab');
  for (let index = 0; index < 50; index++) await run.expectFocus(`target-${index}`, page.getByRole('button'));
  await expect(run.expectFocus('overflow', page.getByRole('button'))).rejects.toThrow(/checkpoint.*budget/i);
  expect((await run.finish()).status).toBe('failed');
  await expect(run.press('Tab')).rejects.toThrow(/finished|finalized/i);
});

base('fixture finalizer updates early-passed attachment after external activation failure', async ({}, info) => {
  const directory = resolve('work/fixture-probe');
  await mkdir(directory, { recursive: true });
  const source = resolve('packages/core/src/journey.ts');
  await writeFile(resolve(directory, 'probe.spec.ts'), `import { test } from ${JSON.stringify(source)};\ntest('activation', async ({ page, journey }, info) => {\n await page.setContent('<button>Target</button>');\n const run=journey(page,info,{journeyId:'activation',fixtureVersion:'1',masks:['secret.42']});\n await run.press('Tab'); await run.expectFocus('target',page.getByRole('button')); await run.finish();\n throw new Error('External activation failed secret.42\\ninput-only-secret');\n});\n`);
  await writeFile(resolve(directory, 'playwright.config.ts'), `export default { testDir:'.', timeout:10000, workers:1, reporter:[['json',{outputFile:'result.json'}]], use:{browserName:'chromium',viewport:{width:1280,height:800},locale:'en-US'}, outputDir:'results' };\n`);
  const outcome = await exec(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', '-c', resolve(directory, 'playwright.config.ts')], { cwd: directory, env: process.env }).then(() => 0, error => Number(error.code));
  expect(outcome).toBe(1);
  const report = JSON.parse(await readFile(resolve(directory, 'result.json'), 'utf8'));
  const result = report.suites[0].specs[0].tests[0].results[0];
  expect(result.status).toBe('failed');
  const attached = result.attachments.find((a: { name: string }) => a.name.startsWith('focus-trail:'));
  expect(attached).toBeTruthy();
  const journeyResult = JSON.parse(attached.body ? Buffer.from(attached.body, 'base64').toString('utf8') : await readFile(attached.path, 'utf8'));
  expect(journeyResult.status).toBe('failed');
  expect(journeyResult.steps.every((s: { status: string }) => s.status === 'passed')).toBe(true);
  expect(journeyResult.error).toContain('External activation failed [redacted]');
  expect(JSON.stringify(journeyResult)).not.toContain('input-only-secret');
  expect(JSON.stringify(journeyResult)).not.toContain('secret.42');
  await info.attach('fixture-probe', { body: JSON.stringify(journeyResult), contentType: 'application/json' });
});

base('idle journeys fail their duration budget at first finish', async ({ page }, info) => {
  const run = createJourney(page, info, { ...options, maxDurationMs: 40 });
  await page.waitForTimeout(70);
  expect((await run.finish()).status).toBe('failed');
  expect((await attachment(info)).error).toMatch(/duration.*budget/i);
});

base('unsupported browser fails before constructing a journey', async ({ page }, info) => {
  // A narrow facade exercises the environment guard without downloading another engine.
  const original = page.context();
  const unsupportedContext = new Proxy(original, { get(context, property) {
    if (property === 'browser') return () => ({ browserType: () => ({ name: () => 'firefox' }) });
    const value = Reflect.get(context, property);
    return typeof value === 'function' ? value.bind(context) : value;
  } });
  const unsupportedPage = new Proxy(page, { get(target, property) {
    if (property === 'context') return () => unsupportedContext;
    const value = Reflect.get(target, property);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  expect(() => createJourney(unsupportedPage, info, options)).toThrow(/Chromium/i);
});

base('later finalization preserves a timely finished journey after its duration limit', async ({ page }, info) => {
  const run = createJourney(page, info, { ...options, maxDurationMs: 300 });
  const first = await run.finish();
  expect(first.status).toBe('passed');
  await page.waitForTimeout(350);
  expect((await run.finish()).status).toBe('passed');
  expect((await attachment(info)).status).toBe('passed');
  expect(info.attachments.filter(item => item.name.startsWith('focus-trail:'))).toHaveLength(1);
});

base('busy-page checkpoint timeout preserves its last coherent focus sample', async ({ page }, info) => {
  await page.setContent('<button data-testid="outside">Outside</button><button data-testid="expected">Expected</button>');
  const run = createJourney(page, info, { ...options, checkpointTimeoutMs: 2000 });
  await run.press('Tab');
  await expect(page.getByTestId('outside')).toBeFocused();
  const context = page.context();
  const originalSession = context.newCDPSession;
  const control = await originalSession.call(context, page);
  await control.send('Runtime.enable');
  await control.send('Runtime.addBinding', { name: 'focusTrailBusyStarted' });
  let captureIndex = 0;
  let busyStarted = false;
  let busyTask: Promise<unknown> | undefined;
  // A second capture is only requested after the first coherent sample was stored.
  // Signal from Chromium before blocking its main thread, instead of racing a timer.
  context.newCDPSession = async target => {
    captureIndex++;
    if (captureIndex === 2) {
      const started = new Promise<void>(resolve => control.once('Runtime.bindingCalled', () => resolve()));
      busyTask = control.send('Runtime.evaluate', { expression: `
        focusTrailBusyStarted('');
        { const end = performance.now() + 2500; while (performance.now() < end) {} }
      ` });
      await started;
      busyStarted = true;
    }
    return originalSession.call(context, target);
  };
  try {
    await expect(run.expectFocus('expected', page.getByTestId('expected'))).rejects.toThrow(/focus/i);
    const failed = (await run.finish()).steps.at(-1)!;
    expect(busyStarted, 'the page must become busy after a coherent capture').toBe(true);
    expect(failed.status).toBe('failed');
    expect(failed.observed).toMatchObject({ tag: 'button', role: 'button', name: 'Outside', testId: 'outside' });
    expect(failed.observed.unavailable).toMatch(/last coherent sample/i);
    await busyTask;
    await expect(page.getByTestId('outside')).toBeFocused();
  } finally {
    context.newCDPSession = originalSession;
    await busyTask;
    await control.detach();
  }
});

base('later unavailable captures cannot erase a real checkpoint observation', async ({ page }, info) => {
  await page.setContent('<button data-testid="outside">Outside</button><button data-testid="expected">Expected</button>');
  const run = createJourney(page, info, { ...options, checkpointTimeoutMs: 2000 });
  await run.press('Tab');
  const context = page.context();
  const originalSession = context.newCDPSession;
  let captureIndex = 0;
  let outages = 0;
  // The first checkpoint sample is real Chromium. Subsequent protocol outages
  // reproduce capture unavailability deterministically, independent of CPU load.
  context.newCDPSession = async target => {
    captureIndex++;
    if (captureIndex > 1) {
      outages++;
      throw new Error('Injected protocol outage');
    }
    return originalSession.call(context, target);
  };
  try {
    await expect(run.expectFocus('expected', page.getByTestId('expected'))).rejects.toThrow(/focus/i);
    const failed = (await run.finish()).steps.at(-1)!;
    expect(outages, 'a later capture must encounter the injected outage').toBeGreaterThan(0);
    expect(failed.status).toBe('failed');
    expect(failed.observed).toMatchObject({ tag: 'button', role: 'button', name: 'Outside', testId: 'outside' });
    expect(failed.observed.unavailable).toMatch(/last coherent sample.*\d+ms/i);
    expect((await attachment(info)).steps.at(-1)).toEqual(failed);
    await expect(page.getByTestId('outside')).toBeFocused();
  } finally {
    context.newCDPSession = originalSession;
  }
});

base('a detected focus change invalidates evidence retained before a later outage', async ({ page }, info) => {
  await page.setContent('<button data-testid="outside">Outside</button><button data-testid="changed">Changed</button><button data-testid="expected">Expected</button>');
  const run = createJourney(page, info, { ...options, checkpointTimeoutMs: 2000 });
  await run.press('Tab');
  const context = page.context();
  const originalSession = context.newCDPSession;
  let captureIndex = 0;
  let changedDuringCapture = false;
  let outages = 0;
  context.newCDPSession = async target => {
    captureIndex++;
    if (captureIndex > 2) {
      outages++;
      throw new Error('Injected protocol outage');
    }
    const session = await originalSession.call(context, target);
    if (captureIndex === 2) {
      const originalSend = session.send.bind(session);
      session.send = async (method, params) => {
        if (method === 'Accessibility.getPartialAXTree') {
          await page.keyboard.press('Tab');
          changedDuringCapture = true;
        }
        return originalSend(method, params);
      };
    }
    return session;
  };
  try {
    await expect(run.expectFocus('expected', page.getByTestId('expected'))).rejects.toThrow(/focus/i);
    const failed = (await run.finish()).steps.at(-1)!;
    expect(changedDuringCapture, 'focus must change inside the second real capture').toBe(true);
    expect(outages, 'a later capture must encounter the injected outage').toBeGreaterThan(0);
    expect(failed.status).toBe('failed');
    expect(failed.observed.unavailable).not.toMatch(/last coherent sample/i);
    expect(failed.observed.testId).toBeNull();
    await expect(page.getByTestId('changed')).toBeFocused();
  } finally {
    context.newCDPSession = originalSession;
  }
});
