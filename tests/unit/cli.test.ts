import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const good = {
  schemaVersion: 1, journeyId: 'dialog', browserVersion: '156.0.8078.4',
  viewport: { width: 1280, height: 800 }, locale: 'en-US', fixtureVersion: '1', status: 'passed',
  steps: [
    { index: 0, action: 'Tab', observed: { tag: 'button', role: 'button', name: 'Open', testId: 'open' }, elapsedMs: 12, status: 'passed' },
    { index: 1, action: null, checkpointId: 'opener', expectedTargetKey: 'opener', observed: { tag: 'button', role: 'button', name: 'Open', testId: 'open' }, elapsedMs: 20, status: 'passed' },
  ],
};
const cli = resolve('dist/cli.js');
async function run(current: unknown, base: unknown = good) {
  const dir = await mkdtemp(join(tmpdir(), 'focus-trail-cli-'));
  const basePath = join(dir, 'base.json'); const currentPath = join(dir, 'current.json');
  const out = join(dir, 'nested', 'report.html');
  await writeFile(basePath, JSON.stringify(base)); await writeFile(currentPath, typeof current === 'string' ? current : JSON.stringify(current));
  const child = spawnSync(process.execPath, [cli, 'compare', basePath, currentPath, '--out', out], { encoding: 'utf8' });
  return { child, out, basePath, currentPath };
}
describe('installed CLI contract', () => {
  it('returns0 and writes a portable report for passing unchanged', async () => {
    const { child, out } = await run(good); expect(child.status, child.stderr).toBe(0);
    expect(await readFile(out, 'utf8')).toContain('Expected journey passed');
  });
  it('returns1 for failed current even when all focus steps passed', async () => {
    const { child, out } = await run({ ...good, status: 'failed', error: 'Activation failed' });
    expect(child.status, child.stderr).toBe(1); expect(await readFile(out, 'utf8')).toContain('Activation failed');
  });
  it('returns3 for different browser metadata', async () => {
    const { child } = await run({ ...good, browserVersion: 'different' }); expect(child.status, child.stderr).toBe(3);
  });
  it.each(['{', { ...good, schemaVersion: 2 }, { ...good, steps: 'invalid' }])('returns2 for invalid JSON/schema', async current => {
    const { child } = await run(current); expect(child.status, child.stderr).toBe(2);
  });
  it('returns2 for failed baseline', async () => {
    const { child } = await run(good, { ...good, status: 'failed' }); expect(child.status, child.stderr).toBe(2);
  });
  it('does not overwrite either input file', async () => {
    const { basePath, currentPath } = await run(good);
    for (const target of [basePath, currentPath]) {
      const before = await readFile(target, 'utf8');
      const child = spawnSync(process.execPath, [cli, 'compare', basePath, currentPath, '--out', target], { encoding: 'utf8' });
      expect(child.status, child.stderr).toBe(2); expect(await readFile(target, 'utf8')).toBe(before);
    }
  });
  it('handles write errors and usage as tool errors', async () => {
    const { basePath, currentPath, out } = await run(good); await mkdir(out + '-directory');
    const child = spawnSync(process.execPath, [cli, 'compare', basePath, currentPath, '--out', out + '-directory'], { encoding: 'utf8' });
    expect(child.status).toBe(2);
    expect(spawnSync(process.execPath, [cli, 'nonsense']).status).toBe(2);
  });
});
