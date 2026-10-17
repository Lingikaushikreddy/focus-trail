import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import { captureFocus, inspectTarget, maskText } from './capture.js';
import { SUPPORTED_KEYS, type Journey, type JourneyFactory, type JourneyOptions, type JourneyResult, type ObservedFocus, type Step, type SupportedKey } from './types.js';

let attachmentSequence = 0;
const unavailable = (): ObservedFocus => ({ tag: null, role: null, name: null, testId: null, unavailable: 'Focus capture unavailable' });

async function bounded<T>(operation: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), Math.max(1, milliseconds));
    })]);
  } finally {
    clearTimeout(timer);
  }
}

function budget(value: number | undefined, maximum: number, name: string, integer = false): number {
  const selected = value ?? maximum;
  if (!Number.isFinite(selected) || selected <= 0 || selected > maximum || (integer && !Number.isInteger(selected))) {
    throw new Error(`${name} budget must be between 1 and the maximum ${maximum}`);
  }
  return selected;
}

function firstLine(error: { message?: string; value?: string } | undefined): string {
  // Playwright's subsequent error lines may include DOM excerpts and form values.
  const message = error?.message ?? error?.value ?? 'Application test failed';
  return message.replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/).find(line => line.trim())?.slice(0, 1000) ?? 'Application test failed';
}

export function createJourney(page: Page, testInfo: TestInfo, options: JourneyOptions): Journey {
  const browser = page.context().browser();
  if (!browser || browser.browserType().name() !== 'chromium') throw new Error('Focus Trail requires a Chromium browser');
  const viewport = page.viewportSize();
  if (!viewport || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) {
    throw new Error('Focus Trail requires an explicit fixed positive viewport');
  }
  if (!options.journeyId?.trim() || !options.fixtureVersion?.trim()) throw new Error('Journey ID and fixture version must be nonempty strings');
  const maxActions = budget(options.maxActions, 50, 'Action', true);
  const maxDuration = budget(options.maxDurationMs, 30_000, 'Duration');
  const checkpointTimeout = budget(options.checkpointTimeoutMs, 5000, 'Checkpoint timeout');
  const masks = options.masks ?? [];
  if (!Array.isArray(masks) || masks.some(mask => typeof mask !== 'string')) throw new Error('Masks must be literal strings');
  const redact = (value: string) => maskText(value, masks);
  const started = performance.now();
  const result: JourneyResult = {
    schemaVersion: 1, journeyId: redact(options.journeyId), fixtureVersion: redact(options.fixtureVersion),
    ...(options.appBuild === undefined ? {} : { appBuild: redact(options.appBuild) }),
    browserVersion: browser.version(), viewport: { ...viewport }, locale: 'unavailable', status: 'passed', steps: [],
  };
  let actions = 0;
  let checkpoints = 0;
  let finalized = false;
  let attachedPath: string | undefined;
  let attachmentFile: string | undefined;
  let finalization: Promise<JourneyResult> | undefined;
  let durationChecked = false;
  let pending: Promise<void> = Promise.resolve();
  let initializationError: string | undefined;
  const remaining = () => maxDuration - (performance.now() - started);
  const initialization = bounded(page.evaluate(() => navigator.language), Math.max(1, remaining()), 'Journey duration budget exceeded')
    .then(locale => { result.locale = redact(locale); }, error => {
      initializationError = error instanceof Error && error.message === 'Journey duration budget exceeded'
        ? 'Journey duration budget exceeded' : 'Journey environment capture unavailable';
    });
  const fail = (message: string) => {
    result.status = 'failed';
    result.error ??= redact(message);
    return new Error(redact(message));
  };
  const assertDuration = () => {
    if (remaining() <= 0) throw new Error('Journey duration budget exceeded');
  };
  const capture = async (milliseconds: number) => bounded(captureFocus(page, masks), Math.max(1, milliseconds), 'Focus capture unavailable').catch(unavailable);
  const queue = (operation: () => Promise<void>): Promise<void> => {
    if (finalized) return Promise.reject(new Error('Journey is already finalized'));
    const current = pending.then(operation);
    pending = current.catch(() => {});
    return current;
  };

  const record = async (action: SupportedKey | null, checkpointId: string | undefined, operation: (step: Step) => Promise<void>) => {
    const step: Step = {
      index: result.steps.length, action,
      ...(checkpointId === undefined ? {} : { checkpointId: redact(checkpointId), expectedTargetKey: redact(checkpointId) }),
      observed: unavailable(), elapsedMs: 0, status: 'passed',
    };
    result.steps.push(step);
    try {
      await initialization;
      assertDuration();
      if (initializationError) throw new Error(initializationError);
      await operation(step);
    } catch (error) {
      if (step.observed.unavailable === 'Focus capture unavailable') step.observed = await capture(Math.min(200, Math.max(1, remaining())));
      step.status = 'failed';
      step.error = redact(error instanceof Error ? error.message : 'Journey operation failed');
      throw fail(step.error);
    } finally {
      step.elapsedMs = Math.max(0, Math.round(performance.now() - started));
    }
  };

  const journey: Journey = {
    press(key) {
      return queue(async () => {
        if (!SUPPORTED_KEYS.includes(key)) throw fail('Unsupported keyboard key');
        if (actions >= maxActions) throw fail('Action budget exceeded');
        if (remaining() <= 0) throw fail('Journey duration budget exceeded');
        actions++;
        await record(key, undefined, async step => {
          try {
            await bounded(page.keyboard.press(key), remaining(), 'Journey duration budget exceeded');
          } catch {
            throw new Error(page.isClosed() ? 'Keyboard input unavailable: page closed' : 'Keyboard input failed or journey duration budget exceeded');
          }
          step.observed = await capture(remaining());
          if (step.observed.unavailable?.startsWith('Unsupported')) throw new Error(step.observed.unavailable);
          assertDuration();
        });
      });
    },
    expectFocus(id, target) {
      return queue(async () => {
        if (typeof id !== 'string' || !id.trim()) throw fail('Checkpoint ID must be a nonempty stable target key');
        if (checkpoints >= 50) throw fail('Checkpoint budget exceeded');
        if (remaining() <= 0) throw fail('Journey duration budget exceeded');
        checkpoints++;
        await record(null, id, async step => {
          const deadline = performance.now() + Math.min(checkpointTimeout, remaining());
          let fatal: string | undefined;
          let lastCoherent: { observed: ObservedFocus; elapsedMs: number } | undefined;
          const retainSample = (reason = 'latest focus capture unavailable') => {
            if (lastCoherent) step.observed = {
              ...lastCoherent.observed,
              unavailable: `Last coherent sample at ${lastCoherent.elapsedMs}ms; ${reason}`,
            };
          };
          const storeEvidence = (evidence: ObservedFocus) => {
            if (!evidence.unavailable || evidence.unavailable === 'No focused element: document body') {
              lastCoherent = { observed: { ...evidence }, elapsedMs: Math.max(0, Math.round(performance.now() - started)) };
              step.observed = evidence;
            } else if (evidence.unavailable.includes('focus changed') || evidence.unavailable.startsWith('Unsupported')) {
              // An actual change/boundary observation invalidates a retained node.
              lastCoherent = undefined;
              step.observed = evidence;
            } else if (lastCoherent) {
              retainSample();
            } else {
              step.observed = evidence;
            }
          };
          try {
            await expect.poll(async () => {
              const left = Math.min(deadline - performance.now(), remaining());
              if (left <= 0) return false;
              const before = await bounded(inspectTarget(page, target), left, 'Checkpoint focus wait timed out');
              if (before.unsupported || before.count > 1) {
                fatal = before.unsupported ?? `Checkpoint target must be unique; found ${before.count} elements`;
                return true;
              }
              let handle: Awaited<ReturnType<typeof target.elementHandle>> | null = null;
              try {
                if (before.count === 1) handle = await target.elementHandle({ timeout: Math.max(1, deadline - performance.now()) });
                const heldBefore = handle ? await bounded(handle.evaluate(element => element.isConnected && element === document.activeElement), deadline - performance.now(), 'Checkpoint focus wait timed out') : false;
                const evidence = await capture(Math.min(deadline - performance.now(), remaining()));
                // Stop late callbacks from changing evidence after the poll deadline.
                if (performance.now() > deadline) return false;
                storeEvidence(evidence);
                if (evidence.unavailable?.startsWith('Unsupported')) {
                  fatal = evidence.unavailable;
                  return true;
                }
                const after = await bounded(inspectTarget(page, target), Math.min(deadline - performance.now(), remaining()), 'Checkpoint focus wait timed out');
                if (after.unsupported || after.count > 1) {
                  fatal = after.unsupported ?? `Checkpoint target must be unique; found ${after.count} elements`;
                  return true;
                }
                const heldAfter = handle ? await bounded(handle.evaluate(element => element.isConnected && element === document.activeElement), deadline - performance.now(), 'Checkpoint focus wait timed out') : false;
                return heldBefore && heldAfter && after.focused && !evidence.unavailable?.includes('focus changed');
              } finally {
                await handle?.dispose().catch(() => {});
              }
            }, { timeout: Math.max(1, deadline - performance.now()), intervals: [20, 25, 40, 50] }).toBe(true);
          } catch {
            retainSample('checkpoint wait ended without a later verified sample');
            assertDuration();
            throw new Error(fatal ?? `Checkpoint ${redact(id)} did not receive focus within ${checkpointTimeout}ms`);
          }
          if (fatal) throw new Error(fatal);
        });
      });
    },
    async finish() {
      finalized = true;
      // Calls serialize so updates of an earlier attachment cannot race teardown.
      const previous = finalization;
      finalization = (async () => {
        await previous;
        await pending;
        await initialization;
        if (initializationError) fail(initializationError);
        if (!durationChecked) {
          durationChecked = true;
          if (remaining() <= 0) fail('Journey duration budget exceeded');
        }
        if (testInfo.status === 'failed' || testInfo.status === 'timedOut' || testInfo.status === 'interrupted') {
          result.status = 'failed';
          result.error ??= redact(`Application test failed: ${firstLine(testInfo.errors[0])}`);
        }
        const body = JSON.stringify(result, null, 2);
        if (!attachmentFile) {
          attachmentFile = testInfo.outputPath(`focus-trail-${attachmentSequence++}.json`);
          await mkdir(dirname(attachmentFile), { recursive: true });
        }
        await writeFile(attachmentFile, body, 'utf8');
        if (!attachedPath) {
          const before = testInfo.attachments.length;
          await testInfo.attach(`focus-trail:${result.journeyId}.json`, { path: attachmentFile, contentType: 'application/json' });
          attachedPath = testInfo.attachments[before]?.path;
        } else {
          // attach(path) copies the file. Refresh the reporter's actual path too.
          await writeFile(attachedPath, body, 'utf8');
        }
        return result;
      })();
      return finalization;
    },
  };
  return journey;
}

export const test = base.extend<{ journey: JourneyFactory }>({
  journey: async ({ page: _page }, use) => {
    const journeys: Journey[] = [];
    await use((page, testInfo, options) => {
      const journey = createJourney(page, testInfo, options);
      journeys.push(journey);
      return journey;
    });
    const finalized = await Promise.allSettled(journeys.map(journey => journey.finish()));
    const failure = finalized.find(result => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
  },
});
