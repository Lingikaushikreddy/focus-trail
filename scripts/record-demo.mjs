import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { compare, parseJourney } from '../dist/index.js';
import { render } from '../dist/reporter.js';

const directory = resolve('evidence/demo');
await mkdir(directory, { recursive: true });
await rm(resolve(directory, 'baselines'), { recursive: true, force: true });
await mkdir(resolve(directory, 'baselines'));
async function run(variant, kind, expectedExit) {
  const out = resolve('work/demo-record-' + variant);
  await rm(out, { recursive: true, force: true });
  const args = ['node_modules/@playwright/test/cli.js', 'test', '-c', 'examples/dialog/playwright.config.ts'];
  if (kind) args.push('--grep', kind);
  const child = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, FOCUS_TRAIL_VARIANT: variant, FOCUS_TRAIL_REPORT_OUTPUT: out, FOCUS_TRAIL_TEST_OUTPUT: resolve('work/demo-tests-' + variant) } });
  await writeFile(resolve(directory, variant + '.log'), (child.stdout ?? '') + (child.stderr ?? ''));
  assert.equal(child.status, expectedExit, `Demo ${variant} expected exit ${expectedExit}\n${child.stdout}\n${child.stderr}`);
  const records = JSON.parse(await readFile(resolve(out, 'reports.json'), 'utf8'));
  return { records, out };
}
const good = await run('good', undefined, 0);
assert.equal(good.records.length, 3);
for (const record of good.records) {
  const base = parseJourney(record.current); assert.equal(base.status, 'passed');
  assert(base.steps.every(step => step.status === 'passed'));
  // These qualification fixtures have authored expectations and independent demo oracles.
  await writeFile(resolve(directory, 'baselines', encodeURIComponent(base.journeyId) + '.json'), JSON.stringify(base, null, 2));
}
const base = good.records.find(record => record.journeyId === 'return-focus').current;
await writeFile(resolve(directory, 'good.html'), render(compare(base, base)));
await writeFile(resolve(directory, 'good.json'), JSON.stringify(base, null, 2));
const summary = [];
for (const [variant, kind, index, differenceKind] of [
  ['lost-return', 'return-focus', 7, 'checkpoint'],
  ['escape', 'modal-containment', 7, 'checkpoint'],
  ['activation', 'activation', 3, 'run-failure'],
]) {
  const { records, out } = await run(variant, kind, 1);
  assert.equal(records.length, 1); const record = records[0];
  assert.equal(record.reviewStatus, 'regressed'); assert.equal(record.current.status, 'failed');
  assert.equal(record.comparison.firstDifference.index, index); assert.equal(record.comparison.firstDifference.kind, differenceKind);
  if (variant === 'activation') { assert(record.current.steps.every(step => step.status === 'passed')); assert.equal(record.current.steps.at(-1).observed.testId, 'opener'); }
  await copyFile(resolve(out, record.html), resolve(directory, variant + '.html'));
  await writeFile(resolve(directory, variant + '.json'), JSON.stringify(record, null, 2));
  summary.push({ variant, journeyId: kind, expectedExit: 1, actualExit: 1, status: record.reviewStatus, firstDifference: record.comparison.firstDifference });
}
await writeFile(resolve(directory, 'verification.json'), JSON.stringify({ passingJourneys: 3, detectedFaults: summary }, null, 2));
console.log('Recorded 3 passing baselines and verified all 3 deliberately failing demo journeys.');
