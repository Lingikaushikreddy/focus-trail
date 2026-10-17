import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { compare, parseJourney } from '../../core/src/compare.js';
import type { Comparison, JourneyResult } from '../../core/src/types.js';
import { render, renderRun } from './render.js';

export { render, renderRun } from './render.js';
export interface ReporterOptions { baselineDir?: string; outputDir?: string }
type ReviewStatus = Comparison['status'] | 'review-pending' | 'tool-error';
interface ReportRecord {
  testId: string;
  testTitle: string;
  testStatus: TestResult['status'];
  retry: number;
  journeyId: string;
  reviewStatus: ReviewStatus;
  html: string;
  json: string;
  current: JourneyResult;
  comparison?: Comparison;
}
interface Diagnostic { testId?: string; attachment?: string; message: string }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function escaped(value: string | number): string {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
function isMissing(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'; }
function canonicalDirectory(path: string): string {
  try { return realpathSync(path); }
  catch (error) {
    if (!isMissing(error)) throw error;
    return path;
  }
}

/** Writes local evidence and compares only explicitly reviewed baselines. */
export default class FocusTrailReporter implements Reporter {
  private readonly outputDir: string;
  private readonly baselineDir?: string;
  private readonly pending: Promise<void>[] = [];
  private readonly records: ReportRecord[] = [];
  private readonly diagnostics: Diagnostic[] = [];
  private readonly counts = new Map<string, number>();
  constructor(options: ReporterOptions = {}) {
    this.outputDir = resolve(options.outputDir ?? 'focus-trail-report');
    this.baselineDir = options.baselineDir === undefined ? undefined : resolve(options.baselineDir);
    if (this.baselineDir !== undefined && canonicalDirectory(this.outputDir) === canonicalDirectory(this.baselineDir)) {
      throw new Error('Focus Trail outputDir must differ from baselineDir to preserve reviewed baselines.');
    }
  }
  onTestEnd(test: TestCase, result: TestResult): void {
    for (const attachment of result.attachments) {
      if (!attachment.name.startsWith('focus-trail:') || !/^application\/json(?:\s*;|$)/i.test(attachment.contentType)) continue;
      this.pending.push(this.consume(test, result, attachment).catch(error => {
        this.diagnostics.push({ testId: test.id, attachment: attachment.name, message: `Report error: ${errorMessage(error)}` });
      }));
    }
  }
  private async consume(test: TestCase, result: TestResult, attachment: TestResult['attachments'][number]): Promise<void> {
    let current: JourneyResult;
    try {
      const input = attachment.body ?? (attachment.path ? await readFile(attachment.path) : undefined);
      if (!input) throw new Error('Attachment has neither a body nor a local path');
      if (input.byteLength > 10 * 1024 * 1024) throw new Error('Attachment exceeds 10 MiB');
      current = parseJourney(JSON.parse(input.toString('utf8')));
      if (current.status === 'passed' && current.steps.some(step => step.status === 'failed')) {
        const stepFailure = 'The captured journey contains a failed step despite its passed status.';
        current = { ...current, status: 'failed', error: current.error ? `${current.error}\n${stepFailure}` : stepFailure };
      }
      if (current.status === 'passed' && result.status !== 'passed' && result.status !== 'skipped') {
        const lateFailure = `Playwright test ended with status "${result.status}" after the journey was captured.`;
        current = { ...current, status: 'failed', error: current.error ? `${current.error}\n${lateFailure}` : lateFailure };
      }
    } catch (error) {
      this.diagnostics.push({ testId: test.id, attachment: attachment.name, message: `Invalid attachment: ${errorMessage(error)}` });
      return;
    }
    let comparison: Comparison | undefined;
    let reviewStatus: ReviewStatus = 'review-pending';
    if (this.baselineDir) {
      try {
        const encoded = encodeURIComponent(current.journeyId);
        if (encoded.length > 200) throw new Error('Encoded journey id exceeds 200 characters for a baseline filename');
        const baselinePath = join(this.baselineDir, `${encoded}.json`);
        const baselineInput = await readFile(baselinePath, 'utf8');
        if (Buffer.byteLength(baselineInput) > 10 * 1024 * 1024) throw new Error('Baseline exceeds 10 MiB');
        const base = parseJourney(JSON.parse(baselineInput));
        comparison = compare(base, current);
        reviewStatus = comparison.status;
      } catch (error) {
        if (!isMissing(error)) {
          reviewStatus = 'tool-error';
          this.diagnostics.push({ testId: test.id, attachment: attachment.name, message: `Invalid baseline: ${errorMessage(error)}` });
        }
      }
    }
    const identity = JSON.stringify([test.id, current.journeyId, result.retry]);
    const occurrence = this.counts.get(identity) ?? 0;
    this.counts.set(identity, occurrence + 1);
    const hash = createHash('sha256').update(identity).update(String(occurrence)).digest('hex').slice(0, 32);
    const record: ReportRecord = {
      testId: test.id, testTitle: test.titlePath().filter(Boolean).join(' › '), testStatus: result.status, retry: result.retry,
      journeyId: current.journeyId, reviewStatus, html: `${hash}.html`, json: `${hash}.json`, current, comparison,
    };
    await mkdir(this.outputDir, { recursive: true });
    await writeFile(join(this.outputDir, record.html), comparison ? render(comparison) : renderRun(current));
    await writeFile(join(this.outputDir, record.json), `${JSON.stringify(record, null, 2)}\n`);
    this.records.push(record);
  }
  async onEnd(result: FullResult): Promise<{ status?: FullResult['status'] } | undefined> {
    await Promise.all(this.pending);
    const toolFailed = this.diagnostics.length > 0 || this.records.some(record => record.reviewStatus === 'regressed' || record.reviewStatus === 'incomparable'
      || record.current.status === 'failed' || record.current.steps.some(step => step.status === 'failed'));
    try {
      await mkdir(this.outputDir, { recursive: true });
      await writeFile(join(this.outputDir, 'reports.json'), `${JSON.stringify(this.records, null, 2)}\n`);
      await writeFile(join(this.outputDir, 'diagnostics.json'), `${JSON.stringify(this.diagnostics, null, 2)}\n`);
      await writeFile(join(this.outputDir, 'index.html'), this.index(result, toolFailed));
    } catch (error) {
      this.diagnostics.push({ message: `Could not write report index: ${errorMessage(error)}` });
    }
    for (const diagnostic of this.diagnostics) process.stderr.write(`Focus Trail: ${diagnostic.message}\n`);
    // Preserve Playwright's own failed, timed out, or interrupted outcome.
    if (result.status === 'passed' && (toolFailed || this.diagnostics.length > 0)) return { status: 'failed' };
    return undefined;
  }
  private index(result: FullResult, toolFailed: boolean): string {
    const labels: Record<ReviewStatus, string> = { unchanged: 'Unchanged', regressed: 'Regressed', incomparable: 'Incomparable', 'review-pending': 'Review pending', 'tool-error': 'Tool error' };
    const rows = this.records.map(record => `<tr><td><a href="${record.html}">${escaped(record.journeyId)}</a><br><small>${escaped(record.testTitle)} · Retry ${record.retry}</small></td><td>${escaped(record.testStatus)}</td><td>${escaped(record.current.status)}</td><td>${labels[record.reviewStatus]}</td><td><a href="${record.json}">JSON evidence</a></td></tr>`).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Focus Trail reports</title><style>:root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#15243a;background:#fff;line-height:1.55}*{box-sizing:border-box}body{margin:0}header{padding:2rem;background:#193a63;color:white}h1{margin:0;font-size:2rem}main{max-width:75rem;margin:auto;padding:1.5rem}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:.8rem;border-bottom:1px solid #d1dce8;overflow-wrap:anywhere}a{color:#125db8}a:focus-visible{outline:3px solid #125db8;outline-offset:3px}small{color:#4b5e76}li{overflow-wrap:anywhere}.scroll{overflow:auto}@media(max-width:600px){header{padding:1.25rem}main{padding:1rem}th,td{padding:.5rem}}</style></head><body><header><h1>Focus Trail reports</h1><p>Playwright run ${escaped(result.status)} · ${toolFailed ? 'Tool failed' : 'Tool completed'}</p></header><main><p>Baseline review and test outcomes are recorded separately. All evidence stays in this local directory.</p><div class="scroll"><table><thead><tr><th>Journey</th><th>Test</th><th>Captured run</th><th>Baseline review</th><th>Evidence</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No Focus Trail JSON attachments were captured.</td></tr>'}</tbody></table></div>${this.diagnostics.length ? `<section><h2>Diagnostics</h2><ul>${this.diagnostics.map(diagnostic => `<li>${escaped(diagnostic.message)}${diagnostic.testId ? ` · Test ${escaped(diagnostic.testId)}` : ''}${diagnostic.attachment ? ` · Attachment ${escaped(diagnostic.attachment)}` : ''}</li>`).join('')}</ul></section>` : ''}</main></body></html>`;
  }
}
