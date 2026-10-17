import { defineConfig } from 'tsup';
export default defineConfig({
  entry: { index: 'packages/core/src/index.ts', reporter: 'packages/reporter/src/index.ts', cli: 'packages/cli/src/index.ts' },
  format: ['esm'], target: 'node24', dts: true, sourcemap: true, clean: true,
  external: ['@playwright/test', '@playwright/test/reporter'],
});
