import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from '../../../participant-kit/helpers/extract.mjs';

const repository = resolve(process.env.FOCUS_TRAIL_TEST_REPOSITORY || fileURLToPath(new URL('../../../../', import.meta.url)));
const current = {
  schemaVersion: 1, journeyId: 'pilot.dialog', browserVersion: '156.0.8078.4',
  viewport: { width: 1280, height: 800 }, locale: 'en-US', fixtureVersion: 'pilot-v1', status: 'passed',
  steps: [{ index: 0, action: null, checkpointId: 'opener', expectedTargetKey: 'opener',
    observed: { tag: 'BUTTON', role: 'button', name: 'Open', testId: 'open' }, elapsedMs: 1, status: 'passed' }],
};

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'focus-pilot-extract-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const reports = join(dir, 'reports');
  await mkdir(reports);
  const row = { journeyId: 'pilot.dialog', json: 'capture.json', testStatus: 'passed', reviewStatus: 'review-pending' };
  await writeFile(join(reports, 'reports.json'), JSON.stringify([row]));
  await writeFile(join(reports, 'capture.json'), JSON.stringify({ ...row, current }));
  return { dir, reports, row, out: join(dir, 'current.json') };
}

test('extracts one validated raw current from a reporter envelope', async t => {
  const f = await fixture(t);
  await extract(f.reports, 'pilot.dialog', f.out, repository);
  assert.deepEqual(JSON.parse(await readFile(f.out, 'utf8')), current);
});
test('refuses an absent journey instead of choosing a different capture', async t => {
  const f = await fixture(t);
  await assert.rejects(extract(f.reports, 'unknown', f.out, repository), /exactly one/);
});
test('refuses repeated journey records rather than arbitrarily selecting a retry', async t => {
  const f = await fixture(t);
  await writeFile(join(f.reports, 'reports.json'), JSON.stringify([f.row, f.row]));
  await assert.rejects(extract(f.reports, 'pilot.dialog', f.out, repository), /exactly one/);
});
test('rejects path traversal from the manifest', async t => {
  const f = await fixture(t);
  await writeFile(join(f.dir, 'outside.json'), JSON.stringify({ current }));
  await writeFile(join(f.reports, 'reports.json'), JSON.stringify([{ ...f.row, json: '../outside.json' }]));
  await assert.rejects(extract(f.reports, 'pilot.dialog', f.out, repository), /local filename/);
});
test('rejects a companion symlink outside the report directory', async t => {
  const f = await fixture(t);
  await writeFile(join(f.dir, 'outside.json'), JSON.stringify({ current }));
  await symlink(join(f.dir, 'outside.json'), join(f.reports, 'link.json'));
  await writeFile(join(f.reports, 'reports.json'), JSON.stringify([{ ...f.row, json: 'link.json' }]));
  await assert.rejects(extract(f.reports, 'pilot.dialog', f.out, repository), /outside/);
});
test('refuses a manifest companion containing a different journey', async t => {
  const f = await fixture(t);
  await writeFile(join(f.reports, 'capture.json'), JSON.stringify({ current: { ...current, journeyId: 'another' } }));
  await assert.rejects(extract(f.reports, 'pilot.dialog', f.out, repository), /does not match/);
});
test('uses package schema validation before writing output', async t => {
  const f = await fixture(t);
  await writeFile(join(f.reports, 'capture.json'), JSON.stringify({ current: { ...current, schemaVersion: 2 } }));
  await assert.rejects(extract(f.reports, 'pilot.dialog', f.out, repository), /schemaVersion/);
});
test('does not overwrite an existing extracted file', async t => {
  const f = await fixture(t);
  await writeFile(f.out, 'keep this');
  await assert.rejects(extract(f.reports, 'pilot.dialog', f.out, repository), /EEXIST/);
  assert.equal(await readFile(f.out, 'utf8'), 'keep this');
});
test('preserves a failed capture as evidence without silently converting it to passing', async t => {
  const f = await fixture(t);
  await writeFile(join(f.reports, 'capture.json'), JSON.stringify({ current: { ...current, status: 'failed', error: 'test failed' } }));
  await extract(f.reports, 'pilot.dialog', f.out, repository);
  assert.equal(JSON.parse(await readFile(f.out, 'utf8')).status, 'failed');
});
