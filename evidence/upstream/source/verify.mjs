// Keyboard-only verification of an extracted, adapted upstream source mechanism.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(process.env.FOCUS_TRAIL_REPO ?? join(here, '../../..'));
const receiptDirectory = resolve(process.env.FOCUS_TRAIL_RECEIPTS ?? join(repo, 'evidence/upstream'));
const playwrightPath = join(repo, 'node_modules/@playwright/test/index.mjs');
const { chromium, expect } = await import(pathToFileURL(playwrightPath).href);
const corePath = resolve(process.env.FOCUS_TRAIL_CORE ?? join(here, 'node_modules/focus-trail/dist/index.js'));
const tarballPath = resolve(process.env.FOCUS_TRAIL_TARBALL ?? join(repo, 'evidence/upstream/focus-trail-tested-0.1.0.tgz'));
const { createJourney, compare } = await import(pathToFileURL(corePath).href);
const fixtureLock = JSON.parse(await readFile(join(here, 'package-lock.json'), 'utf8'));
const upstreamLock = JSON.parse(await readFile(join(here, 'upstream/package-lock.before.json'), 'utf8'));
const hashes = {};
for (const name of ['ConverterRegistry.before.tsx', 'ConverterRegistry.after.tsx', 'package-lock.before.json', 'package.before.json', 'main.before.tsx', 'useTheme.before.tsx']) {
  hashes[name] = createHash('sha256').update(await readFile(join(here, 'upstream', name))).digest('hex');
}
const versions = {};
for (const name of ['react', 'react-dom', '@fluentui/react-components', '@fluentui/react-dialog', '@fluentui/react-tabster', 'tabster', 'vite', '@vitejs/plugin-react']) {
  versions[name] = { installed: JSON.parse(await readFile(join(here, 'node_modules', name, 'package.json'), 'utf8')).version, upstream: upstreamLock.packages[`node_modules/${name}`]?.version };
  if (versions[name].installed !== versions[name].upstream) throw new Error(`Dependency mismatch: ${name}`);
}
const fixtureDependencyMismatches = Object.entries(fixtureLock.packages).filter(([key, value]) => key && upstreamLock.packages[key]?.version && value.version !== upstreamLock.packages[key].version).map(([key, value]) => ({ key, fixture: value.version, upstream: upstreamLock.packages[key].version }));
if (fixtureDependencyMismatches.length) throw new Error(`Fixture lock mismatches: ${JSON.stringify(fixtureDependencyMismatches)}`);
await mkdir(receiptDirectory, { recursive: true });
const server = await createServer({ root: here, configFile: join(here, 'vite.config.mjs'), server: { host: '127.0.0.1', port: 0, strictPort: true } });
let browser;
const result = {
  schemaVersion: 1,
  claim: 'Extracted and adapted PyRIT Remove-dialog source mechanism; complete upstream application was not executed.',
  upstream: {
    issue: 'https://github.com/microsoft/PyRIT/issues/2701',
    pullRequest: 'https://github.com/microsoft/PyRIT/pull/2717',
    beforeRevision: '6fd719317c09228cb332cacf5d76b6602610b591',
    afterRevision: 'a1a4aade4ddd67885920c0cc052a902b4be916d7',
    originalPlaywrightVersion: '1.63.0',
    originalReportedPlatform: 'Windows',
    sha256: hashes,
  },
  adaptations: [
    'Static one-row converter data replaces routing, authentication, API, loading, and converter creation.',
    'Refresh, unrelated table columns, icons, and styling are omitted; mounted New Converter fallback and Remove opener remain.',
    'Remove dialog uses the upstream controlled state, Fluent Dialog/Surface/Body/Title/Content/Actions, and Escape callback. Removing is false because backend deletion is outside this scenario.',
    'Before closes by clearing converterToRemove. After preserves useRestoreFocusTarget, captured opener ref, open-dialog guard, and the post-commit useEffect focus restore/fallback.',
    'Confirm handler dismisses without a backend request but is not activated. No harness focus()/blur() calls or injected DOM keyboard events are used.',
    'The exact five-key sequence is authored for this extracted layout; the issue does not supply an exact Tab count.',
    'StrictMode and FluentProvider with webLightTheme retain the upstream provider structure while omitting theme preferences.',
  ],
  environment: {
    node: process.version, platform: process.platform, architecture: process.arch,
    playwrightVersion: JSON.parse(await readFile(join(repo, 'node_modules/@playwright/test/package.json'), 'utf8')).version,
    playwrightImportPath: playwrightPath,
    focusTrailCorePath: corePath,
    focusTrailVersion: JSON.parse(await readFile(join(dirname(dirname(corePath)), 'package.json'), 'utf8')).version,
    focusTrailTarballPath: tarballPath,
    focusTrailTarballSha256: createHash('sha256').update(await readFile(tarballPath)).digest('hex'),
    chromiumChannel: 'chromium',
    chromiumExecutable: chromium.executablePath(),
    chromiumRegistryEntry: JSON.parse(await readFile(join(repo, 'node_modules/playwright-core/browsers.json'), 'utf8')).browsers.find(item => item.name === 'chromium'),
    viewport: { width: 1280, height: 800 }, locale: 'en-US', dependencies: versions,
    fixtureLockSharedDependencyMismatches: fixtureDependencyMismatches,
  },
  keySequence: ['Tab', 'Tab', 'Enter', 'Tab', 'Escape'],
  scenarios: [],
};
const activeElement = page => page.evaluate(() => {
  const element = document.activeElement;
  return { tag: element?.tagName.toLowerCase(), testId: element?.getAttribute('data-testid'), text: element?.textContent?.trim().slice(0, 100), isBody: element === document.body, isConnected: element?.isConnected };
});

async function scenario(variant, useFocusTrail, baseURL) {
  const context = await browser.newContext({ viewport: result.environment.viewport, locale: result.environment.locale });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__observedKeys = [];
    document.addEventListener('keydown', event => window.__observedKeys.push({ key: event.key, isTrusted: event.isTrusted }));
  });
  await page.goto(`${baseURL}/?variant=${variant}`);
  const opener = page.getByTestId('opener');
  const fallback = page.getByTestId('new-converter');
  const cancel = page.getByTestId('cancel');
  const confirm = page.getByTestId('confirm');
  await expect(opener).toBeVisible();
  const captures = [];
  const info = {
    status: 'passed', errors: [], attachments: [],
    outputPath: name => join(receiptDirectory, `attachments-${variant}`, name),
    attach: async (name, attachment) => { info.attachments.push({ name, ...attachment }); },
  };
  const trail = useFocusTrail ? createJourney(page, info, { journeyId: 'pyrit-remove-escape', fixtureVersion: 'extracted-pyrit-pinned-1', appBuild: variant, checkpointTimeoutMs: 500 }) : null;
  const press = key => trail ? trail.press(key) : page.keyboard.press(key);
  const checkpoint = async (name, target) => { await expect(target).toBeFocused(); if (trail) await trail.expectFocus(name, target); captures.push({ checkpoint: name, activeElement: await activeElement(page) }); };
  await press('Tab'); await checkpoint('new-converter', fallback);
  await press('Tab'); await checkpoint('remove-opener', opener);
  await press('Enter'); await expect(page.getByRole('dialog')).toBeVisible(); await checkpoint('dialog-cancel', cancel);
  await press('Tab'); await checkpoint('dialog-remove', confirm);
  await press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  // Let the framework's post-dismiss effects settle before independent assertions.
  await page.waitForTimeout(150);
  const afterDismissal = await activeElement(page);
  let ordinaryReturnAssertion = 'passed';
  let ordinaryReturnAssertionError;
  try { await expect(opener).toBeFocused({ timeout: 500 }); }
  catch (error) { ordinaryReturnAssertion = 'failed'; ordinaryReturnAssertionError = error.message.replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(Boolean).slice(0, 4).join('\n'); }
  const expectedReturn = variant === 'before' ? 'failed' : 'passed';
  expect(ordinaryReturnAssertion).toBe(expectedReturn);
  if (variant === 'before') {
    await expect(page.locator('body')).toBeFocused();
    expect(afterDismissal.isBody).toBe(true);
  } else {
    await expect(opener).toBeFocused();
    expect(afterDismissal.testId).toBe('opener');
  }
  let focusTrailReturnAssertion;
  let journey;
  if (trail) {
    try { await trail.expectFocus('return-opener', opener); focusTrailReturnAssertion = 'passed'; }
    catch { focusTrailReturnAssertion = 'failed'; }
    expect(focusTrailReturnAssertion).toBe(expectedReturn);
    journey = await trail.finish();
    await writeFile(join(receiptDirectory, `focus-trail-${variant}.json`), JSON.stringify(journey, null, 2) + '\n');
  }
  const observedKeys = await page.evaluate(() => window.__observedKeys);
  expect(observedKeys).toEqual(result.keySequence.map(key => ({ key, isTrusted: true })));
  expect(errors).toEqual([]);
  await page.screenshot({ path: join(receiptDirectory, `${variant}-${useFocusTrail ? 'focus-trail' : 'ordinary'}-after.png`) });
  const receipt = { variant, driver: useFocusTrail ? 'installed Focus Trail core' : 'ordinary Playwright keyboard', captures, afterDismissal, ordinaryReturnAssertion, ...(ordinaryReturnAssertionError ? { ordinaryReturnAssertionError } : {}), ...(focusTrailReturnAssertion ? { focusTrailReturnAssertion } : {}), observedKeys, pageErrors: errors, ...(journey ? { focusTrailStatus: journey.status } : {}) };
  await context.close();
  return receipt;
}

try {
  await server.listen();
  const address = server.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('No ephemeral server port');
  expect([49371, 4173, 4317]).not.toContain(address.port);
  result.environment.fixtureServerPort = address.port;
  browser = await chromium.launch({ channel: 'chromium', headless: true });
  result.environment.actualBrowserVersion = browser.version();
  expect(browser.version()).toBe('156.0.8078.4');
  for (const useFocusTrail of [false, true]) for (const variant of ['before', 'after']) result.scenarios.push(await scenario(variant, useFocusTrail, `http://127.0.0.1:${address.port}`));
  const before = JSON.parse(await readFile(join(receiptDirectory, 'focus-trail-before.json'), 'utf8'));
  const after = JSON.parse(await readFile(join(receiptDirectory, 'focus-trail-after.json'), 'utf8'));
  const comparison = compare(after, before);
  result.focusTrailComparison = { status: comparison.status, firstDifference: comparison.firstDifference };
  expect(comparison.status).toBe('regressed');
  expect(comparison.firstDifference).toMatchObject({ checkpointId: 'return-opener', kind: 'checkpoint' });
  await writeFile(join(receiptDirectory, 'comparison.json'), JSON.stringify(comparison, null, 2) + '\n');
  result.status = 'verified';
} catch (error) {
  result.status = 'not-reproduced-or-verification-failed';
  result.error = error.stack;
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server.close();
  result.serverClosed = true;
  result.completedAt = new Date().toISOString();
  await writeFile(join(receiptDirectory, 'result.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({status:result.status, browser:result.environment.actualBrowserVersion, port:result.environment.fixtureServerPort, scenarios:result.scenarios.map(item=>({variant:item.variant,driver:item.driver,active:item.afterDismissal,ordinary:item.ordinaryReturnAssertion,focusTrail:item.focusTrailReturnAssertion})),comparison:result.focusTrailComparison,error:result.error}, null, 2));
