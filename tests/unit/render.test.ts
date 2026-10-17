import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FullResult, TestCase, TestResult } from '@playwright/test/reporter';
import type { Comparison, JourneyResult } from '../../packages/core/src/types.js';
import { render, renderRun } from '../../packages/reporter/src/render.js';
import FocusTrailReporter from '../../packages/reporter/src/index.js';

const temporaryDirectories: string[] = [];
afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
async function temporaryDirectory() {
  const path = await mkdtemp(join(tmpdir(), 'focus-trail-reporter-'));
  temporaryDirectories.push(path);
  return path;
}
function journey(overrides: Partial<JourneyResult> = {}): JourneyResult {
  return {
    schemaVersion: 1, journeyId: 'dialog/open', browserVersion: 'chromium-1', viewport: { width: 1280, height: 800 },
    locale: 'en-US', fixtureVersion: 'v1', status: 'passed', steps: [
      { index: 0, action: 'Tab', elapsedMs: 1, status: 'passed', observed: { tag: 'button', role: 'button', name: 'Open dialog', testId: 'open' } },
      { index: 1, action: null, checkpointId: 'dialog.close', expectedTargetKey: 'dialog.close', elapsedMs: 2, status: 'passed', observed: { tag: 'button', role: 'button', name: 'Close dialog', testId: 'close' } },
    ], ...overrides,
  };
}
function comparison(): Comparison {
  const base = journey();
  const current = journey({ status: 'failed', steps: [base.steps[0], { ...base.steps[1], status: 'failed', observed: { tag: 'button', role: 'button', name: 'Delete account', testId: 'delete' }, error: 'Expected Close dialog, observed Delete account' }] });
  return { status: 'regressed', base, current, firstDifference: { index: 1, checkpointId: 'dialog.close', kind: 'checkpoint', reason: 'Focus did not match dialog.close' } };
}
function testCase(id = 'test-id'): TestCase {
  return { id, titlePath: () => ['suite', 'dialog keyboard'] } as TestCase;
}
function result(attachments: TestResult['attachments'], overrides: Partial<TestResult> = {}): TestResult {
  return { attachments, retry: 0, status: 'passed', errors: [], ...overrides } as TestResult;
}
const fullResult: FullResult = { status: 'passed', startTime: new Date(0), duration: 1 };

describe('portable render', () => {
  it('includes key and both target descriptions at the first differing checkpoint', () => {
    const html = render(comparison());
    expect(html).toContain('dialog.close');
    expect(html).toContain('Close dialog');
    expect(html).toContain('Delete account');
    expect(html).toContain('First difference');
    expect(html).toContain('data-step="1"');
    expect(html).toContain('Tab');
  });

  it('reports a captured run without inventing a reviewed passing baseline', () => {
    const html = renderRun(journey());
    expect(html).toContain('Review pending');
    expect(html).toContain('No reviewed baseline');
    expect(html).not.toContain('Unchanged');
    expect(html).not.toContain('Compared with reviewed baseline');
  });

  it('states that a matching passing journey passed its expected contract', () => {
    expect(render({ status: 'unchanged', base: journey(), current: journey() })).toContain('Expected journey passed');
  });

  it('keeps an action failure on its actual recorded step', () => {
    const base = journey();
    const current = journey({ status: 'failed', steps: [{ ...base.steps[0], status: 'failed', error: 'Key press failed' }, base.steps[1]] });
    const html = render({ status: 'regressed', base, current, firstDifference: { index: 0, kind: 'run-failure', reason: 'Key press failed' } });
    expect(html).toContain('data-step="0" aria-controls="step-detail" aria-current="step"');
    expect(html).not.toContain('<span class="name">Run outcome</span>');
  });

  it('keeps hostile evidence inert in markup and embedded state', () => {
    const payload = '</script><img src="https://bad.invalid/leak" onerror="globalThis.pwned=1">';
    const run = journey({ journeyId: payload, appBuild: payload, error: payload, steps: [{ ...journey().steps[0], error: payload, checkpointId: payload, expectedTargetKey: payload, observed: { tag: payload, role: payload, name: payload, testId: payload } }] });
    const html = renderRun(run);
    expect(html).not.toContain(payload);
    expect(html).toContain('&lt;/script&gt;');
    expect(html.match(/<script\b/g)?.length).toBe(1);
    expect(html).not.toMatch(/<(?:img|script)[^>]+(?:src="https:|onerror=)/);
  });

  it('embeds only PNG or JPEG data URLs and supplies text without screenshots', () => {
    const run = journey();
    run.steps[0].screenshot = 'https://bad.invalid/image.png';
    run.steps[1].screenshot = 'data:image/svg+xml;base64,PHN2Zy8+';
    expect(renderRun(run)).not.toContain('<img');
    expect(renderRun(run)).toContain('No screenshot captured');
    run.steps[0].screenshot = 'data:image/png;base64,iVBORw0KGgo=';
    expect(renderRun(run)).toContain('src="data:image/png;base64,iVBORw0KGgo="');
  });
});

describe('Playwright reporter', () => {
  it.each(['same path', 'symlink alias'] as const)('rejects a report directory sharing reviewed baselines through the %s before writing', async pathKind => {
    const directory = await temporaryDirectory();
    const baselineDir = join(directory, 'baseline');
    await mkdir(baselineDir);
    const baselineText = JSON.stringify(journey({ journeyId: 'reports' }), null, 2);
    const diagnosticsText = JSON.stringify(journey({ journeyId: 'diagnostics' }), null, 2);
    await writeFile(join(baselineDir, 'reports.json'), baselineText);
    await writeFile(join(baselineDir, 'diagnostics.json'), diagnosticsText);
    const outputDir = pathKind === 'same path' ? baselineDir : join(directory, 'report-alias');
    if (pathKind === 'symlink alias') await symlink(baselineDir, outputDir, 'dir');

    let configurationError: unknown;
    try {
      const reporter = new FocusTrailReporter({ baselineDir, outputDir });
      await reporter.onEnd(fullResult);
    } catch (error) {
      configurationError = error;
    }
    expect(await readFile(join(baselineDir, 'reports.json'), 'utf8')).toBe(baselineText);
    expect(await readFile(join(baselineDir, 'diagnostics.json'), 'utf8')).toBe(diagnosticsText);
    expect((await readdir(baselineDir)).sort()).toEqual(['diagnostics.json', 'reports.json']);
    expect(configurationError).toBeInstanceOf(Error);
    expect((configurationError as Error).message).toMatch(/outputDir.*baselineDir/i);
  });

  it('permits a distinct report directory nested inside the baseline directory', async () => {
    const directory = await temporaryDirectory();
    const outputDir = join(directory, 'report');
    const baselineText = JSON.stringify(journey({ journeyId: 'reports' }), null, 2);
    await writeFile(join(directory, 'reports.json'), baselineText);
    const reporter = new FocusTrailReporter({ baselineDir: directory, outputDir });

    expect(await reporter.onEnd(fullResult)).toBeUndefined();
    expect(await readFile(join(directory, 'reports.json'), 'utf8')).toBe(baselineText);
    expect(JSON.parse(await readFile(join(outputDir, 'reports.json'), 'utf8'))).toEqual([]);
  });

  it('consumes body and path attachments with collision-safe reports without changing baselines', async () => {
    const directory = await temporaryDirectory();
    const baselineDir = join(directory, 'baseline');
    const outputDir = join(directory, 'report');
    await mkdir(baselineDir);
    const run = journey();
    const baselinePath = join(baselineDir, 'dialog%2Fopen.json');
    const baselineText = JSON.stringify(run, null, 2);
    await writeFile(baselinePath, baselineText);
    const attachedPath = join(directory, 'attached.json');
    await writeFile(attachedPath, JSON.stringify(run));
    const reporter = new FocusTrailReporter({ baselineDir, outputDir });
    reporter.onTestEnd(testCase('test-A'), result([{ name: 'focus-trail:dialog/open.json', contentType: 'application/json', body: Buffer.from(JSON.stringify(run)) }]));
    reporter.onTestEnd(testCase('test-B'), result([{ name: 'focus-trail:dialog/open.json', contentType: 'application/json', path: attachedPath }]));
    reporter.onTestEnd(testCase('test-A'), result([{ name: 'focus-trail:dialog/open.json', contentType: 'application/json', body: Buffer.from(JSON.stringify(run)) }], { retry: 1 }));
    expect(await reporter.onEnd(fullResult)).toBeUndefined();
    const htmlNames = (await readdir(outputDir)).filter(name => name.endsWith('.html') && name !== 'index.html');
    expect(htmlNames).toHaveLength(3);
    expect(await readFile(baselinePath, 'utf8')).toBe(baselineText);
    expect(await readFile(join(outputDir, 'index.html'), 'utf8')).toContain('Unchanged');
  });

  it('leaves absent baselines review pending and does not create any', async () => {
    const directory = await temporaryDirectory();
    const baselineDir = join(directory, 'baseline');
    const outputDir = join(directory, 'report');
    const reporter = new FocusTrailReporter({ baselineDir, outputDir });
    reporter.onTestEnd(testCase(), result([{ name: 'focus-trail:dialog.json', contentType: 'application/json', body: Buffer.from(JSON.stringify(journey())) }]));
    expect(await reporter.onEnd(fullResult)).toBeUndefined();
    expect(await readFile(join(outputDir, 'index.html'), 'utf8')).toContain('Review pending');
    const report = (await readdir(outputDir)).find(name => name.endsWith('.html') && name !== 'index.html')!;
    expect(await readFile(join(outputDir, report), 'utf8')).toContain('No reviewed baseline');
    await expect(readdir(baselineDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['unconfigured', 'missing'] as const)('fails a passed attachment containing a failed step when the baseline is %s', async baseline => {
    const directory = await temporaryDirectory();
    const baselineDir = join(directory, 'baseline');
    const outputDir = join(directory, 'report');
    const run = journey();
    run.steps[1] = { ...run.steps[1], status: 'failed', error: 'Expected Close dialog, observed Delete account' };
    const captured = result([{ name: 'focus-trail:dialog.json', contentType: 'application/json', body: Buffer.from(JSON.stringify(run)) }]);
    const reporter = new FocusTrailReporter({ baselineDir: baseline === 'missing' ? baselineDir : undefined, outputDir });
    reporter.onTestEnd(testCase(), captured);

    expect(await reporter.onEnd(fullResult)).toEqual({ status: 'failed' });
    expect(captured.status).toBe('passed');
    const records = JSON.parse(await readFile(join(outputDir, 'reports.json'), 'utf8')) as { html: string; current: JourneyResult; reviewStatus: string; comparison?: Comparison }[];
    expect(records).toHaveLength(1);
    expect(records[0].current.status).toBe('failed');
    expect(records[0].current.error).toContain('failed step');
    expect(records[0].current.steps[1].status).toBe('failed');
    expect(records[0].reviewStatus).toBe('review-pending');
    expect(records[0].comparison).toBeUndefined();
    const html = await readFile(join(outputDir, records[0].html), 'utf8');
    expect(html).toContain('Current run failed');
    expect(html).toContain('Step failed');
    expect(html).not.toContain('Current run passed');
    const index = await readFile(join(outputDir, 'index.html'), 'utf8');
    expect(index).toContain('Tool failed');
    expect(index).toContain('<td>passed</td><td>failed</td><td>Review pending</td>');
    await expect(readdir(baselineDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('surfaces invalid baseline diagnostics and fails the tool separately from the test', async () => {
    const directory = await temporaryDirectory();
    const baselineDir = join(directory, 'baseline');
    const outputDir = join(directory, 'report');
    await mkdir(baselineDir);
    await writeFile(join(baselineDir, 'dialog%2Fopen.json'), '{broken');
    const reporter = new FocusTrailReporter({ baselineDir, outputDir });
    const captured = result([{ name: 'focus-trail:dialog.json', contentType: 'application/json', body: Buffer.from(JSON.stringify(journey())) }]);
    reporter.onTestEnd(testCase(), captured);
    expect(await reporter.onEnd(fullResult)).toEqual({ status: 'failed' });
    expect(captured.status).toBe('passed');
    const index = await readFile(join(outputDir, 'index.html'), 'utf8');
    expect(index).toContain('Diagnostics');
    expect(index).toContain('Invalid baseline');
    expect(index).toContain('Tool failed');
  });

  it('fails regressions while preserving an already failed or interrupted test run', async () => {
    const directory = await temporaryDirectory();
    const baselineDir = join(directory, 'baseline');
    await mkdir(baselineDir);
    await writeFile(join(baselineDir, 'dialog%2Fopen.json'), JSON.stringify(journey()));
    const reporter = new FocusTrailReporter({ baselineDir, outputDir: join(directory, 'report') });
    reporter.onTestEnd(testCase(), result([{ name: 'focus-trail:dialog.json', contentType: 'application/json', body: Buffer.from(JSON.stringify(comparison().current)) }]));
    expect(await reporter.onEnd(fullResult)).toEqual({ status: 'failed' });
    expect(await reporter.onEnd({ ...fullResult, status: 'failed' })).toBeUndefined();
    expect(await reporter.onEnd({ ...fullResult, status: 'interrupted' })).toBeUndefined();
  });

  it('marks a prematurely passed attachment failed when Playwright later reports test failure', async () => {
    const directory = await temporaryDirectory();
    const baselineDir = join(directory, 'baseline');
    const outputDir = join(directory, 'report');
    await mkdir(baselineDir);
    await writeFile(join(baselineDir, 'dialog%2Fopen.json'), JSON.stringify(journey()));
    const reporter = new FocusTrailReporter({ baselineDir, outputDir });
    reporter.onTestEnd(testCase(), result([{ name: 'focus-trail:dialog.json', contentType: 'application/json', body: Buffer.from(JSON.stringify(journey())) }], { status: 'failed' }));
    expect(await reporter.onEnd({ ...fullResult, status: 'failed' })).toBeUndefined();
    const records = JSON.parse(await readFile(join(outputDir, 'reports.json'), 'utf8')) as { testStatus: string; reviewStatus: string; current: JourneyResult; comparison: Comparison }[];
    expect(records[0].testStatus).toBe('failed');
    expect(records[0].current.status).toBe('failed');
    expect(records[0].current.error).toContain('Playwright');
    expect(records[0].reviewStatus).toBe('regressed');
    expect(records[0].comparison.firstDifference?.kind).toBe('run-failure');
  });

  it('ignores unrelated attachments but exposes malformed Focus Trail JSON', async () => {
    const directory = await temporaryDirectory();
    const reporter = new FocusTrailReporter({ outputDir: directory });
    reporter.onTestEnd(testCase(), result([
      { name: 'other.json', contentType: 'application/json', body: Buffer.from('{bad') },
      { name: 'focus-trail:notes', contentType: 'text/plain', body: Buffer.from('{bad') },
      { name: 'focus-trail:broken.json', contentType: 'application/json', body: Buffer.from('{bad') },
    ]));
    expect(await reporter.onEnd(fullResult)).toEqual({ status: 'failed' });
    const diagnostics = JSON.parse(await readFile(join(directory, 'diagnostics.json'), 'utf8')) as { message: string }[];
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('Invalid attachment');
  });
});
