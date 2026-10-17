import type { Locator, Page, TestInfo } from '@playwright/test';

export const SUPPORTED_KEYS = ['Tab', 'Shift+Tab', 'Enter', 'Space', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const;
export type SupportedKey = typeof SUPPORTED_KEYS[number];
export type RunStatus = 'passed' | 'failed';
export interface ObservedFocus {
  tag: string | null;
  role: string | null;
  name: string | null;
  testId: string | null;
  unavailable?: string;
}
export interface Step {
  index: number;
  action: SupportedKey | null;
  checkpointId?: string;
  expectedTargetKey?: string;
  observed: ObservedFocus;
  elapsedMs: number;
  status: RunStatus;
  error?: string;
  screenshot?: string;
}
export interface JourneyResult {
  schemaVersion: 1;
  journeyId: string;
  browserVersion: string;
  viewport: { width: number; height: number };
  locale: string;
  fixtureVersion: string;
  appBuild?: string;
  status: RunStatus;
  steps: Step[];
  error?: string;
}
export interface JourneyOptions {
  journeyId: string;
  fixtureVersion: string;
  appBuild?: string;
  checkpointTimeoutMs?: number;
  maxActions?: number;
  maxDurationMs?: number;
  masks?: string[];
}
export interface Journey {
  press(key: SupportedKey): Promise<void>;
  expectFocus(id: string, target: Locator): Promise<void>;
  finish(): Promise<JourneyResult>;
}
export interface Difference {
  index: number;
  checkpointId?: string;
  kind: 'checkpoint' | 'journey-change' | 'run-failure';
  reason: string;
}
export interface Comparison {
  status: 'unchanged' | 'regressed' | 'incomparable';
  base: JourneyResult;
  current: JourneyResult;
  firstDifference?: Difference;
  reason?: string;
}
export type JourneyFactory = (page: Page, testInfo: TestInfo, options: JourneyOptions) => Journey;
