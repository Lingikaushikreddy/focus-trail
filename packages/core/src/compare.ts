import { SUPPORTED_KEYS, type Comparison, type Difference, type JourneyResult, type ObservedFocus, type RunStatus, type Step } from './types.js';

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_STEPS = 100;
const MAX_ELAPSED_MS = 60_000;
const MAX_TEXT_LENGTH = 65_536;

/** Invalid records and unsuccessful baselines cannot be used for comparison. */
export class InvalidJourneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidJourneyError';
  }
}

function invalid(path: string, message: string): never {
  throw new InvalidJourneyError(`${path}: ${message}`);
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(path, 'expected an object');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid(path, 'expected a JSON object');
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, nonempty = false): string {
  if (typeof value !== 'string' || value.length > MAX_TEXT_LENGTH || (nonempty && !value.trim())) {
    invalid(path, nonempty ? 'expected a bounded, nonempty string' : 'expected a bounded string');
  }
  return value;
}

function optionalText(record: Record<string, unknown>, field: string, path: string): string | undefined {
  return record[field] === undefined ? undefined : text(record[field], `${path}.${field}`);
}

function status(value: unknown, path: string): RunStatus {
  if (value !== 'passed' && value !== 'failed') invalid(path, 'expected passed or failed');
  return value;
}

function observed(value: unknown, path: string): ObservedFocus {
  const record = object(value, path);
  const nullable = (field: string) => record[field] === null ? null : text(record[field], `${path}.${field}`);
  const result: ObservedFocus = {
    tag: nullable('tag'), role: nullable('role'), name: nullable('name'), testId: nullable('testId'),
  };
  const unavailable = optionalText(record, 'unavailable', path);
  if (unavailable !== undefined) result.unavailable = unavailable;
  return result;
}

function screenshot(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 32) {
    invalid(path, 'expected a bounded raster image data URL');
  }
  // Local files, remote URLs, SVG, HTML, and parameters beyond base64 are never embedded.
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) invalid(path, 'expected a PNG, JPEG, or WebP base64 data URL');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== match[2]) invalid(path, 'invalid or oversized image encoding');
  const format = match[1];
  const validPng = format === 'png' && bytes.length >= 45
    && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && bytes.toString('ascii', 12, 16) === 'IHDR'
    && bytes.toString('ascii', bytes.length - 8, bytes.length - 4) === 'IEND';
  const validJpeg = format === 'jpeg' && bytes.length >= 4
    && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
  const validWebp = format === 'webp' && bytes.length >= 20
    && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    && bytes.readUInt32LE(4) === bytes.length - 8;
  if (!validPng && !validJpeg && !validWebp) invalid(path, 'image bytes do not match the declared raster format');
  return value;
}

function step(value: unknown, index: number): Step {
  const path = `steps[${index}]`;
  const record = object(value, path);
  if (record.index !== index) invalid(`${path}.index`, 'expected contiguous zero-based indices');
  if (typeof record.elapsedMs !== 'number' || !Number.isFinite(record.elapsedMs)
    || record.elapsedMs < 0 || record.elapsedMs > MAX_ELAPSED_MS) {
    invalid(`${path}.elapsedMs`, `expected a finite timing between 0 and ${MAX_ELAPSED_MS}ms`);
  }
  const result: Step = {
    index, action: null, observed: observed(record.observed, `${path}.observed`),
    elapsedMs: record.elapsedMs, status: status(record.status, `${path}.status`),
  };
  if (record.action === null) {
    result.checkpointId = text(record.checkpointId, `${path}.checkpointId`, true);
    result.expectedTargetKey = text(record.expectedTargetKey, `${path}.expectedTargetKey`, true);
  } else {
    if (!SUPPORTED_KEYS.some(key => key === record.action)) invalid(`${path}.action`, 'unsupported keyboard action');
    if (Object.hasOwn(record, 'checkpointId') || Object.hasOwn(record, 'expectedTargetKey')) {
      invalid(path, 'action steps cannot contain checkpoint fields');
    }
    result.action = record.action as Step['action'];
  }
  const error = optionalText(record, 'error', path);
  if (error !== undefined) result.error = error;
  if (record.screenshot !== undefined) result.screenshot = screenshot(record.screenshot, `${path}.screenshot`);
  return result;
}

/** Validate untrusted JSON before it is rendered or treated as a baseline. */
export function parseJourney(input: unknown): JourneyResult {
  let value: unknown = input;
  try {
    let accumulatedBytes = 0;
    const json = typeof input === 'string' ? input : JSON.stringify(input, (key, value: unknown) => {
      // Stop oversized objects before JSON.stringify allocates their complete serialized form.
      accumulatedBytes += Buffer.byteLength(key, 'utf8') + (typeof value === 'string' ? Buffer.byteLength(value, 'utf8') : 8);
      if (accumulatedBytes > MAX_INPUT_BYTES) invalid('journey', 'JSON input exceeds the size limit');
      return value;
    });
    if (json === undefined || Buffer.byteLength(json, 'utf8') > MAX_INPUT_BYTES) invalid('journey', 'JSON input exceeds the size limit');
    if (typeof input === 'string') value = JSON.parse(json) as unknown;
  } catch (error) {
    if (error instanceof InvalidJourneyError) throw error;
    invalid('journey', 'expected valid, acyclic JSON');
  }
  const record = object(value, 'journey');
  if (record.schemaVersion !== 1) invalid('schemaVersion', 'only schema version 1 is supported');
  const viewport = object(record.viewport, 'viewport');
  const dimension = (field: string): number => {
    const value = viewport[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) invalid(`viewport.${field}`, 'expected a positive, finite number');
    return value;
  };
  if (!Array.isArray(record.steps) || record.steps.length > MAX_STEPS) invalid('steps', `expected an array of at most ${MAX_STEPS} steps`);
  const result: JourneyResult = {
    schemaVersion: 1,
    journeyId: text(record.journeyId, 'journeyId', true),
    browserVersion: text(record.browserVersion, 'browserVersion', true),
    viewport: { width: dimension('width'), height: dimension('height') },
    locale: text(record.locale, 'locale', true),
    fixtureVersion: text(record.fixtureVersion, 'fixtureVersion', true),
    status: status(record.status, 'status'),
    steps: Array.from(record.steps, (value, index) => step(value, index)),
  };
  const appBuild = optionalText(record, 'appBuild', 'journey');
  const error = optionalText(record, 'error', 'journey');
  if (appBuild !== undefined) result.appBuild = appBuild;
  if (error !== undefined) result.error = error;
  return result;
}

function change(index: number, base: Step | undefined, current: Step | undefined): Difference | undefined {
  const checkpointId = current?.checkpointId ?? base?.checkpointId;
  const difference = (kind: Difference['kind'], reason: string): Difference => ({
    index, ...(checkpointId === undefined ? {} : { checkpointId }), kind, reason,
  });
  if (!base || !current) return difference('journey-change', 'The journey has a missing or extra step; baseline review is required.');
  if (base.action !== current.action || base.checkpointId !== current.checkpointId || base.expectedTargetKey !== current.expectedTargetKey) {
    return difference('journey-change', 'The keyboard action or checkpoint contract changed; baseline review is required.');
  }
  if (current.status === 'failed') {
    return difference(current.action === null ? 'checkpoint' : 'run-failure', current.error || 'The current step failed.');
  }
  return undefined;
}

/** Compare the authored journey contract and outcomes, excluding explanatory evidence. */
export function compare(baseInput: JourneyResult, currentInput: JourneyResult): Comparison {
  const base = parseJourney(baseInput);
  const current = parseJourney(currentInput);
  if (base.status !== 'passed' || base.steps.some(step => step.status !== 'passed')) {
    throw new InvalidJourneyError('baseline: a successfully passed journey is required; review and record a passing baseline');
  }
  for (const field of ['journeyId', 'browserVersion', 'fixtureVersion', 'locale'] as const) {
    if (base[field] !== current[field]) return { status: 'incomparable', base, current, reason: `${field} differs between the baseline and current run.` };
  }
  if (base.viewport.width !== current.viewport.width || base.viewport.height !== current.viewport.height) {
    return { status: 'incomparable', base, current, reason: 'viewport differs between the baseline and current run.' };
  }
  for (let index = 0; index < Math.max(base.steps.length, current.steps.length); index++) {
    const firstDifference = change(index, base.steps[index], current.steps[index]);
    if (firstDifference) return { status: 'regressed', base, current, firstDifference };
  }
  if (current.status === 'failed') {
    return {
      status: 'regressed', base, current,
      firstDifference: { index: current.steps.length, kind: 'run-failure', reason: current.error || 'The current run failed after the recorded steps.' },
    };
  }
  return { status: 'unchanged', base, current };
}
