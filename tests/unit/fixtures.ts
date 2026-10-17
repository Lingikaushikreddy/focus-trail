import type { JourneyResult } from '../../packages/core/src/types.js';

export const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBqkAAAAASUVORK5CYII=';

export function passingJourney(): JourneyResult {
  return {
    schemaVersion: 1,
    journeyId: 'dialog-return-focus',
    browserVersion: '146.0.0.0',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    fixtureVersion: 'dialog-v1',
    appBuild: 'build-before',
    status: 'passed',
    steps: [
      { index: 0, action: 'Tab', observed: { tag: 'button', role: 'button', name: 'Open dialog', testId: 'launcher' }, elapsedMs: 3, status: 'passed' },
      { index: 1, action: null, checkpointId: 'launcher-focused', expectedTargetKey: 'launcher-focused', observed: { tag: 'button', role: 'button', name: 'Open dialog', testId: 'launcher' }, elapsedMs: 4, status: 'passed' },
      { index: 2, action: 'Escape', observed: { tag: 'button', role: 'button', name: 'Close', testId: 'close' }, elapsedMs: 5, status: 'passed' },
      { index: 3, action: null, checkpointId: 'return-focus', expectedTargetKey: 'return-focus', observed: { tag: 'button', role: 'button', name: 'Open dialog', testId: 'launcher' }, elapsedMs: 6, status: 'passed' },
    ],
  };
}
