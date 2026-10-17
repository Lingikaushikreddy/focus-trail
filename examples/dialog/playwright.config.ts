import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', workers: 1, retries: 0, timeout: 30000, expect: { timeout: 500 },
  outputDir: process.env.FOCUS_TRAIL_TEST_OUTPUT ?? '../../../work/demo-tests',
  reporter: [['list'], ['../../dist/reporter.js', { baselineDir: 'evidence/demo/baselines', outputDir: process.env.FOCUS_TRAIL_REPORT_OUTPUT ?? 'evidence/demo/run' }]],
  use: { browserName: 'chromium', channel: 'chromium', viewport: { width: 1280, height: 800 }, locale: 'en-US' },
  webServer: { command: 'node server.mjs', url: 'http://127.0.0.1:49371', reuseExistingServer: !process.env.CI },
});
