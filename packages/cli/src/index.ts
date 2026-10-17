#!/usr/bin/env node
import { readFile, stat, mkdir, writeFile, rename, rm, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { compare, parseJourney } from '../../core/src/compare.js';
import { render } from '../../reporter/src/render.js';

const usage = 'Usage: focus-trail compare base.json current.json --out report.html';
async function readJourney(path: string) {
  if ((await stat(path)).size > 10 * 1024 * 1024) throw new Error('Journey file exceeds 10 MiB.');
  return parseJourney(await readFile(path, 'utf8'));
}
export async function main(args: string[]): Promise<number> {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { console.log(usage); return 0; }
  if (args.length === 1 && args[0] === '--version') { console.log('0.1.0'); return 0; }
  if (args[0] !== 'compare' || ![3, 5].includes(args.length) || (args.length === 5 && args[3] !== '--out')) { console.error(usage); return 2; }
  let temporary: string | undefined;
  try {
    const basePath = resolve(args[1]); const currentPath = resolve(args[2]); const out = resolve(args[4] ?? 'report.html');
    const inputs = await Promise.all([realpath(basePath), realpath(currentPath)]);
    const existingOut = await realpath(out).catch(() => out);
    if ([basePath, currentPath, ...inputs].includes(out) || inputs.includes(existingOut)) throw new Error('Report output cannot overwrite a journey input or baseline.');
    const [base, current] = await Promise.all([readJourney(basePath), readJourney(currentPath)]);
    const comparison = compare(base, current);
    await mkdir(dirname(out), { recursive: true });
    temporary = out + '.' + randomUUID() + '.tmp';
    await writeFile(temporary, render(comparison), { flag: 'wx' });
    await rename(temporary, out); temporary = undefined;
    console.log(`${comparison.status}: ${comparison.firstDifference?.reason ?? comparison.reason ?? 'Expected journey passed'}\nReport: ${out}`);
    return comparison.status === 'unchanged' ? 0 : comparison.status === 'regressed' ? 1 : 3;
  } catch (error) {
    console.error('Focus Trail tool error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    return 2;
  } finally { if (temporary) await rm(temporary, { force: true }).catch(() => {}); }
}
process.exitCode = await main(process.argv.slice(2));
