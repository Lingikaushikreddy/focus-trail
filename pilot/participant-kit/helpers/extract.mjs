import { readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Run from the repository where the frozen candidate is installed. The helper
// can live outside that repository; module resolution still uses its package.
export async function extract(reportDirectory, journeyId, output, repository = process.cwd()) {
  if (!reportDirectory || !journeyId || !output) throw new Error('Required: REPORT_DIRECTORY JOURNEY_ID OUTPUT_JSON');
  const directory = await realpath(reportDirectory);
  const manifest = JSON.parse(await readFile(join(directory, 'reports.json'), 'utf8'));
  if (!Array.isArray(manifest)) throw new Error('reports.json must be a reporter manifest array');
  const matches = manifest.filter(record => record?.journeyId === journeyId);
  if (matches.length !== 1) throw new Error(`Expected exactly one matching capture; found ${matches.length}. Use a fresh report directory and a single test run.`);
  const filename = matches[0].json;
  if (typeof filename !== 'string' || !filename.endsWith('.json') || basename(filename) !== filename || filename.includes('\\')) {
    throw new Error('Manifest companion must be a local filename');
  }
  const source = await realpath(join(directory, filename));
  if (dirname(source) !== directory) throw new Error('Manifest companion resolves outside the report directory');
  const envelope = JSON.parse(await readFile(source, 'utf8'));
  const require = createRequire(join(resolve(repository), 'package.json'));
  const { parseJourney } = await import(pathToFileURL(require.resolve('focus-trail')).href);
  const current = parseJourney(envelope.current);
  if (current.journeyId !== journeyId) throw new Error('Companion journey does not match the requested journey');
  await writeFile(output, JSON.stringify(current, null, 2) + '\n', { flag: 'wx' });
  return { journeyId: current.journeyId, status: current.status, output: basename(output) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 5) throw new Error('Usage: node extract.mjs REPORT_DIRECTORY JOURNEY_ID OUTPUT_JSON (run from your repository root)');
    console.log(JSON.stringify(await extract(...process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
