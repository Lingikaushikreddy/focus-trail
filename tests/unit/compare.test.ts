import { describe, expect, it } from 'vitest';
import { compare, InvalidJourneyError, parseJourney } from '../../packages/core/src/compare.js';
import type { JourneyResult } from '../../packages/core/src/types.js';
import { passingJourney, tinyPng } from './fixtures.js';

type LooseJourney = Record<string, unknown> & { steps: Record<string, unknown>[] };
const input = () => structuredClone(passingJourney()) as unknown as LooseJourney;

describe('parseJourney', () => {
  it('accepts schema 1 objects and JSON text including safe optional image evidence', () => {
    const journey = passingJourney();
    journey.steps[1].screenshot = tinyPng;
    journey.steps[2].observed.unavailable = 'The page has closed';
    expect(parseJourney(journey)).toEqual(journey);
    expect(parseJourney(JSON.stringify(journey))).toEqual(journey);
  });

  it.each([null, [], 1, true, undefined, '{broken json', '[]', 'null'])('rejects a malformed root: %s', value => {
    expect(() => parseJourney(value)).toThrow(InvalidJourneyError);
  });

  it.each([undefined, 0, 2, '1'])('rejects unsupported schema version: %s', version => {
    const journey = input();
    journey.schemaVersion = version;
    expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
  });

  it.each(['journeyId', 'browserVersion', 'fixtureVersion', 'locale'])('requires nonempty %s', field => {
    for (const value of ['', '   ', null, 3, undefined]) {
      const journey = input();
      journey[field] = value;
      expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
    }
  });

  it.each([
    {}, { width: 0, height: 720 }, { width: 1280, height: -1 },
    { width: Number.NaN, height: 720 }, { width: 1280, height: Number.POSITIVE_INFINITY },
    { width: '1280', height: 720 },
  ])('rejects invalid viewport %j', viewport => {
    const journey = input();
    journey.viewport = viewport;
    expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
  });

  it('accepts a failed run with passed checkpoints after an external test failure', () => {
    const journey = passingJourney();
    journey.status = 'failed';
    journey.error = 'The application activation assertion failed';
    expect(parseJourney(journey).status).toBe('failed');
  });

  it.each([
    ['unknown run status', (j: LooseJourney) => { j.status = 'skipped'; }],
    ['unknown step status', (j: LooseJourney) => { j.steps[0].status = 'pending'; }],
    ['unsupported key', (j: LooseJourney) => { j.steps[0].action = 'F1'; }],
    ['missing action', (j: LooseJourney) => { delete j.steps[0].action; }],
    ['missing checkpoint ID', (j: LooseJourney) => { delete j.steps[1].checkpointId; }],
    ['missing expected target', (j: LooseJourney) => { delete j.steps[1].expectedTargetKey; }],
    ['empty expected target', (j: LooseJourney) => { j.steps[1].expectedTargetKey = ' '; }],
    ['action annotated as checkpoint', (j: LooseJourney) => { j.steps[0].checkpointId = 'extra'; }],
    ['action annotated with expected key', (j: LooseJourney) => { j.steps[0].expectedTargetKey = 'extra'; }],
    ['nonsequential index', (j: LooseJourney) => { j.steps[1].index = 9; }],
    ['fractional index', (j: LooseJourney) => { j.steps[0].index = 0.5; }],
    ['negative timing', (j: LooseJourney) => { j.steps[0].elapsedMs = -1; }],
    ['infinite timing', (j: LooseJourney) => { j.steps[0].elapsedMs = Number.POSITIVE_INFINITY; }],
    ['unbounded timing', (j: LooseJourney) => { j.steps[0].elapsedMs = 60_001; }],
    ['missing observed evidence', (j: LooseJourney) => { delete j.steps[0].observed; }],
    ['incomplete observed evidence', (j: LooseJourney) => { j.steps[0].observed = { name: 'only a name' }; }],
    ['nontext observed name', (j: LooseJourney) => { j.steps[0].observed = { tag: null, role: null, name: 4, testId: null }; }],
    ['nontext error', (j: LooseJourney) => { j.error = { detail: 'failure' }; }],
  ])('rejects %s', (_description, change) => {
    const journey = input();
    change(journey);
    expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
  });

  it('bounds the number of steps and the size of JSON input', () => {
    const journey = input();
    journey.steps = Array.from({ length: 101 }, (_, index) => ({ ...journey.steps[0], index }));
    expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
    expect(() => parseJourney(' '.repeat(10 * 1024 * 1024 + 1))).toThrow(InvalidJourneyError);
  });

  it('rejects sparse object-input steps instead of skipping their validation', () => {
    const journey = input();
    delete journey.steps[1];
    expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
  });

  it('bounds object-input size before retaining unknown metadata', () => {
    const journey = input();
    journey.extraMetadata = 'x'.repeat(10 * 1024 * 1024);
    expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
  });

  it('returns only schema fields so unknown cookies and values cannot leak into a report', () => {
    const journey = input();
    journey.cookies = 'session-secret';
    journey.steps[0].value = 'typed-password';
    journey.steps[0].observed = { tag: 'button', role: 'button', name: 'Open dialog', testId: 'launcher', html: '<input value="secret">' };
    const parsed = parseJourney(journey);
    expect(parsed).toEqual(passingJourney());
    expect(JSON.stringify(parsed)).not.toContain('session-secret');
    expect(JSON.stringify(parsed)).not.toContain('typed-password');
    journey.steps[0].status = 'failed';
    expect(parsed.steps[0].status).toBe('passed');
  });

  it('rejects cyclic and non-JSON object input with a domain error', () => {
    const journey = input();
    journey.cycle = journey;
    expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
    expect(() => parseJourney(new Date())).toThrow(InvalidJourneyError);
  });

  it.each([
    'https://example.test/screenshot.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'data:image/png;base64,not base64',
    'data:image/png;base64,aGVsbG8=',
    'data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024 * 4 / 3 + 8),
  ])('rejects unsafe or malformed image evidence', screenshot => {
    const journey = input();
    journey.steps[0].screenshot = screenshot;
    expect(() => parseJourney(journey)).toThrow(InvalidJourneyError);
  });
});

describe('compare', () => {
  it('returns unchanged for a passing, identical journey', () => {
    const result = compare(passingJourney(), passingJourney());
    expect(result.status).toBe('unchanged');
    expect(result.firstDifference).toBeUndefined();
  });

  it.each([
    ['timing', (j: JourneyResult) => { j.steps.forEach(step => { step.elapsedMs += 100; }); }],
    ['screenshots', (j: JourneyResult) => { j.steps[1].screenshot = tinyPng; }],
    ['observed tag', (j: JourneyResult) => { j.steps[1].observed.tag = 'input'; }],
    ['observed name', (j: JourneyResult) => { j.steps[1].observed.name = 'Translated launcher'; }],
    ['observed role', (j: JourneyResult) => { j.steps[1].observed.role = 'link'; }],
    ['observed testId', (j: JourneyResult) => { j.steps[1].observed.testId = 'new-internal-id'; }],
    ['unavailable metadata', (j: JourneyResult) => { j.steps[1].observed.unavailable = 'redacted'; }],
    ['application build', (j: JourneyResult) => { j.appBuild = 'build-after'; }],
  ])('ignores benign %s changes in either direction', (_description, change) => {
    const base = passingJourney();
    const current = passingJourney();
    change(current);
    expect(compare(base, current).status).toBe('unchanged');
    expect(compare(current, base).status).toBe('unchanged');
  });

  it.each(['journeyId', 'browserVersion', 'fixtureVersion', 'locale'] as const)('marks different %s incomparable', field => {
    const current = passingJourney();
    current[field] += '-different';
    const result = compare(passingJourney(), current);
    expect(result.status).toBe('incomparable');
    expect(result.reason).toContain(field);
  });

  it.each(['width', 'height'] as const)('marks different viewport %s incomparable', dimension => {
    const current = passingJourney();
    current.viewport[dimension] += 1;
    expect(compare(passingJourney(), current).status).toBe('incomparable');
  });

  it.each([
    ['failed run', (j: JourneyResult) => { j.status = 'failed'; j.error = 'Baseline failure'; }],
    ['failed checkpoint', (j: JourneyResult) => { j.steps[1].status = 'failed'; j.steps[1].error = 'Baseline checkpoint failure'; }],
    ['failed action', (j: JourneyResult) => { j.steps[0].status = 'failed'; j.steps[0].error = 'Baseline action failure'; }],
  ])('rejects a baseline containing a %s', (_description, fail) => {
    const base = passingJourney();
    fail(base);
    expect(() => compare(base, passingJourney())).toThrow(InvalidJourneyError);
    expect(() => compare(base, base)).toThrow(InvalidJourneyError);
  });

  it('reports the first checkpoint failure before later failures', () => {
    const current = passingJourney();
    current.status = 'failed';
    current.steps[1].status = 'failed';
    current.steps[1].error = 'Launcher did not receive focus';
    current.steps[3].status = 'failed';
    const result = compare(passingJourney(), current);
    expect(result.status).toBe('regressed');
    expect(result.firstDifference).toMatchObject({ index: 1, checkpointId: 'launcher-focused', kind: 'checkpoint' });
  });

  it('reports a failed action at its actual position', () => {
    const current = passingJourney();
    current.status = 'failed';
    current.steps[0].status = 'failed';
    current.steps[0].error = 'Page was closed';
    const result = compare(passingJourney(), current);
    expect(result.status).toBe('regressed');
    expect(result.firstDifference).toMatchObject({ index: 0, kind: 'run-failure' });
  });

  it('never returns green for a failed checkpoint even when root status says passed', () => {
    const current = passingJourney();
    current.steps[1].status = 'failed';
    expect(compare(passingJourney(), current)).toMatchObject({
      status: 'regressed', firstDifference: { index: 1, kind: 'checkpoint' },
    });
  });

  it('never returns green after run failure when all checkpoint statuses pass', () => {
    const current = passingJourney();
    current.status = 'failed';
    current.error = 'Activation state assertion failed after the journey';
    const result = compare(passingJourney(), current);
    expect(result.status).toBe('regressed');
    expect(result.firstDifference).toMatchObject({ index: 4, kind: 'run-failure' });
    expect(result.firstDifference?.reason).toContain('Activation state assertion failed');
  });

  it.each([
    ['changed action', (j: JourneyResult) => { j.steps[0].action = 'Enter'; }, 0],
    ['changed checkpoint ID', (j: JourneyResult) => { j.steps[1].checkpointId = 'changed-checkpoint'; }, 1],
    ['changed expected target key', (j: JourneyResult) => { j.steps[1].expectedTargetKey = 'changed-key'; }, 1],
    ['missing action', (j: JourneyResult) => { j.steps.splice(2, 1); }, 2],
    ['missing first action', (j: JourneyResult) => { j.steps.splice(0, 1); }, 0],
    ['missing middle checkpoint', (j: JourneyResult) => { j.steps.splice(1, 1); }, 1],
    ['missing checkpoint', (j: JourneyResult) => { j.steps.splice(3, 1); }, 3],
    ['extra action', (j: JourneyResult) => { j.steps.push({ ...j.steps[0], index: 4 }); }, 4],
    ['extra checkpoint', (j: JourneyResult) => { j.steps.push({ ...j.steps[3], index: 4, checkpointId: 'extra', expectedTargetKey: 'extra' }); }, 4],
    ['inserted action', (j: JourneyResult) => { j.steps.splice(1, 0, { ...j.steps[0] }); }, 1],
    ['inserted checkpoint', (j: JourneyResult) => { j.steps.splice(2, 0, { ...j.steps[1], checkpointId: 'extra', expectedTargetKey: 'extra' }); }, 2],
  ] as const)('requires baseline review for %s', (_description, change, index) => {
    const current = passingJourney();
    change(current);
    current.steps.forEach((step, i) => { step.index = i; });
    const result = compare(passingJourney(), current);
    expect(result.status).toBe('regressed');
    expect(result.firstDifference).toMatchObject({ index, kind: 'journey-change' });
    expect(result.firstDifference?.reason).toMatch(/baseline.*review|review.*baseline/i);
  });

  it('reports the earliest meaningful difference instead of a later removed checkpoint', () => {
    const current = passingJourney();
    current.status = 'failed';
    current.steps[1].status = 'failed';
    current.steps.pop();
    expect(compare(passingJourney(), current).firstDifference).toMatchObject({ index: 1, kind: 'checkpoint' });
  });

  it('validates typed inputs at runtime', () => {
    const current = passingJourney();
    current.schemaVersion = 2 as 1;
    expect(() => compare(passingJourney(), current)).toThrow(InvalidJourneyError);
  });
});
