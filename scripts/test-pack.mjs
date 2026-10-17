import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, realpath, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = resolve(process.env.FOCUS_TRAIL_WORK_DIR ?? join(root, '../../work'));
const evidence = join(root, 'evidence/package');
const npmArgs = process.env.npm_execpath ? [process.env.npm_execpath] : [];
const npmExecutable = npmArgs.length ? process.execPath : 'npm';
const commandEnvironment = { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ''}` };
const verification = { status: 'running', engineeringEvidenceOnly: true, node: process.version, peer: '@playwright/test@1.64.1',
  browserEnvironment: { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? null }, checks: [] };
let consumer;

async function check(name, condition, detail = {}) {
  verification.checks.push({ name, passed: Boolean(condition), ...detail });
  if (!condition) throw new Error(`Package verification failed: ${name}`);
}

async function run(name, executable, args, expectedExit = 0, cwd = consumer ?? root, extraEnvironment = {}) {
  const result = spawnSync(executable, args, { cwd, env: { ...commandEnvironment, ...extraEnvironment }, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 180_000 });
  const log = `${name}.log`;
  await writeFile(join(evidence, log), JSON.stringify({ executable, args, cwd, expectedExit, actualExit: result.status, signal: result.signal, error: result.error?.message }, null, 2)
    + '\n\nSTDOUT\n' + (result.stdout ?? '') + '\nSTDERR\n' + (result.stderr ?? ''));
  await check(name, !result.error && result.status === expectedExit, { expectedExit, actualExit: result.status, log });
  console.log(`${name}: exit ${result.status}`);
  return result;
}

async function readReport(directory, journeyId) {
  const records = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const item = join(path, entry.name);
      if (entry.isDirectory()) await visit(item);
      else if (entry.name.endsWith('.json')) {
        const json = JSON.parse(await readFile(item, 'utf8'));
        if (json.current?.journeyId === journeyId) records.push({ path: item, json });
      }
    }
  }
  await visit(directory);
  await check(`one-report-${journeyId}-${dirname(directory).split('/').at(-1)}-${directory.split('/').at(-1)}`, records.length === 1, { found: records.length });
  await check(`manifest-${directory.split('/').at(-1)}`, Boolean(JSON.parse(await readFile(join(directory, 'reports.json'), 'utf8'))));
  return records[0];
}

const consumerConfiguration = `import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 30000, expect: { timeout: 500 }, retries: 0, workers: 1,
  outputDir: './test-results/' + process.env.FOCUS_TRAIL_CASE,
  reporter: [['list'], ['focus-trail/reporter', { baselineDir: './reviewed-baselines', outputDir: process.env.FOCUS_TRAIL_REPORT_DIR }]],
  use: { browserName: 'chromium', channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 }, locale: 'en-US', trace: 'off', screenshot: 'off', video: 'off' },
});
`;

const consumerTests = `import { expect } from '@playwright/test';
import { createJourney, test } from 'focus-trail';

function document(fault) {
  return '<!doctype html><html lang="en"><body><button id="open">Open dialog</button><button id="wrong">Other control</button>'
    + '<div id="dialog" role="dialog" aria-label="Example dialog" hidden><button id="close">Close dialog</button></div><output id="activated">idle</output>'
    + '<script>const openButton=document.getElementById("open"), dialog=document.getElementById("dialog"), closeButton=document.getElementById("close");'
    + 'openButton.onclick=()=>{dialog.hidden=false;closeButton.focus();document.getElementById("activated").textContent="' + (fault === 'activation' ? 'blocked' : 'active') + '"};'
    + 'function closeDialog(){dialog.hidden=true;document.getElementById("' + (fault === 'lost-return' ? 'wrong' : 'open') + '").focus()};'
    + 'closeButton.onclick=closeDialog;document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!dialog.hidden)closeDialog()});</script></body></html>';
}

test('public helper records a journey', async ({ page }, testInfo) => {
  await page.setContent('<button id="only">Only control</button>');
  const trail = createJourney(page, testInfo, { journeyId: 'packed.helper', fixtureVersion: 'packed-fixture-v1' });
  await trail.press('Tab');
  await trail.expectFocus('helper.only', page.locator('#only'));
  expect((await trail.finish()).status).toBe('passed');
});

test('public dialog fixture journey', async ({ page, journey }, testInfo) => {
  const fault = process.env.FOCUS_TRAIL_CASE;
  await page.setContent(document(fault));
  const trail = journey(page, testInfo, { journeyId: 'packed.dialog', fixtureVersion: 'packed-fixture-v1', checkpointTimeoutMs: 250 });
  await trail.press('Tab');
  await expect(page.locator('#open')).toBeFocused();
  await trail.expectFocus('dialog.launcher', page.locator('#open'));
  await trail.press('Enter');
  await expect(page.locator('#dialog')).toBeVisible();
  await trail.expectFocus('dialog.close', page.locator('#close'));
  await trail.press('Escape');
  await expect(page.locator('#dialog')).toBeHidden();
  await trail.expectFocus('dialog.return', page.locator('#open'));
  await trail.finish();
  // The fixture finalizer must refresh an earlier attachment after this ordinary test assertion fails.
  await expect(page.locator('#activated')).toHaveText('active');
});

test('public fixture bounds journey', async ({ page, journey }, testInfo) => {
  await page.setContent('<button id="only">Only control</button>');
  await page.locator('#only').focus();
  const trail = journey(page, testInfo, { journeyId: 'packed.bounds', fixtureVersion: 'packed-fixture-v1' });
  for (let index = 0; index < 50; index++) {
    await trail.press('ArrowRight');
    await trail.expectFocus('bounds.target.' + index, page.locator('#only'));
  }
  if (process.env.FOCUS_TRAIL_CASE === 'action-budget') await trail.press('ArrowRight');
  else await trail.expectFocus('bounds.extra', page.locator('#only'));
  throw new Error('The public journey failed to enforce its budget');
});
`;

async function browserRun(name, expectedExit, grep) {
  const output = join(consumer, 'reports', name);
  await run(`browser-${name}`, process.execPath, [join(consumer, 'node_modules/@playwright/test/cli.js'), 'test', '--config=playwright.config.mjs', '--grep', grep], expectedExit, consumer,
    { FOCUS_TRAIL_CASE: name, FOCUS_TRAIL_REPORT_DIR: output });
  return output;
}

async function main() {
  await mkdir(evidence, { recursive: true });
  await check('node24', process.versions.node.split('.')[0] === '24');
  for (const file of ['index.js', 'index.d.ts', 'reporter.js', 'reporter.d.ts', 'cli.js']) {
    await check(`caller-built-dist-${file}`, (await readFile(join(root, 'dist', file))).length > 0);
  }
  const packed = await run('pack', npmExecutable, [...npmArgs, 'pack', '--ignore-scripts', '--json', '--pack-destination', evidence], 0, root);
  const [candidate] = JSON.parse(packed.stdout);
  verification.candidate = { filename: candidate.filename, integrity: candidate.integrity, shasum: candidate.shasum,
    sha256: createHash('sha256').update(await readFile(join(evidence, candidate.filename))).digest('hex') };
  const packageFiles = new Set(candidate.files.map(file => file.path));
  await check('packed-public-files', ['dist/index.js', 'dist/index.d.ts', 'dist/reporter.js', 'dist/reporter.d.ts', 'dist/cli.js', 'README.md', 'LICENSE'].every(file => packageFiles.has(file)));
  await mkdir(work, { recursive: true });
  consumer = await mkdtemp(join(work, 'focus-trail-consumer-'));
  verification.consumer = consumer;
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'focus-trail-package-consumer', private: true, type: 'module' }, null, 2));
  await run('install', npmExecutable, [...npmArgs, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', join(evidence, candidate.filename), '@playwright/test@1.64.1']);
  const installed = await realpath(join(consumer, 'node_modules/focus-trail'));
  await check('installed-copy-outside-source', installed.startsWith(consumer + '/') && !installed.startsWith(root + '/'), { installed });
  const peer = JSON.parse(await readFile(join(consumer, 'node_modules/@playwright/test/package.json'), 'utf8'));
  await check('exact-installed-peer', peer.version === '1.64.1', { version: peer.version });
  const resolvedBrowser = await run('browser-cache-resolution', process.execPath, ['--input-type=module', '-e',
    "import { chromium } from '@playwright/test'; console.log(JSON.stringify({ browserPathEnvironment: process.env.PLAYWRIGHT_BROWSERS_PATH ?? null, executablePath: chromium.executablePath() }));"]);
  verification.browserResolution = JSON.parse(resolvedBrowser.stdout);
  await check('browser-cache-environment-preserved', verification.browserResolution.browserPathEnvironment === verification.browserEnvironment.PLAYWRIGHT_BROWSERS_PATH,
    verification.browserResolution);
  await run('public-imports', process.execPath, ['--input-type=module', '-e',
    "import { createJourney, test, compare, parseJourney, InvalidJourneyError } from 'focus-trail'; import Reporter from 'focus-trail/reporter'; for (const value of [createJourney,test,compare,parseJourney,InvalidJourneyError,Reporter]) { if (typeof value !== 'function') throw new Error('Missing public export'); } console.log('Public exports resolved from installed package');"]);
  await run('public-commonjs-resolution', process.execPath, ['-e',
    "for (const name of ['focus-trail','focus-trail/reporter']) { console.log(require.resolve(name)); } if (typeof require('focus-trail').createJourney !== 'function') throw new Error('Missing public helper'); if (typeof require('focus-trail/reporter').default !== 'function') throw new Error('Missing reporter');"]);
  await mkdir(join(consumer, 'tests'), { recursive: true });
  await mkdir(join(consumer, 'reviewed-baselines'), { recursive: true });
  await writeFile(join(consumer, 'playwright.config.mjs'), consumerConfiguration);
  await writeFile(join(consumer, 'tests/public.spec.mjs'), consumerTests);

  const captureDirectory = await browserRun('baseline-capture', 0, 'public helper|public dialog');
  const helper = await readReport(captureDirectory, 'packed.helper');
  await check('direct-helper-browser-pass', helper.json.current.status === 'passed');
  const captured = await readReport(captureDirectory, 'packed.dialog');
  const baseline = captured.json.current;
  await check('unreviewed-capture-has-no-comparison', !captured.json.comparison && typeof captured.json.reviewStatus === 'string');
  // This is an explicitly approved synthetic fixture contract for engineering smoke tests only.
  const expectedContract = [
    ['Tab', null], [null, 'dialog.launcher'], ['Enter', null], [null, 'dialog.close'], ['Escape', null], [null, 'dialog.return'],
  ];
  await check('synthetic-baseline-review', baseline.status === 'passed' && baseline.steps.length === 6
    && baseline.steps.every((step, index) => step.status === 'passed' && step.action === expectedContract[index][0]
      && (step.checkpointId ?? null) === expectedContract[index][1]
      && (step.action !== null || step.expectedTargetKey === expectedContract[index][1])));
  verification.syntheticBaselineReview = { scope: 'Local synthetic fixture only; no independent pilot evidence', journeyId: baseline.journeyId, fixtureVersion: baseline.fixtureVersion, checkpoints: ['dialog.launcher', 'dialog.close', 'dialog.return'], reviewedAt: new Date().toISOString() };
  await writeFile(join(evidence, 'baseline-review.json'), JSON.stringify(verification.syntheticBaselineReview, null, 2));
  const baselineFile = join(consumer, 'reviewed-baselines/packed.dialog.json');
  await writeFile(baselineFile, JSON.stringify(baseline, null, 2));
  await copyFile(baselineFile, join(evidence, 'baseline.json'));
  verification.chromiumVersion = baseline.browserVersion;
  await check('explicit-environment-captured', baseline.locale === 'en-US' && baseline.viewport.width === 1280 && baseline.viewport.height === 800);
  await check('text-only-default-capture', baseline.steps.every(step => step.screenshot === undefined));

  const unchanged = await readReport(await browserRun('unchanged', 0, 'public dialog'), 'packed.dialog');
  await check('reviewed-unchanged-comparison', unchanged.json.comparison?.status === 'unchanged');
  const lost = await readReport(await browserRun('lost-return', 1, 'public dialog'), 'packed.dialog');
  await check('lost-return-is-exact-regression', lost.json.current.status === 'failed' && lost.json.comparison?.status === 'regressed'
    && lost.json.comparison.firstDifference?.index === 5 && lost.json.comparison.firstDifference?.checkpointId === 'dialog.return'
    && lost.json.comparison.firstDifference?.kind === 'checkpoint');
  const activation = await readReport(await browserRun('activation', 1, 'public dialog'), 'packed.dialog');
  await check('external-activation-failure-preserved', activation.json.current.status === 'failed' && activation.json.current.steps.every(step => step.status === 'passed')
    && activation.json.comparison?.status === 'regressed' && activation.json.comparison.firstDifference?.kind === 'run-failure'
    && activation.json.comparison.firstDifference?.index === 6 && Boolean(activation.json.current.error));
  for (const name of ['action-budget', 'checkpoint-budget']) {
    const report = await readReport(await browserRun(name, 1, 'public fixture bounds'), 'packed.bounds');
    await check(`public-${name}-capped-at100`, report.json.current.status === 'failed' && report.json.current.steps.length === 100
      && report.json.current.steps.filter(step => step.action !== null).length === 50
      && report.json.current.steps.filter(step => step.action === null).length === 50
      && /budget exceeded/i.test(report.json.current.error ?? ''));
  }
  for (const [name, record] of [['unchanged', unchanged], ['lost-return', lost], ['activation', activation]]) {
    await copyFile(record.path, join(evidence, `${name}.report.json`));
    await copyFile(record.path.replace(/\.json$/, '.html'), join(evidence, `${name}.report.html`));
    await writeFile(join(consumer, `${name}.json`), JSON.stringify(record.json.current, null, 2));
  }
  await writeFile(join(consumer, 'invalid.json'), JSON.stringify({ ...baseline, schemaVersion: 2 }));
  await writeFile(join(consumer, 'incomparable.json'), JSON.stringify({ ...baseline, browserVersion: baseline.browserVersion + '-other' }));
  const bin = join(consumer, 'node_modules/.bin/focus-trail');
  for (const [name, expectedExit] of [['unchanged', 0], ['lost-return', 1], ['activation', 1], ['invalid', 2], ['incomparable', 3]]) {
    const out = join(evidence, `cli-${name}.html`);
    await run(`cli-${name}`, bin, ['compare', baselineFile, join(consumer, `${name}.json`), '--out', out], expectedExit);
    if (expectedExit !== 2) await check(`cli-${name}-report-written`, (await readFile(out, 'utf8')).includes('<html'));
  }
  await run('cli-failed-baseline', bin, ['compare', join(consumer, 'activation.json'), join(consumer, 'unchanged.json'), '--out', join(evidence, 'cli-invalid-baseline.html')], 2);
  await check('reviewed-baseline-unchanged', (await readFile(baselineFile, 'utf8')) === JSON.stringify(baseline, null, 2));
  verification.status = 'passed';
}

try {
  await main();
} catch (error) {
  verification.status = 'failed';
  verification.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
  console.error(verification.error);
} finally {
  await mkdir(evidence, { recursive: true });
  verification.finishedAt = new Date().toISOString();
  await writeFile(join(evidence, 'verification.json'), JSON.stringify(verification, null, 2) + '\n');
  console.log(`Package verification: ${verification.status}; evidence/package/verification.json`);
}
