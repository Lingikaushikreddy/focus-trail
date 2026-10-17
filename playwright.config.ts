import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 30000, expect: { timeout: 1000 }, retries: 0, workers: 2,
  outputDir: '../../work/focus-trail-test-results',
  reporter: [['list']],
  use: { browserName: 'chromium', channel: 'chromium', viewport: { width: 1280, height: 800 }, locale: 'en-US', trace: 'retain-on-failure' },
  projects: [
    { name: 'integration', testMatch: /integration\/.*\.spec\.ts/ },
    { name: 'e2e', testMatch: /e2e\/.*\.spec\.ts/ },
  ],
  webServer: { command: 'node examples/dialog/server.mjs', url: 'http://127.0.0.1:49371', reuseExistingServer: !process.env.CI },
});
